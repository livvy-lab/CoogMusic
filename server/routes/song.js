// routes/song.js
import db from "../db.js";
import { parse } from "url";

export async function handleSongRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // --------------------------------------------------------
    // GET /songs   (all not-deleted)
    // --------------------------------------------------------
    if (pathname === "/songs" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Song WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // --------------------------------------------------------
    // GET /songs/:id
    // --------------------------------------------------------
    if (pathname.startsWith("/songs/") && method === "GET") {
      const id = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Song WHERE SongID = ? AND IsDeleted = 0",
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

    // --------------------------------------------------------
    // POST /songs
    // Body: { Title, DurationSeconds, ReleaseDate? }
    // Required: Title, DurationSeconds
    // --------------------------------------------------------
    if (pathname === "/songs" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { Title, DurationSeconds, ReleaseDate } = JSON.parse(body || "{}");

          const missing = [];
          if (!Title) missing.push("Title");
          if (DurationSeconds === undefined || DurationSeconds === null) missing.push("DurationSeconds");

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

          const [result] = await db.query(
            `INSERT INTO Song (Title, DurationSeconds, ReleaseDate, IsDeleted)
             VALUES (?, ?, ?, 0)`,
            [Title, duration, ReleaseDate || null]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              SongID: result.insertId,
              Title,
              DurationSeconds: duration,
              ReleaseDate: ReleaseDate || null,
              IsDeleted: 0
            })
          );
        } catch (err) {
          console.error("Error parsing request body for POST /songs:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // --------------------------------------------------------
    // PUT /songs/:id
    // Body: { Title?, DurationSeconds?, ReleaseDate? }
    // Partial updates allowed; only provided fields are changed
    // --------------------------------------------------------
    if (pathname.startsWith("/songs/") && method === "PUT") {
      const id = pathname.split("/")[2];

      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const fields = JSON.parse(body || "{}");
          const validCols = ["Title", "DurationSeconds", "ReleaseDate"];

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
            } else {
              updates.push(`${key} = ?`);
              params.push(value ?? null); // allow null to clear optional ReleaseDate
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
        } catch (err) {
          console.error("Error parsing PUT /songs/:id body:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // --------------------------------------------------------
    // DELETE /songs/:id   (soft delete -> IsDeleted = 1)
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // Fallback
    // --------------------------------------------------------
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling song routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
