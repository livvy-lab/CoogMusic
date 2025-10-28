import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import path from "path";
import db from "../db.js";
import { parseMultipart } from "../utils/files.js";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
const BUCKET = process.env.AWS_BUCKET_NAME;

function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function handleMediaRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    // POST /media (upload image) - supports both S3 and local paths
    if (pathname === "/media" && method === "POST") {
      if (!BUCKET || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID) {
        // Fall back to local storage if S3 not configured
        const { fields, files } = await parseMultipart(req, {
          destDir: "uploads/images",
          allowed: ["image/png", "image/jpeg", "image/webp"]
        });
        
        const image = files.image || files.file || files.upload;
        if (!image?.filepath) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "No image file provided" }));
          return;
        }

        // Store local path in Media table
        const relPath = `/uploads/images/${path.basename(image.filepath)}`;
        const [result] = await db.query(
          "INSERT INTO Media (storage_provider, url, mime, created_at) VALUES (?, ?, ?, NOW())",
          ["local", relPath, image.mimetype]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          mediaId: result.insertId,
          url: relPath,
          mime: image.mimetype
        }));
        return;
      }

      // S3 storage (preferred when configured)
      const { fields, files } = await parseMultipart(req, {
        allowed: ["image/png", "image/jpeg", "image/webp"]
      });

      const image = files.image || files.file || files.upload;
      if (!image?.filepath) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No image file provided" }));
        return;
      }

      // Upload to S3
      const ext = path.extname(image.originalFilename || "");
      const base = slug(path.basename(image.originalFilename || "image", ext)) || "image";
      const s3key = `images/${base}_${randomUUID()}${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: s3key,
          Body: fs.createReadStream(image.filepath),
          ContentType: image.mimetype,
          CacheControl: "public, max-age=31536000, immutable"
        })
      );

      const canonical = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3key}`;
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: s3key }),
        { expiresIn: 3600 }
      );

      // Store S3 details in Media table
      const [result] = await db.query(
        "INSERT INTO Media (storage_provider, bucket, s3_key, url, mime, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        ["aws-s3", BUCKET, s3key, canonical, image.mimetype]
      );

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        mediaId: result.insertId,
        url,
        canonical,
        mime: image.mimetype,
        s3: { bucket: BUCKET, key: s3key }
      }));
      return;
    }

    // PUT /songs/:id/cover (associate cover with song)
    if (/^\/songs\/\d+\/cover$/.test(pathname) && method === "PUT") {
      const songId = Number(pathname.split("/")[2]);
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const { mediaId } = JSON.parse(body);
          if (!mediaId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "mediaId required" }));
            return;
          }

          // Verify song exists
          const [songs] = await db.query(
            "SELECT 1 FROM Song WHERE SongID = ? AND IsDeleted = 0",
            [songId]
          );
          if (!songs.length) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Song not found" }));
            return;
          }

          // Verify media exists
          const [media] = await db.query(
            "SELECT MediaID, url FROM Media WHERE MediaID = ?",
            [mediaId]
          );
          if (!media.length) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Media not found" }));
            return;
          }

          // Update song's cover_media_id
          await db.query(
            "UPDATE Song SET cover_media_id = ? WHERE SongID = ?",
            [mediaId, songId]
          );

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            songId,
            mediaId,
            url: media[0].url
          }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // PUT /albums/:id/cover (associate cover with album)
    if (/^\/albums\/\d+\/cover$/.test(pathname) && method === "PUT") {
      const albumId = Number(pathname.split("/")[2]);
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const { mediaId } = JSON.parse(body);
          if (!mediaId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "mediaId required" }));
            return;
          }

          // Verify album exists
          const [albums] = await db.query(
            "SELECT 1 FROM Album WHERE AlbumID = ? AND IsDeleted = 0",
            [albumId]
          );
          if (!albums.length) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Album not found" }));
            return;
          }

          // Verify media exists
          const [media] = await db.query(
            "SELECT MediaID, url FROM Media WHERE MediaID = ?",
            [mediaId]
          );
          if (!media.length) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Media not found" }));
            return;
          }

          // Update album's cover_media_id
          await db.query(
            "UPDATE Album SET cover_media_id = ? WHERE AlbumID = ?",
            [mediaId, albumId]
          );

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            albumId,
            mediaId,
            url: media[0].url
          }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: e.message || "server_error",
      code: e.code || null,
      sqlMessage: e.sqlMessage || null,
      sql: e.sql || null,
      name: e.name || null
    }));
  }
}