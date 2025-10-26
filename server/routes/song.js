import db from "../db.js";
import { parse } from "url";

export async function handleSongRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (pathname === "/songs/latest" && method === "GET") {
      const limit =
        Number.isInteger(Number(query?.limit)) && Number(query.limit) > 0
          ? Math.min(Number(query.limit), 50)
          : 10;

      const [rows] = await db.query(
        `SELECT s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate, s.GenreID, g.Name AS GenreName
         FROM Song s
         LEFT JOIN Genre g ON s.GenreID = g.GenreID
         WHERE s.IsDeleted = 0
         ORDER BY (s.ReleaseDate IS NULL) ASC, s.ReleaseDate DESC, s.SongID DESC
         LIMIT ?`,
        [limit]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    if (pathname === "/songs" && method === "GET") {
      const genreId = query?.genreId ? Number(query.genreId) : null;
      if (genreId) {
        const [rows] = await db.query(
          `SELECT s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate, s.GenreID, g.Name AS GenreName
           FROM Song s
           JOIN Genre g ON s.GenreID = g.GenreID
           WHERE s.IsDeleted = 0 AND s.GenreID = ?`,
          [genreId]
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows));
        return;
      } else {
        const [rows] = await db.query(
          `SELECT s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate, s.GenreID, g.Name AS GenreName
           FROM Song s
           LEFT JOIN Genre g ON s.GenreID = g.GenreID
           WHERE s.IsDeleted = 0`
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows));
        return;
      }
    }

    if (pathname.startsWith("/songs/") && method === "GET") {
      const id = pathname.split("/")[2];
      const [rows] = await db.query(
        `SELECT s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate, s.GenreID, g.Name AS GenreName
         FROM Song s
         LEFT JOIN Genre g ON s.GenreID = g.GenreID
         WHERE s.SongID = ? AND s.IsDeleted = 0`,
        [id]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Song not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

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
          if (g.length === 0) {
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
          res.end(
            JSON.stringify({
              SongID: result.insertId,
              Title,
              DurationSeconds: duration,
              ReleaseDate: ReleaseDate || null,
              GenreID: genreId,
              IsDeleted: 0
            })
          );
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

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
              if (g.length === 0) {
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

          if (result.affectedRows === 0) {
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

    if (pathname.startsWith("/songs/") && method === "DELETE") {
      const id = pathname.split("/")[2];

      const [result] = await db.query(
        "UPDATE Song SET IsDeleted = 1 WHERE SongID = ?",
        [id]
      );

      if (result.affectedRows === 0) {
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
