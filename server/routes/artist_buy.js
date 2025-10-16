import db from "../db.js";
import { parse } from "url";

export async function handleArtistRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // Allow CORS (important for frontend calls)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight check (browser sends this before actual request)
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // GET all artists that are not deleted
    if (pathname === "/artists" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Artist WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one artist by their ArtistID
    if (pathname.startsWith("/artists/") && method === "GET") {
      const artistId = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Artist WHERE ArtistID = ? AND IsDeleted = 0",
        [artistId]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Artist not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // POST create a new artist
    if (pathname === "/artists" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { Username, ArtistName, DateCreated, PFP, Banner, Bio } = JSON.parse(body);

        // Required fields check
        if (!Username || !ArtistName || !DateCreated) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Missing required fields: Username, ArtistName, DateCreated" })
          );
          return;
        }

        const [result] = await db.query(
          "INSERT INTO Artist (Username, ArtistName, DateCreated, PFP, Banner, Bio) VALUES (?, ?, ?, ?, ?, ?)",
          [Username, ArtistName, DateCreated, PFP || null, Banner || null, Bio || null]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ArtistID: result.insertId,
            Username,
            ArtistName,
            DateCreated,
            PFP,
            Banner,
            Bio,
            IsDeleted: 0,
          })
        );
      });
      return;
    }

    // PUT update artist profile info
    if (pathname.startsWith("/artists/") && method === "PUT") {
      const artistId = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { Username, ArtistName, DateCreated, PFP, Banner, Bio } = JSON.parse(body);

        const [result] = await db.query(
          "UPDATE Artist SET Username = ?, ArtistName = ?, DateCreated = ?, PFP = ?, Banner = ?, Bio = ? WHERE ArtistID = ? AND IsDeleted = 0",
          [Username, ArtistName, DateCreated, PFP, Banner, Bio, artistId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Artist not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ArtistID: artistId,
            Username,
            ArtistName,
            DateCreated,
            PFP,
            Banner,
            Bio,
            message: "Artist updated successfully",
          })
        );
      });
      return;
    }

    // DELETE (soft delete) artist record
    if (pathname.startsWith("/artists/") && method === "DELETE") {
      const artistId = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Artist SET IsDeleted = 1 WHERE ArtistID = ?",
        [artistId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Artist not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Artist soft deleted successfully" }));
      return;
    }

    // Fallback 404 
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling artist route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
