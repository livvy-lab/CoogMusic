import db from "../db.js";
import { parse } from "url";

export async function handleAlbumGenreRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // GET all album-genre pairs
    if (pathname === "/album_genres" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Album_Genre WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one album-genre pair
    if (pathname.startsWith("/album_genres/") && method === "GET") {
      const [, , albumId, genreId] = pathname.split("/");
      const [rows] = await db.query(
        "SELECT * FROM Album_Genre WHERE AlbumID = ? AND GenreID = ? AND IsDeleted = 0",
        [albumId, genreId]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Album-Genre relation not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // POST new album-genre relationship
    if (pathname === "/album_genres" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { AlbumID, GenreID } = JSON.parse(body);

        if (!AlbumID || !GenreID) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        await db.query("INSERT INTO Album_Genre (AlbumID, GenreID) VALUES (?, ?)", [
          AlbumID,
          GenreID,
        ]);

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ AlbumID, GenreID, IsDeleted: 0 }));
      });
      return;
    }

    // DELETE (soft delete)
    if (pathname.startsWith("/album_genres/") && method === "DELETE") {
      const [, , albumId, genreId] = pathname.split("/");
      const [result] = await db.query(
        "UPDATE Album_Genre SET IsDeleted = 1 WHERE AlbumID = ? AND GenreID = ?",
        [albumId, genreId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Album-Genre relation not found or already deleted" })
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Album-Genre soft deleted successfully" }));
      return;
    }

    // 404 fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling album_genre route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
