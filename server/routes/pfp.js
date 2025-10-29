// server/routes/pfp.js
import { parse } from "url";
import db from "../db.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function ok(res, data) {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}
function bad(res, msg = "bad_request") {
  res.writeHead(400, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify({ error: msg }));
}
function notFound(res) {
  res.writeHead(404, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify({ error: "not_found" }));
}

async function resolveSingle(table, idCol, legacyCol, mediaCol, id) {
  const [rows] = await db.query(
    `SELECT t.${idCol} AS id, t.${legacyCol} AS legacy_url,
            m.bucket, m.s3_key
     FROM ${table} t
     LEFT JOIN Media m ON m.MediaID = t.${mediaCol}
     WHERE t.${idCol} = ? AND t.IsDeleted = 0
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;

  if (row.bucket && row.s3_key) {
    const signed = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: row.bucket, Key: row.s3_key }),
      { expiresIn: 3600 }
    );
    return { id: row.id, url: signed };
  }
  return { id: row.id, url: row.legacy_url || null };
}

async function resolveMany(table, idCol, legacyCol, mediaCol, ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await db.query(
    `SELECT t.${idCol} AS id, t.${legacyCol} AS legacy_url,
            m.bucket, m.s3_key
     FROM ${table} t
     LEFT JOIN Media m ON m.MediaID = t.${mediaCol}
     WHERE t.${idCol} IN (${placeholders}) AND t.IsDeleted = 0`,
    ids
  );
  const out = await Promise.all(
    rows.map(async (row) => {
      if (row.bucket && row.s3_key) {
        const signed = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: row.bucket, Key: row.s3_key }),
          { expiresIn: 3600 }
        );
        return { id: row.id, url: signed };
      }
      return { id: row.id, url: row.legacy_url || null };
    })
  );
  return out;
}

export async function handlePfpRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  if (method === "OPTIONS") {
    cors(res); res.writeHead(204); res.end(); return;
  }
  if (method !== "GET") return bad(res, "method_not_allowed");
  cors(res);

  try {
    if (pathname.startsWith("/pfp/listener/")) {
      const id = pathname.split("/").pop();
      if (!id) return bad(res);
      const row = await resolveSingle("Listener", "ListenerID", "PFP", "image_media_id", id);
      return row ? ok(res, { type: "listener", ...row }) : notFound(res);
    }

    if (pathname === "/pfp/listener") {
      const ids = String(query.ids || "")
        .split(",").map((s) => s.trim()).filter(Boolean);
      const arr = await resolveMany("Listener", "ListenerID", "PFP", "image_media_id", ids);
      return ok(res, { type: "listener", items: arr });
    }

    if (pathname.startsWith("/pfp/artist/")) {
      const id = pathname.split("/").pop();
      if (!id) return bad(res);
      const row = await resolveSingle("Artist", "ArtistID", "PFP", "image_media_id", id);
      return row ? ok(res, { type: "artist", ...row }) : notFound(res);
    }

    if (pathname === "/pfp/artist") {
      const ids = String(query.ids || "")
        .split(",").map((s) => s.trim()).filter(Boolean);
      const arr = await resolveMany("Artist", "ArtistID", "PFP", "image_media_id", ids);
      return ok(res, { type: "artist", items: arr });
    }

    bad(res, "unknown_route");
  } catch (e) {
    console.error("[pfp] error:", e);
    bad(res, e.message || "server_error");
  }
}
