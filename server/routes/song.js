import db from "../db.js";
import { parse } from "url";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configure S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
});

export async function handleSongRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Helper: common SELECT list with ArtistName
  const SELECT_CORE = `
    s.SongID,
    s.Title,
    s.DurationSeconds,
    s.ReleaseDate,
    s.GenreID,
    g.Name AS GenreName,
    COALESCE(
      GROUP_CONCAT(DISTINCT a.ArtistName ORDER BY a.ArtistName SEPARATOR ', '),
      'Unknown Artist'
    ) AS ArtistName
  `;

  try {
    // GET /songs/latest?limit=10
    if (pathname === "/songs/latest" && method === "GET") {
      const limit =
        Number.isInteger(Number(query?.limit)) && Number(query.limit) > 0
          ? Math.min(Number(query.limit), 50)
          : 10;

      const [rows] = await db.query(
        `
        SELECT ${SELECT_CORE}
        FROM Song s
        LEFT JOIN Genre g ON g.GenreID = s.GenreID
        LEFT JOIN Song_Artist sa ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
        LEFT JOIN Artist a ON a.ArtistID = sa.ArtistID AND COALESCE(a.IsDeleted,0)=0
        WHERE s.IsDeleted = 0
        GROUP BY s.SongID
        ORDER BY (s.ReleaseDate IS NULL) ASC, s.ReleaseDate DESC, s.SongID DESC
        LIMIT ?
        `,
        [limit]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET /songs or /songs?genreId=10
    if (pathname === "/songs" && method === "GET") {
      const genreId = query?.genreId ? Number(query.genreId) : null;

      if (genreId) {
        const [rows] = await db.query(
          `
          SELECT ${SELECT_CORE}
          FROM Song s
          JOIN Genre g ON g.GenreID = s.GenreID
          LEFT JOIN Song_Artist sa ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
          LEFT JOIN Artist a ON a.ArtistID = sa.ArtistID AND COALESCE(a.IsDeleted,0)=0
          WHERE s.IsDeleted = 0 AND s.GenreID = ?
          GROUP BY s.SongID
          ORDER BY s.ReleaseDate DESC, s.SongID DESC
          `,
          [genreId]
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows));
        return;
      } else {
        const [rows] = await db.query(
          `
          SELECT ${SELECT_CORE}
          FROM Song s
          LEFT JOIN Genre g ON g.GenreID = s.GenreID
          LEFT JOIN Song_Artist sa ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
          LEFT JOIN Artist a ON a.ArtistID = sa.ArtistID AND COALESCE(a.IsDeleted,0)=0
          WHERE s.IsDeleted = 0
          GROUP BY s.SongID
          ORDER BY s.ReleaseDate DESC, s.SongID DESC
          `
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows));
        return;
      }
    }

    // GET /songs/:id (details)
    if (/^\/songs\/\d+$/.test(pathname) && method === "GET") {
      const id = Number(pathname.split("/")[2]);
      const [rows] = await db.query(
        `
        SELECT ${SELECT_CORE}, m.url AS AudioURL
        FROM Song s
        LEFT JOIN Genre g ON g.GenreID = s.GenreID
        LEFT JOIN Song_Artist sa ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
        LEFT JOIN Artist a ON a.ArtistID = sa.ArtistID AND COALESCE(a.IsDeleted,0)=0
        LEFT JOIN Media m ON m.MediaID = s.audio_media_id
        WHERE s.SongID = ? AND s.IsDeleted = 0
        GROUP BY s.SongID
        `,
        [id]
      );

      if (!rows.length) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Song not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // GET /songs/:id/stream
    if (/^\/songs\/\d+\/stream\/?$/.test(pathname) && method === "GET") {
      const id = Number(pathname.split("/")[2]);

      const [rows] = await db.query(
        `
        SELECT s.SongID, s.Title,
               COALESCE(GROUP_CONCAT(DISTINCT a.ArtistName SEPARATOR ', '), 'Unknown Artist') AS ArtistName,
               m.bucket, m.s3_key, m.mime
        FROM Song s
        LEFT JOIN Song_Artist sa ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
        LEFT JOIN Artist a ON a.ArtistID = sa.ArtistID AND COALESCE(a.IsDeleted,0)=0
        JOIN Media m ON m.MediaID = s.audio_media_id
        WHERE s.SongID = ? AND s.IsDeleted = 0
        GROUP BY s.SongID
        LIMIT 1
        `,
        [id]
      );

      if (!rows.length) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Song not found" }));
        return;
      }

      const row = rows[0];
      const cmd = new GetObjectCommand({ Bucket: row.bucket, Key: row.s3_key });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min signed URL

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        songId: row.SongID,
        title: row.Title,
        artistName: row.ArtistName,
        url,
        mime: row.mime,
        expiresIn: 900
      }));
      return;
    }

    // POST /songs
    if (pathname === "/songs" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { Title, DurationSeconds, ReleaseDate, GenreID } = JSON.parse(body || "{}");

          const missing = [];
          if (!Title) missing.push("Title");
          if (DurationSeconds === undefined || DurationSeconds === null) missing.push("DurationSeconds");
          if (GenreID === undefined) missing.push("GenreID");

          if (missing.length) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `Missing required field(s): ${missing.join(", ")}` }));
            return;
          }

          const duration = Number(DurationSeconds);
          if (!Number.isInteger(duration) || duration < 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "DurationSeconds must be a non-negative integer" }));
            return;
          }

          const genreId = Number(GenreID);
          if (!Number.isInteger(genreId) || genreId <= 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "GenreID must be a positive integer" }));
            return;
          }

          const [g] = await db.query(`SELECT 1 FROM Genre WHERE GenreID = ?`, [genreId]);
          if (!g.length) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "GenreID does not exist" }));
            return;
          }

          const [result] = await db.query(
            `INSERT INTO Song (Title, DurationSeconds, ReleaseDate, GenreID, IsDeleted)
             VALUES (?, ?, ?, ?, 0)`,
            [Title, duration, ReleaseDate || null, genreId]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            SongID: result.insertId, Title, DurationSeconds: duration,
            ReleaseDate: ReleaseDate || null, GenreID: genreId, IsDeleted: 0
          }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // PUT /songs/:id
    if (pathname.startsWith("/songs/") && method === "PUT") {
      const id = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const fields = JSON.parse(body || "{}");
          const validCols = ["Title", "DurationSeconds", "ReleaseDate", "GenreID"];
          const updates = [];
          const params = [];

          for (const [key, value] of Object.entries(fields)) {
            if (!validCols.includes(key)) continue;

            if (key === "DurationSeconds") {
              const d = Number(value);
              if (!Number.isInteger(d) || d < 0) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "DurationSeconds must be a non-negative integer" }));
                return;
              }
              updates.push(`${key} = ?`);
              params.push(d);
            } else if (key === "GenreID") {
              const gid = Number(value);
              if (!Number.isInteger(gid) || gid <= 0) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "GenreID must be a positive integer" }));
                return;
              }
              const [g] = await db.query(`SELECT 1 FROM Genre WHERE GenreID = ?`, [gid]);
              if (!g.length) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "GenreID does not exist" }));
                return;
              }
              updates.push(`GenreID = ?`);
              params.push(gid);
            } else {
              updates.push(`${key} = ?`);
              params.push(value ?? null);
            }
          }

          if (!updates.length) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "No valid fields provided to update" }));
            return;
          }

          params.push(id);
          const [result] = await db.query(
            `UPDATE Song SET ${updates.join(", ")} WHERE SongID = ? AND IsDeleted = 0`,
            params
          );

          if (!result.affectedRows) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Song not found" }));
            return;
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ SongID: id, message: "Song updated successfully" }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // DELETE /songs/:id
    if (pathname.startsWith("/songs/") && method === "DELETE") {
      const id = pathname.split("/")[2];
      const [result] = await db.query(`UPDATE Song SET IsDeleted = 1 WHERE SongID = ?`, [id]);
      if (!result.affectedRows) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Song not found or already deleted" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Song soft deleted successfully" }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling song routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
