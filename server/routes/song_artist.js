import db from "../db.js";
import { parse } from "url";

export async function handleSongArtistRoutes(req, res) {
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
    // GET all song-artist mappings
    if (pathname === "/song_artists" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Song_Artist WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one mapping by ID
    if (pathname.startsWith("/song_artists/") && method === "GET") {
      const id = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Song_Artist WHERE SongArtistID = ? AND IsDeleted = 0",
        [id]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Song-artist mapping not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // POST create new mapping
    if (pathname === "/song_artists" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { SongID, ArtistID, Role } = JSON.parse(body);

          if (!SongID || !ArtistID) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required fields: SongID and ArtistID" }));
            return;
          }

          const [result] = await db.query(
            "INSERT INTO Song_Artist (SongID, ArtistID, Role) VALUES (?, ?, ?)",
            [SongID, ArtistID, Role || null]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              SongArtistID: result.insertId,
              SongID,
              ArtistID,
              Role: Role || null,
            })
          );
        } catch (err) {
          console.error("Error parsing request body for POST /song_artists:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // PUT update mapping
    if (pathname.startsWith("/song_artists/") && method === "PUT") {
      const id = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { SongID, ArtistID, Role } = JSON.parse(body);

          // Build dynamic set clause to allow partial updates
          const fields = [];
          const params = [];

          if (SongID !== undefined) {
            fields.push("SongID = ?");
            params.push(SongID);
          }
          if (ArtistID !== undefined) {
            fields.push("ArtistID = ?");
            params.push(ArtistID);
          }
          if (Role !== undefined) {
            fields.push("Role = ?");
            params.push(Role);
          }

          if (fields.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "No fields provided to update" }));
            return;
          }

          params.push(id);
          const [result] = await db.query(
            `UPDATE Song_Artist SET ${fields.join(", ")} WHERE SongArtistID = ? AND IsDeleted = 0`,
            params
          );

          if (result.affectedRows === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Song-artist mapping not found" }));
            return;
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              SongArtistID: id,
              message: "Song-artist mapping updated successfully",
            })
          );
        } catch (err) {
          console.error("Error parsing request body for PUT /song_artists/:id:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // DELETE (soft delete) mapping
    if (pathname.startsWith("/song_artists/") && method === "DELETE") {
      const id = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Song_Artist SET IsDeleted = 1 WHERE SongArtistID = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Song-artist mapping not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Song-artist mapping soft deleted successfully" }));
      return;
    }

    // 404 Not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling song_artist route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
