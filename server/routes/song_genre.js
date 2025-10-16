import db from "../db.js";
import { parse } from "url";

export async function handleSongGenreRoutes(req, res) {
  const { pathname } = parse(req.url, true);
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
    // GET all song-genre mappings
    if (pathname === "/song_genres" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Song_Genre WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one mapping by ID
    if (pathname.startsWith("/song_genres/") && method === "GET") {
      const id = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Song_Genre WHERE SongGenreID = ? AND IsDeleted = 0",
        [id]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Song-genre mapping not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // POST create new mapping
    if (pathname === "/song_genres" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { SongID, GenreID } = JSON.parse(body);

        if (!SongID || !GenreID) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields: SongID and GenreID" }));
          return;
        }

        const [result] = await db.query(
          "INSERT INTO Song_Genre (SongID, GenreID) VALUES (?, ?)",
          [SongID, GenreID]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            SongGenreID: result.insertId,
            SongID,
            GenreID,
          })
        );
      });
      return;
    }

    // PUT update mapping
    if (pathname.startsWith("/song_genres/") && method === "PUT") {
      const id = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { SongID, GenreID } = JSON.parse(body);

        const [result] = await db.query(
          "UPDATE Song_Genre SET SongID = ?, GenreID = ? WHERE SongGenreID = ? AND IsDeleted = 0",
          [SongID, GenreID, id]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Song-genre mapping not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            SongGenreID: id,
            SongID,
            GenreID,
            message: "Song-genre mapping updated successfully",
          })
        );
      });
      return;
    }

    // DELETE (soft delete) mapping
    if (pathname.startsWith("/song_genres/") && method === "DELETE") {
      const id = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Song_Genre SET IsDeleted = 1 WHERE SongGenreID = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Song-genre mapping not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Song-genre mapping soft deleted successfully" }));
      return;
    }

    // 404 Not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling song_genre route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}