import db from "../db.js";
import { parse } from "url";

export async function handlePlaylistRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
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
    // GET /listeners/:id/playlists  (alias for convenience)
    // --------------------------------------------------------
    if (method === "GET" && /^\/listeners\/\d+\/playlists$/.test(pathname)) {
      const listenerId = Number(pathname.split("/")[2]);

      const [rows] = await db.query(
        `
        SELECT
          p.PlaylistID,
          p.ListenerID,
          p.ArtistID,
          p.Name,
          p.Description,
          p.IsPublic,
          p.IsDeleted,
          COALESCE(COUNT(pt.SongID), 0) AS TrackCount,
          MAX(pt.DateSongAdded) AS LastAdded
        FROM Playlist p
        LEFT JOIN Playlist_Track pt
          ON pt.PlaylistID = p.PlaylistID
        WHERE p.IsDeleted = 0
          AND p.ListenerID = ?
        GROUP BY
          p.PlaylistID, p.ListenerID, p.ArtistID, p.Name, p.Description, p.IsPublic, p.IsDeleted
        ORDER BY p.PlaylistID DESC
        `,
        [listenerId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // --------------------------------------------------------
    // GET /playlists
    //   - all not-deleted (default)
    //   - OR filtered by listener via ?listenerId=123
    // --------------------------------------------------------
    if (pathname === "/playlists" && method === "GET") {
      const listenerId = query.listenerId ? Number(query.listenerId) : null;

      if (Number.isFinite(listenerId)) {
        const [rows] = await db.query(
          `
          SELECT
            p.PlaylistID,
            p.ListenerID,
            p.ArtistID,
            p.Name,
            p.Description,
            p.IsPublic,
            p.IsDeleted,
            COALESCE(COUNT(pt.SongID), 0) AS TrackCount,
            MAX(pt.DateSongAdded) AS LastAdded
          FROM Playlist p
          LEFT JOIN Playlist_Track pt
            ON pt.PlaylistID = p.PlaylistID
          WHERE p.IsDeleted = 0
            AND p.ListenerID = ?
          GROUP BY
            p.PlaylistID, p.ListenerID, p.ArtistID, p.Name, p.Description, p.IsPublic, p.IsDeleted
          ORDER BY p.PlaylistID DESC
          `,
          [listenerId]
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows));
        return;
      }

      // fallback: all not-deleted playlists (existing behavior)
      const [rows] = await db.query(
        "SELECT * FROM Playlist WHERE IsDeleted = 0"
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // --------------------------------------------------------
    // GET /playlists/:id
    // --------------------------------------------------------
    if (pathname.startsWith("/playlists/") && method === "GET") {
      const id = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Playlist WHERE PlaylistID = ? AND IsDeleted = 0",
        [id]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Playlist not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // --------------------------------------------------------
    // POST /playlists
    // Body: { ListenerID?, ArtistID?, Name, Description?, IsPublic }
    // --------------------------------------------------------
    if (pathname === "/playlists" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { ListenerID, ArtistID, Name, Description, IsPublic } = JSON.parse(body || "{}");

          const missing = [];
          if (!Name) missing.push("Name");
          if (IsPublic === undefined || IsPublic === null) missing.push("IsPublic");
          if (!ListenerID && !ArtistID) missing.push("ListenerID or ArtistID");

          if (missing.length) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `Missing required field(s): ${missing.join(", ")}` }));
            return;
          }

          const [result] = await db.query(
            `INSERT INTO Playlist
              (ListenerID, ArtistID, Name, Description, IsPublic, IsDeleted)
             VALUES (?, ?, ?, ?, ?, 0)`,
            [
              ListenerID || null,
              ArtistID || null,
              Name,
              Description || null,
              Number(IsPublic) ? 1 : 0
            ]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              PlaylistID: result.insertId,
              ListenerID: ListenerID || null,
              ArtistID: ArtistID || null,
              Name,
              Description: Description || null,
              IsPublic: Number(IsPublic) ? 1 : 0,
              IsDeleted: 0
            })
          );
        } catch (err) {
          console.error("Error parsing request body for POST /playlists:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // --------------------------------------------------------
    // PUT /playlists/:id
    // --------------------------------------------------------
    if (pathname.startsWith("/playlists/") && method === "PUT")) {
      const id = pathname.split("/")[2];

      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const fields = JSON.parse(body || "{}");
          const validCols = ["ListenerID", "ArtistID", "Name", "Description", "IsPublic"];

          const updates = [];
          const params = [];

          for (const [key, value] of Object.entries(fields)) {
            if (validCols.includes(key)) {
              if (key === "IsPublic") {
                updates.push(`${key} = ?`);
                params.push(Number(value) ? 1 : 0);
              } else {
                updates.push(`${key} = ?`);
                params.push(value ?? null);
              }
            }
          }

          if (!updates.length) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "No valid fields provided to update" }));
            return;
          }

          params.push(id);

          const [result] = await db.query(
            `UPDATE Playlist SET ${updates.join(", ")} WHERE PlaylistID = ? AND IsDeleted = 0`,
            params
          );

          if (result.affectedRows === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Playlist not found" }));
            return;
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ PlaylistID: id, message: "Playlist updated successfully" }));
        } catch (err) {
          console.error("Error parsing PUT /playlists/:id body:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // --------------------------------------------------------
    // DELETE /playlists/:id   (soft delete -> IsDeleted = 1)
    // --------------------------------------------------------
    if (pathname.startsWith("/playlists/") && method === "DELETE") {
      const id = pathname.split("/")[2];

      const [result] = await db.query(
        "UPDATE Playlist SET IsDeleted = 1 WHERE PlaylistID = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Playlist not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Playlist soft deleted successfully" }));
      return;
    }

    // --------------------------------------------------------
    // Fallback
    // --------------------------------------------------------
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling playlist routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
