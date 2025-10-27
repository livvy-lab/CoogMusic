import db from "../db.js";
import { parse } from "url";

export async function handleArtistRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // GET all artists
    if (pathname === "/artists" && method === "GET") {
      const [rows] = await db.query("SELECT ArtistID, ArtistName, DateCreated, PFP, Bio, IsDeleted, AccountID FROM Artist WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one artist by ID
    if (pathname.startsWith("/artists/") && method === "GET") {
      const artistId = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT ArtistID, ArtistName, DateCreated, PFP, Bio, IsDeleted, AccountID FROM Artist WHERE ArtistID = ? AND IsDeleted = 0",
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

    // POST new artist
    if (pathname === "/artists" && method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        const { AccountID, ArtistName, DateCreated, PFP, Bio } =
          JSON.parse(body);

        const [result] = await db.query(
          "INSERT INTO Artist (AccountID, ArtistName, DateCreated, PFP, Bio) VALUES (?, ?, ?, ?, ?)",
          [AccountID, ArtistName, DateCreated, PFP, Bio]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ArtistID: result.insertId,
            AccountID,
            ArtistName,
            DateCreated,
            PFP,
            Bio,
            IsDeleted: 0,
          })
        );
      });
      return;
    }

    // PUT update artist info
    if (pathname.startsWith("/artists/") && method === "PUT") {
      const artistId = pathname.split("/")[2];
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        const { AccountID, ArtistName, DateCreated, PFP, Bio } =
          JSON.parse(body);

        const [result] = await db.query(
          "UPDATE Artist SET AccountID = ?, ArtistName = ?, DateCreated = ?, PFP = ?, Bio = ? WHERE ArtistID = ? AND IsDeleted = 0",
          [AccountID, ArtistName, DateCreated, PFP, Bio, artistId]
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
            AccountID,
            ArtistName,
            DateCreated,
            PFP,
            Bio,
            message: "Artist updated successfully",
          })
        );
      });
      return;
    }

    // DELETE (soft delete)
    if (pathname.startsWith("/artists/") && method === "DELETE") {
      const artistId = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Artist SET IsDeleted = 1 WHERE ArtistID = ?",
        [artistId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Artist not found or already deleted" })
        );
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Artist soft deleted successfully" }));
      return;
    }

    // 404 fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling artist route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}