import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import db from "../db.js";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function json(res, code, obj) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(obj));
}

export function handleSetListenerAvatar(req, res, listenerId) {
  // CORS / preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const form = new IncomingForm({ keepExtensions: true, multiples: false });

  form.parse(req, async (err, fields, files) => {
    try {
  res.setHeader("Access-Control-Allow-Origin", "*");
      if (err) throw new Error("invalid_multipart");

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) throw new Error("file_missing");

      const ext = path.extname(file.originalFilename || "").toLowerCase();
      const Bucket = process.env.AWS_BUCKET_NAME;
      const Key = `images/listeners/${listenerId}/avatar_${randomUUID()}${ext}`;

      // ⛔️ NO ACL. Bucket owner enforced disables ACLs.
      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key,
          Body: fs.createReadStream(file.filepath),
          ContentType: file.mimetype || "application/octet-stream",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      // Save a CANONICAL, non-signed URL so Media.url is NOT NULL
      const canonicalUrl = `https://${Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;

      const [mediaIns] = await db.query(
        `INSERT INTO Media (storage_provider, bucket, s3_key, url, mime, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ["aws-s3", Bucket, Key, canonicalUrl, file.mimetype || null, file.size || null]
      );
      const mediaId = mediaIns.insertId;

      await db.query(
        "UPDATE Listener SET image_media_id = ? WHERE ListenerID = ?",
        [mediaId, listenerId]
      );

      // Signed URL for immediate use by the client
      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket, Key }),
        { expiresIn: 3600 } // 1 hour
      );

      json(res, 200, { mediaId, url: signedUrl, bucket: Bucket, key: Key });
    } catch (e) {
      console.error("[avatar] upload error:", e);
      json(res, 400, { error: e.message || "upload_failed" });
    }
  });
}
