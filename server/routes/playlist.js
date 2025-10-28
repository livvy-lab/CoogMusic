import db from "../db.js";
import { parse } from "url";

export async function handlePlaylistRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  // ✅ CORS setup
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
    // ✅ GET /listeners/:id/playlists  (all playlists for a listener)
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
        LEFT JOIN Playlist_Track pt ON pt.PlaylistID = p.PlaylistID
        WHERE p.IsDeleted = 0 AND p.ListenerID = ?
        GROUP BY
          p.PlaylistID, p.ListenerID, p.ArtistID, p.Name,
          p.Description, p.IsPublic, p.IsDeleted
        ORDER BY p.PlaylistID DESC
        `,
        [listenerId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // --------------------------------------------------------
    // ✅ GET /playlists/:id/tracks → return all songs in a playlist
    // --------------------------------------------------------
    if (/^\/playlists\/\d+\/tracks$/.test(pathname) && method === "GET") {
      const playlistId = Number(pathname.split("/")[2]);
      console.log("✅ [ROUTE HIT] /playlists/:id/tracks", playlistId);

      const [rows] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.DurationSeconds,
          s.ReleaseDate,
          al.Title AS Album
        FROM Playlist_Track pt
        JOIN Song s ON pt.SongID = s.SongID
        LEFT JOIN Album_Track at ON s.SongID = at.SongID
        LEFT JOIN Album al ON at.AlbumID = al.AlbumID
        WHERE pt.PlaylistID = ?
        ORDER BY pt.TrackNumber ASC, pt.DateSongAdded DESC
        `,
        [playlistId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // --------------------------------------------------------
    // ✅ GET /playlists (optionally filter by ?listenerId)
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
          LEFT JOIN Playlist_Track pt ON pt.PlaylistID = p.PlaylistID
          WHERE p.IsDeleted = 0 AND p.ListenerID = ?
          GROUP BY
            p.PlaylistID, p.ListenerID, p.ArtistID, p.Name,
            p.Description, p.IsPublic, p.IsDeleted
          ORDER BY p.PlaylistID DESC
          `,
          [listenerId]
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows));
        return;
      }

      const [rows] = await db.query(
        "SELECT * FROM Playlist WHERE IsDeleted = 0"
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // --------------------------------------------------------
    // ✅ GET /playlists/:id → single playlist info
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
    // ✅ POST /playlists → create playlist
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
          console.error("Error parsing POST /playlists:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // --------------------------------------------------------
    // ✅ PUT /playlists/:id → update playlist
    // --------------------------------------------------------
    if (pathname.startsWith("/playlists/") && method === "PUT") {
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
              updates.push(`${key} = ?`);
              params.push(value ?? null);
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
          console.error("Error parsing PUT /playlists/:id:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // --------------------------------------------------------
    // ✅ DELETE /playlists/:id → soft delete
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

// ✅ POST /playlists
if (pathname === "/playlists" && method === "POST") {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const { ListenerID, Name, Description, IsPublic } = JSON.parse(body || "{}");

      if (!ListenerID || !Name) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing ListenerID or Name" }));
        return;
      }

      // Insert playlist into DB
      const [result] = await db.query(
        `INSERT INTO Playlist (ListenerID, PlaylistName, Description, IsPublic, CreatedDate)
         VALUES (?, ?, ?, ?, CURDATE())`,
        [ListenerID, Name, Description || null, IsPublic ? 1 : 0]
      );

      // Send back the new playlist info
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          playlistId: result.insertId,
          Name,
          Description,
          IsPublic,
        })
      );
    } catch (err) {
      console.error("❌ Error creating playlist:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
  return;
}

// ✅ DELETE /playlists/:id
if (/^\/playlists\/\d+$/.test(pathname) && method === "DELETE") {
  const playlistId = Number(pathname.split("/")[2]);

  try {
    // Remove any songs linked to the playlist (optional, but prevents FK errors)
    await db.query("DELETE FROM Playlist_Track WHERE PlaylistID = ?", [playlistId]);

    // Delete the playlist itself
    const [result] = await db.query("DELETE FROM Playlist WHERE PlaylistID = ?", [playlistId]);

    if (result.affectedRows === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Playlist not found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, deletedId: playlistId }));
  } catch (err) {
    console.error("❌ Error deleting playlist:", err.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
  return;
}

    // --------------------------------------------------------
    // ❌ Fallback
    // --------------------------------------------------------
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));

  } catch (err) {
    console.error("Error handling playlist routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
