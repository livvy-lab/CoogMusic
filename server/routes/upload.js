// server/routes/upload.js
import path from "path";
import fs from "fs";
import { stat } from "fs/promises";
import { createHash, randomUUID } from "crypto";
import db from "../db.js";
// If your stable parser is files.diag.js, swap the import to that file:
import { parseMultipart } from "../utils/files.js";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAudioDurationInSeconds } from "get-audio-duration";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
const BUCKET = process.env.AWS_BUCKET_NAME;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
}
function ok(res, code, data) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:5173"
  });
  res.end(JSON.stringify(data));
}
function bad(res, code, msg) {
  console.log("UPLOAD ERROR:", msg);
  ok(res, code, { error: msg });
}
function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function sha256File(filePath) {
  const h = createHash("sha256");
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .on("data", c => h.update(c))
      .on("end", resolve)
      .on("error", reject);
  });
  return h.digest("hex");
}

async function putToS3(key, filepath, mime) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fs.createReadStream(filepath),
      ContentType: mime || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable"
    })
  );
  const canonical = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );
  return { canonical, url };
}

export async function handleUploadRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  cors(res);
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (!pathname.startsWith("/upload/")) return;

  try {
    if (method === "POST" && pathname === "/upload/ad") {
      if (!BUCKET || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID) {
        return bad(res, 500, "s3_not_configured");
      }

      // Accept common ad types (image/audio/video). Field name: adFile
      let fields, files;
      try {
        ({ fields, files } = await parseMultipart(req, {
          allowed: [
            "image/*",
            "audio/*",
            "video/*",
            "application/pdf"
          ]
        }));
      } catch (e) {
        if (String(e.code) === "UNSUPPORTED_MIME")
          return bad(res, 415, e.message || "unsupported_mime");
        if (String(e.code) === "TEMPFILE_MISSING")
          return bad(res, 400, "adfile_tempfile_missing");
        return bad(res, 400, e.message || "multipart_parse_error");
      }

  const raw = files?.audio || null;
      const up = raw && {
        filepath: raw.filepath || null,
        originalFilename: raw.originalFilename || "",
        mimetype: raw.mimetype || "application/octet-stream"
      };
      if (!up) return bad(res, 400, "adFile_field_missing");
      if (!up.filepath) return bad(res, 400, "adfile_tempfile_missing");

      // Optional metadata and S3 key naming
      const title = String(fields.adTitle || fields.title || "").trim();
      const ext = path.extname(up.originalFilename || "");
      const origBase = path.basename(up.originalFilename || "ad", ext);
      const slugTitle = slug(title);
      const base = slugTitle || (slug(origBase) || "ad");

      // If Ad Title provided, prefer exact name images/ads/<slugTitle><ext>.
      // Otherwise, fall back to unique key with uuid.
      let key = slugTitle ? `images/ads/${base}${ext}` : `images/ads/${base}_${randomUUID()}${ext}`;

      // Avoid unintentional overwrite when title-based name already exists.
      if (slugTitle) {
        try {
          await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
          // If exists, append timestamp suffix
          key = `images/ads/${base}-${Date.now()}${ext}`;
        } catch (e) {
          // NotFound => safe to use original key; ignore other errors
        }
      }

      let put;
      try {
        put = await putToS3(key, up.filepath, up.mimetype);
  // Log where the file was uploaded for troubleshooting
        console.log("S3 upload success:", { bucket: BUCKET, key, title, mime: up.mimetype });
      } catch (awsErr) {
        return ok(res, 500, {
          error: awsErr.message || "s3_put_error",
          name: awsErr.name || null,
          code: awsErr.code || null
        });
      }

      // Persist to Advertisement table: AdName, AdFile (canonical), IsDeleted=0
      let adId = null;
      try {
        const adName = title || path.basename(key);
        const [ins] = await db.query(
          "INSERT INTO Advertisement (AdName, AdFile, IsDeleted) VALUES (?, ?, 0)",
          [adName, put.canonical]
        );
        adId = ins.insertId ?? null;
      } catch (dbErr) {
        console.error("DB insert Advertisement failed:", dbErr?.message || dbErr);
        // Continue to return upload success even if DB insert fails, but include error
        return ok(res, 201, {
          canonical: put.canonical,
          url: put.url,
          s3: { bucket: BUCKET, key },
          title: title || null,
          mime: up.mimetype,
          db: { error: dbErr?.message || "insert_failed" }
        });
      }

      return ok(res, 201, {
        adId,
        canonical: put.canonical,
        url: put.url,
        s3: { bucket: BUCKET, key },
        title: title || null,
        mime: up.mimetype
      });
    }

    if (method === "POST" && pathname === "/upload/song") {
      if (!BUCKET || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID) {
        return bad(res, 500, "s3_not_configured");
      }

      // 1) Parse multipart (accept audio/*)
      let fields, files;
      try {
        ({ fields, files } = await parseMultipart(req, { allowed: ["audio/*"] }));
      } catch (e) {
        if (String(e.code) === "UNSUPPORTED_MIME")
          return bad(res, 415, e.message || "unsupported_mime");
        if (String(e.code) === "TEMPFILE_MISSING")
          return bad(res, 400, "audio_tempfile_missing");
        return bad(res, 400, e.message || "multipart_parse_error");
      }

      const raw = files?.audio || null;
      const aud = raw && {
        filepath: raw.filepath || null,
        originalFilename: raw.originalFilename || "",
        mimetype: raw.mimetype || "application/octet-stream"
      };
      if (!aud) return bad(res, 400, "audio_field_missing");
      if (!aud.filepath) return bad(res, 400, "audio_tempfile_missing");

      // 2) Validate fields
      const title = String(fields.title || "").trim();
      const artistId = Number(fields.artistId);
      const albumId = fields.albumId ? Number(fields.albumId) : null;
      const genreId = fields.genreId ? Number(fields.genreId) : null;
      const trackNumber = fields.trackNumber ? Number(fields.trackNumber) : null;

      if (!title) return bad(res, 400, "title_required");
      if (!Number.isFinite(artistId) || artistId <= 0)
        return bad(res, 400, "artistId_required");

      // 3) Hash + de-dupe media
      const { size } = await stat(aud.filepath);
      const sha = await sha256File(aud.filepath);

      const [mrows] = await db.query(
        "SELECT MediaID, bucket, s3_key, url, mime, size_bytes FROM Media WHERE sha256=? AND size_bytes=? LIMIT 1",
        [sha, size]
      );
      const existing = mrows[0];

      let mediaId, canonical, signedUrl, s3key, mimeStored;

      if (existing) {
        mediaId = existing.MediaID;
        canonical = existing.url;
        mimeStored = existing.mime;
        s3key = existing.s3_key;
        signedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: existing.bucket, Key: existing.s3_key }),
          { expiresIn: 3600 }
        );
      } else {
        // S3 path under "song/<artistId>/..."
        const ext = path.extname(aud.originalFilename || "");
        const base = slug(path.basename(aud.originalFilename || "audio", ext)) || "audio";
        s3key = `song/${artistId}/${base}_${randomUUID()}${ext}`;

        let put;
        try {
          put = await putToS3(s3key, aud.filepath, aud.mimetype);
        } catch (awsErr) {
          return ok(res, 500, {
            error: awsErr.message || "s3_put_error",
            name: awsErr.name || null,
            code: awsErr.code || null
          });
        }
        canonical = put.canonical;
        signedUrl = put.url;
        mimeStored = aud.mimetype;

        const [ins] = await db.query(
          "INSERT INTO Media (storage_provider, bucket, s3_key, url, mime, size_bytes, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
          ["aws-s3", BUCKET, s3key, canonical, mimeStored, size, sha]
        );
        mediaId = ins.insertId;
      }

      // 4) DurationSeconds (read from uploaded file; default to 0)
      let durationSeconds = 0;
      try {
        const dur = await getAudioDurationInSeconds(aud.filepath);
        durationSeconds = Math.max(0, Math.round(dur || 0));
      } catch (durErr) {
        console.warn("Could not read duration:", durErr?.message || durErr);
      }

      // 5) Insert Song (ReleaseDate = NOW(), DurationSeconds = computed)
      const cols = [
        "Title",
        "audio_media_id",
        "IsDeleted",
        "ReleaseDate",
        "DurationSeconds"
      ];
      const vals = [title, mediaId, 0];
      let placeholders = "?, ?, ?, NOW(), ?";

      if (genreId !== null && Number.isFinite(genreId)) {
        cols.splice(1, 0, "GenreID");
        vals.splice(1, 0, genreId);
        placeholders = "?, ?, ?, ?, NOW(), ?";
      }

      vals.push(durationSeconds);

      const sql = `INSERT INTO Song (${cols.join(", ")}) VALUES (${placeholders})`;
      const [songIns] = await db.query(sql, vals);
      const songId = songIns.insertId;

      // 6) Relations (Song_Artist, Album_Track)
      try {
        await db.query("INSERT INTO Song_Artist (SongID, ArtistID) VALUES (?, ?)", [
          songId,
          artistId
        ]);
      } catch {}

      if (albumId && trackNumber !== null && Number.isFinite(trackNumber)) {
        try {
          await db.query(
            "INSERT INTO Album_Track (AlbumID, SongID, TrackNumber) VALUES (?, ?, ?)",
            [albumId, songId, trackNumber]
          );
        } catch {}
      }

      // 7) Response
      return ok(res, 201, {
        songId,
        mediaId,
        url: signedUrl,
        canonical,
        s3: { bucket: BUCKET, key: s3key },
        sha256: sha,
        size_bytes: Number(size),
        mime: mimeStored,
        durationSeconds
      });
    }

    return bad(res, 404, "not_found");
  } catch (e) {
    return ok(res, 500, {
      error: e.message || "server_error",
      code: e.code || null,
      sqlMessage: e.sqlMessage || null,
      sql: e.sql || null,
      name: e.name || null
    });
  }
}

