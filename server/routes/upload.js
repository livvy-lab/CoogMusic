import path from "path";
import fs from "fs";
import { stat } from "fs/promises";
import { createHash, randomUUID } from "crypto";
import db from "../db.js";
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

// Ad pricing tiers
const AD_PRICE_TIERS = {
  'audio': 5.00,
  'banner': 2.50
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
}

function ok(res, code, data) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
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

      // Extract and validate artistId
      let artistId = null;
      try {
        artistId = Number(fields.artistId ?? fields.artistID ?? fields.ArtistID);
        
        if (!Number.isFinite(artistId) || artistId <= 0) {
          return bad(res, 401, "missing_or_invalid_artistId");
        }

        // Verify artist exists
        const [artistRows] = await db.query(
          "SELECT ArtistID FROM Artist WHERE ArtistID = ? AND IsDeleted = 0 LIMIT 1",
          [artistId]
        );
        
        if (!artistRows || artistRows.length === 0) {
          return bad(res, 404, "artist_not_found");
        }

      } catch (authErr) {
        return bad(res, 500, authErr.message || "auth_check_failed");
      }

      // Get the uploaded file
      const raw = (files?.adFile || files?.file || files?.upload || Object.values(files || {})[0] || null);
      const up = raw && {
        filepath: raw.filepath || null,
        originalFilename: raw.originalFilename || "",
        mimetype: raw.mimetype || "application/octet-stream"
      };
      
      if (!up) return bad(res, 400, "adFile_field_missing");
      if (!up.filepath) return bad(res, 400, "adfile_tempfile_missing");

      // Get ad type and title
      const adType = String(fields.adType || "banner").toLowerCase();
      const title = String(fields.adTitle || fields.title || "").trim();

      if (!title) {
        return bad(res, 400, "ad_title_required");
      }

      // Validate file type based on adType
      if (adType === "banner") {
        if (!up.mimetype.startsWith("image/")) {
          return bad(res, 400, "banner_ad_must_be_image");
        }
        const { size } = await stat(up.filepath);
        if (size > 5 * 1024 * 1024) {
          return bad(res, 400, "image_file_too_large_max_5mb");
        }
      } else if (adType === "audio") {
        if (!up.mimetype.startsWith("audio/")) {
          return bad(res, 400, "audio_ad_must_be_audio_file");
        }
        const { size } = await stat(up.filepath);
        if (size > 10 * 1024 * 1024) {
          return bad(res, 400, "audio_file_too_large_max_10mb");
        }
      } else {
        return bad(res, 400, "invalid_ad_type_must_be_banner_or_audio");
      }

      // Generate S3 key based on ad type
      const ext = path.extname(up.originalFilename || "");
      const origBase = path.basename(up.originalFilename || "ad", ext);
      const slugTitle = slug(title);
      const base = slugTitle || (slug(origBase) || "ad");
      const folderName = adType === "audio" ? "ads-audio" : "ads-banner";
      
      let key = `${folderName}/${artistId}/${base}-${Date.now()}-${randomUUID().substring(0, 8)}${ext}`;

      // Upload to S3
      let put;
      try {
        put = await putToS3(key, up.filepath, up.mimetype);
        console.log("S3 upload success:", { 
          bucket: BUCKET, 
          key, 
          title, 
          adType,
          mime: up.mimetype 
        });
      } catch (awsErr) {
        return ok(res, 500, {
          error: awsErr.message || "s3_put_error",
          name: awsErr.name || null,
          code: awsErr.code || null
        });
      }

      // Get ad price
      const adPrice = AD_PRICE_TIERS[adType] || 5.00;
      let adId = null;

      try {
        const adName = title;

        // Insert ad with price
        const [ins] = await db.query(
          "INSERT INTO Advertisement (AdName, AdFile, AdType, AdPrice, ArtistID, IsDeleted, CreatedAt) VALUES (?, ?, ?, ?, ?, 0, NOW())",
          [adName, put.canonical, adType, adPrice, artistId]
        );
        adId = ins.insertId ?? null;

        // Log transaction (optional)
        try {
          await db.query(
            "INSERT INTO Transaction (ArtistID, Type, Amount, Description, RelatedAdID, CreatedAt, Status) VALUES (?, 'AD_PURCHASE', ?, ?, ?, NOW(), 'completed')",
            [artistId, -adPrice, `Ad upload: ${adType} - ${adName}`, adId]
          );
        } catch (txErr) {
          console.warn("Failed to log transaction:", txErr);
        }

      } catch (dbErr) {
        console.error("DB insert Advertisement failed:", dbErr?.message || dbErr);
        return ok(res, 201, {
          canonical: put.canonical,
          url: put.url,
          s3: { bucket: BUCKET, key },
          title: title || null,
          adType: adType,
          mime: up.mimetype,
          db: { error: dbErr?.message || "insert_failed" }
        });
      }

      return ok(res, 201, {
        success: true,
        adId,
        adName: title,
        adType: adType,
        adPrice: adPrice,
        canonical: put.canonical,
        url: put.url,
        s3: { bucket: BUCKET, key },
        mime: up.mimetype,
        message: `Ad created successfully.`
      });
    }

    if (method === "POST" && pathname === "/upload/album") {
      let fields, files;
      try {
        ({ fields, files } = await parseMultipart(req, { allowed: ["*/*"] }));
      } catch (e) {
        return bad(res, 400, e.message || "multipart_parse_error");
      }

      const title = String(fields.title || "").trim();
      const artistId = Number(fields.artistId);
      const releaseDate = fields.releaseDate || null;
      const description = String(fields.description || "").trim();

      let genres = [];
      try {
        if (fields.genres) {
          genres = JSON.parse(fields.genres);
          if (!Array.isArray(genres)) genres = [];
        }
      } catch {
        genres = [];
      }

      if (!title) return bad(res, 400, "title_required");
      if (!Number.isFinite(artistId) || artistId <= 0)
        return bad(res, 400, "artistId_required");

      const [albumIns] = await db.query(
        "INSERT INTO Album (Title, ReleaseDate, Description, IsDeleted) VALUES (?, ?, ?, 0)",
        [title, releaseDate, description]
      );
      const albumId = albumIns.insertId;

      try {
        await db.query(
          "INSERT INTO Album_Artist (AlbumID, ArtistID) VALUES (?, ?)",
          [albumId, artistId]
        );
      } catch (err) {
        console.warn("Failed to link artist to album:", err?.message);
      }

      if (genres.length > 0) {
        for (const genreId of genres) {
          if (Number.isFinite(genreId) && genreId > 0) {
            try {
              await db.query(
                "INSERT INTO Album_Genre (AlbumID, GenreID) VALUES (?, ?)",
                [albumId, genreId]
              );
            } catch (err) {
              console.warn(`Failed to link genre ${genreId} to album:`, err?.message);
            }
          }
        }
      }

      return ok(res, 201, {
        albumId,
        title,
        artistId,
        releaseDate,
        genres
      });
    }

    if (method === "POST" && pathname === "/upload/song") {
      if (!BUCKET || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID) {
        return bad(res, 500, "s3_not_configured");
      }

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

      const title = String(fields.title || "").trim();
      const artistId = Number(fields.artistId);
      const albumId = fields.albumId ? Number(fields.albumId) : null;
      const genreId = fields.genreId ? Number(fields.genreId) : null;
      const trackNumber = fields.trackNumber ? Number(fields.trackNumber) : null;
      const coverMediaId = fields.coverMediaId ? Number(fields.coverMediaId) : null;

      let genres = [];
      try {
        if (fields.genres) {
          genres = JSON.parse(fields.genres);
          if (!Array.isArray(genres)) genres = [];
        }
      } catch {
        genres = [];
      }

      if (!title) return bad(res, 400, "title_required");
      if (!Number.isFinite(artistId) || artistId <= 0)
        return bad(res, 400, "artistId_required");

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

      let durationSeconds = 0;
      try {
        const dur = await getAudioDurationInSeconds(aud.filepath);
        durationSeconds = Math.max(0, Math.round(dur || 0));
      } catch (durErr) {
        console.warn("Could not read duration:", durErr?.message || durErr);
      }

      const cols = [
        "Title",
        "audio_media_id",
        "cover_media_id",
        "IsDeleted",
        "ReleaseDate",
        "DurationSeconds"
      ];
      const vals = [title, mediaId, coverMediaId || null, 0];
      let placeholders = "?, ?, ?, ?, NOW(), ?";

      if (genreId !== null && Number.isFinite(genreId)) {
        cols.splice(1, 0, "GenreID");
        vals.splice(1, 0, genreId);
        placeholders = "?, ?, ?, ?, ?, NOW(), ?";
      }

      vals.push(durationSeconds);

      const sql = `INSERT INTO Song (${cols.join(", ")}) VALUES (${placeholders})`;
      const [songIns] = await db.query(sql, vals);
      const songId = songIns.insertId;

      try {
        await db.query("INSERT INTO Song_Artist (SongID, ArtistID) VALUES (?, ?)", [
          songId,
          artistId
        ]);
      } catch {}

      if (genres.length > 0) {
        for (const genreIdFromArray of genres) {
          if (Number.isFinite(genreIdFromArray) && genreIdFromArray > 0) {
            try {
              await db.query(
                "INSERT INTO Song_Genre (SongID, GenreID) VALUES (?, ?)",
                [songId, genreIdFromArray]
              );
            } catch (err) {
              console.warn(`Failed to link genre ${genreIdFromArray} to song:`, err?.message);
            }
          }
        }
      }

      if (albumId && trackNumber !== null && Number.isFinite(trackNumber)) {
        try {
          await db.query(
            "INSERT INTO Album_Track (AlbumID, SongID, TrackNumber) VALUES (?, ?, ?)",
            [albumId, songId, trackNumber]
          );
        } catch {}
      }

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

    if (method === "POST" && pathname === "/upload/image") {
      if (!BUCKET || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID) {
        return bad(res, 500, "s3_not_configured");
      }

      let fields, files;
      try {
        ({ fields, files } = await parseMultipart(req, { allowed: ["image/*"] }));
      } catch (e) {
        if (String(e.code) === "UNSUPPORTED_MIME")
          return bad(res, 415, e.message || "unsupported_mime");
        return bad(res, 400, e.message || "multipart_parse_error");
      }

      const raw = files?.image || files?.cover || null;
      const img = raw && {
        filepath: raw.filepath || null,
        originalFilename: raw.originalFilename || "",
        mimetype: raw.mimetype || "application/octet-stream"
      };
      if (!img) return bad(res, 400, "image_field_missing");
      if (!img.filepath) return bad(res, 400, "image_tempfile_missing");

      const artistId = Number(fields.artistId) || "unknown";

      const { size } = await stat(img.filepath);
      const sha = await sha256File(img.filepath);

      const [mrows] = await db.query(
        "SELECT MediaID FROM Media WHERE sha256=? AND size_bytes=? LIMIT 1",
        [sha, size]
      );
      const existing = mrows[0];

      let mediaId;

      if (existing) {
        mediaId = existing.MediaID;
      } else {
        const ext = path.extname(img.originalFilename || "");
        const base = slug(path.basename(img.originalFilename || "image", ext)) || "image";
        const s3key = `image/cover/${artistId}/${base}_${randomUUID()}${ext}`;

        let put;
        try {
          put = await putToS3(s3key, img.filepath, img.mimetype);
        } catch (awsErr) {
          return ok(res, 500, { error: awsErr.message || "s3_put_error" });
        }
        const canonical = put.canonical;
        const mimeStored = img.mimetype;

        const [ins] = await db.query(
          "INSERT INTO Media (storage_provider, bucket, s3_key, url, mime, size_bytes, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
          ["aws-s3", BUCKET, s3key, canonical, mimeStored, size, sha]
        );
        mediaId = ins.insertId;
      }

      return ok(res, 201, {
        mediaId,
        sha256: sha,
        size_bytes: Number(size)
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

export async function handleLocalUpload(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  try {
    if (method === "POST" && pathname === "/upload/album") {
      const { fields, files } = await parseMultipart(req, {
        destDir: "uploads/images",
        allowed: ["image/png", "image/jpeg", "image/webp"]
      });
      const title = fields.title?.trim();
      const artistId = Number(fields.artistId);
      const releaseDate = fields.releaseDate || null;
      const coverRel = files.cover ? `/uploads/images/${files.cover.filename}` : null;

      if (!title || !artistId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "title and artistId required" }));
        return;
      }

      const [result] = await db.query(
        "INSERT INTO Album (Title, ArtistID, ReleaseDate, CoverImagePath) VALUES (?, ?, ?, ?)",
        [title, artistId, releaseDate, coverRel]
      );
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ albumId: result.insertId, coverImagePath: coverRel }));
      return;
    }

    if (method === "POST" && pathname === "/upload/song") {
      const { fields, files } = await parseMultipart(req, {
        destDir: "uploads/audio",
        allowed: [
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/x-wav",
          "audio/flac",
          "audio/aac",
          "audio/ogg"
        ]
      });
      const title = fields.title?.trim();
      const artistId = Number(fields.artistId);
      const albumId = fields.albumId ? Number(fields.albumId) : null;
      const genreId = fields.genreId ? Number(fields.genreId) : null;
      const explicit = fields.explicit ? Number(fields.explicit) : 0;
      const coverMediaId = fields.coverMediaId ? Number(fields.coverMediaId) : null;
      const audioRel = files.audio ? `/uploads/audio/${files.audio.filename}` : null;

      if (!title || !artistId || !audioRel) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "title, artistId, and audio file required" }));
        return;
      }

      const [songResult] = await db.query(
        "INSERT INTO Song (Title, ArtistID, GenreID, Explicit, AudioPath, cover_media_id) VALUES (?, ?, ?, ?, ?, ?)",
        [title, artistId, genreId, explicit, audioRel, coverMediaId || null]
      );

      const songId = songResult.insertId;
      if (albumId) {
        await db.query(
          "INSERT INTO Album_Track (AlbumID, SongID, TrackNumber) VALUES (?, ?, ?)",
          [albumId, songId, fields.trackNumber ? Number(fields.trackNumber) : null]
        );
      }

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ songId, audioPath: audioRel }));
      return;
    }
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
}
