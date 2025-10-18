import db from "../db.js";
import { parse } from "url";

export async function handleAlbumTrackRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // GET all album-track relations
    if (pathname === "/album_tracks" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Album_Track");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one album-track by composite key
    if (pathname.startsWith("/album_tracks/") && method === "GET") {
      const [, , albumId, songId] = pathname.split("/");
      const [rows] = await db.query(
        "SELECT * FROM Album_Track WHERE AlbumID = ? AND SongID = ?",
        [albumId, songId]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Album-Track relation not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // POST new album-track
    if (pathname === "/album_tracks" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { AlbumID, SongID, TrackNumber } = JSON.parse(body);

        if (!AlbumID || !SongID || TrackNumber === undefined) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        await db.query(
          "INSERT INTO Album_Track (AlbumID, SongID, TrackNumber) VALUES (?, ?, ?)",
          [AlbumID, SongID, TrackNumber]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ AlbumID, SongID, TrackNumber }));
      });
      return;
    }

    // PUT update track number
    if (pathname.startsWith("/album_tracks/") && method === "PUT") {
      const [, , albumId, songId] = pathname.split("/");
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { TrackNumber } = JSON.parse(body);

        const [result] = await db.query(
          "UPDATE Album_Track SET TrackNumber = ? WHERE AlbumID = ? AND SongID = ?",
          [TrackNumber, albumId, songId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Album-Track not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            AlbumID: albumId,
            SongID: songId,
            TrackNumber,
            message: "Album-Track updated successfully",
          })
        );
      });
      return;
    }

    // DELETE (hard delete)
    if (pathname.startsWith("/album_tracks/") && method === "DELETE") {
      const [, , albumId, songId] = pathname.split("/");
      const [result] = await db.query(
        "DELETE FROM Album_Track WHERE AlbumID = ? AND SongID = ?",
        [albumId, songId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Album-Track not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Album-Track deleted successfully" }));
      return;
    }

    // Default 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling album_track route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
