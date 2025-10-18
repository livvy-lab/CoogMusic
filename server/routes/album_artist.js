import db from "../db.js";
import { parse } from "url";

export async function handleAlbumArtistRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // Allow CORS for client-side requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight (OPTIONS)
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // GET all album-artist relationships
    if (pathname === "/album_artists" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Album_Artist");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one album-artist relationship by composite key (AlbumID + ArtistID)
    if (pathname.startsWith("/album_artists/") && method === "GET") {
      const [, , albumId, artistId] = pathname.split("/");
      const [rows] = await db.query(
        "SELECT * FROM Album_Artist WHERE AlbumID = ? AND ArtistID = ?",
        [albumId, artistId]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Album-Artist relation not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // POST new album-artist relationship
    if (pathname === "/album_artists" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { AlbumID, ArtistID } = JSON.parse(body);

        if (!AlbumID || !ArtistID) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        await db.query("INSERT INTO Album_Artist (AlbumID, ArtistID) VALUES (?, ?)", [
          AlbumID,
          ArtistID,
        ]);

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ AlbumID, ArtistID }));
      });
      return;
    }

    // DELETE (hard delete) album-artist relationship
    if (pathname.startsWith("/album_artists/") && method === "DELETE") {
      const [, , albumId, artistId] = pathname.split("/");
      const [result] = await db.query(
        "DELETE FROM Album_Artist WHERE AlbumID = ? AND ArtistID = ?",
        [albumId, artistId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Album-Artist relation not found" })
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Album-Artist deleted successfully" }));
      return;
    }

    // 404 fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling album_artist route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
