import db from "../db.js";
import { parse } from "url";

export async function handleAlbumRoutes(req, res) {
  const url = parse(req.url, true); 
  const idMatch = url.pathname.match(/^\/albums\/(\d+)$/);
  
  try {
    // GET /albums (Return all albums not soft deleted)
    if (req.method === "GET" && url.pathname === "/albums") {
      const [rows] = await db.query("SELECT * FROM Album WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // Return a single album
    if (req.method === "GET" && idMatch) {
      const albumId = idMatch[1];
      const [rows] = await db.query("SELECT * FROM Album WHERE AlbumID = ? AND IsDeleted = 0", [albumId]);
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Album not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // Add a new album
    if (req.method === "POST" && url.pathname === "/albums") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { Title, ReleaseDate, CoverArt } = JSON.parse(body);
        if (!Title || !ReleaseDate || !CoverArt) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        const [result] = await db.query(
          "INSERT INTO Album (Title, ReleaseDate, CoverArt) VALUES (?, ?, ?)",
          [Title, ReleaseDate, CoverArt]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          AlbumId: result.insertId,
          Title,
          ReleaseDate,
          CoverArt
        }));
      });
      return;
    }

    // Update an existing album by ID
    if (req.method === "PUT" && idMatch) {
      const albumId = idMatch[1];
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { Title, ReleaseDate, CoverArt } = JSON.parse(body);
        const [result] = await db.query(
          "UPDATE Album SET Title = ?, ReleaseDate = ?, CoverArt = ? WHERE AlbumId = ? AND IsDeleted = 0",
          [Title, ReleaseDate, CoverArt, albumId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Album not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          AlbumId: albumId,
          Title,
          ReleaseDate,
          CoverArt,
          message: "Album updated successfully"
        }));
      });
      return;
    }

    // Soft delete
    if (req.method === "DELETE" && idMatch) {
      const albumId = idMatch[1];
      const [result] = await db.query(
        "UPDATE Album SET IsDeleted = 1 WHERE AlbumId = ?",
        [albumId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Album not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Album soft deleted successfully" }));
      return;
    }

    // Fallback for unsupported routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Album endpoint not found" }));

  } catch (err) {
    console.error("Album route error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
