// server/routes/playlist.js
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
    // ─────────────────────────────────────────────────────────────
    // GET /listeners/:id/playlists → all playlists for a listener
    // (Hides IsLikedSongs playlists from normal lists)
    // ─────────────────────────────────────────────────────────────
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
          COALESCE(p.IsLikedSongs, 0) AS IsLikedSongs,
          p.cover_media_id,
          COALESCE(COUNT(pt.SongID), 0) AS TrackCount,
          MAX(pt.DateSongAdded) AS LastAdded
        FROM Playlist p
        LEFT JOIN Playlist_Track pt ON pt.PlaylistID = p.PlaylistID
        WHERE p.IsDeleted = 0
          AND (p.IsLikedSongs IS NULL OR p.IsLikedSongs = 0)
          AND p.ListenerID = ?
        GROUP BY
          p.PlaylistID, p.ListenerID, p.ArtistID, p.Name,
          p.Description, p.IsPublic, p.IsDeleted, p.IsLikedSongs, p.cover_media_id
        ORDER BY p.PlaylistID DESC
        `,
        [listenerId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // GET /playlists/:id/tracks → songs in a playlist
    // ─────────────────────────────────────────────────────────────
    if (method === "GET" && /^\/playlists\/\d+\/tracks$/.test(pathname)) {
      const playlistId = Number(pathname.split("/")[2]);

      const [rows] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.DurationSeconds,
          s.ReleaseDate,
          al.Title AS Album,
          (
            SELECT ar.ArtistID
            FROM Song_Artist sa
            JOIN Artist ar ON ar.ArtistID = sa.ArtistID AND COALESCE(ar.IsDeleted,0)=0
            WHERE sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
            ORDER BY CASE sa.Role WHEN 'Primary' THEN 0 ELSE 1 END, ar.ArtistID
            LIMIT 1
          ) AS ArtistID,
          (
            SELECT ar.ArtistName
            FROM Song_Artist sa
            JOIN Artist ar ON ar.ArtistID = sa.ArtistID AND COALESCE(ar.IsDeleted,0)=0
            WHERE sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
            ORDER BY CASE sa.Role WHEN 'Primary' THEN 0 ELSE 1 END, ar.ArtistID
            LIMIT 1
          ) AS ArtistName
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

    // ─────────────────────────────────────────────────────────────
    // GET /playlists (optional ?listenerId=)
    // (Hides IsLikedSongs from list results)
    // ─────────────────────────────────────────────────────────────
    if (method === "GET" && pathname === "/playlists") {
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
            COALESCE(p.IsLikedSongs, 0) AS IsLikedSongs,
            p.cover_media_id,
            COALESCE(COUNT(pt.SongID), 0) AS TrackCount,
            MAX(pt.DateSongAdded) AS LastAdded
          FROM Playlist p
          LEFT JOIN Playlist_Track pt ON pt.PlaylistID = p.PlaylistID
          WHERE p.IsDeleted = 0
            AND (p.IsLikedSongs IS NULL OR p.IsLikedSongs = 0)
            AND p.ListenerID = ?
          GROUP BY
            p.PlaylistID, p.ListenerID, p.ArtistID, p.Name,
            p.Description, p.IsPublic, p.IsDeleted, p.IsLikedSongs, p.cover_media_id
          ORDER BY p.PlaylistID DESC
          `,
          [listenerId]
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows));
        return;
      }

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
          COALESCE(p.IsLikedSongs, 0) AS IsLikedSongs,
          p.cover_media_id
        FROM Playlist p
        WHERE p.IsDeleted = 0
          AND (p.IsLikedSongs IS NULL OR p.IsLikedSongs = 0)
        ORDER BY p.PlaylistID DESC
        `
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // GET /playlists/:id → single playlist (returns IsLikedSongs)
    // ─────────────────────────────────────────────────────────────
    if (method === "GET" && /^\/playlists\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/")[2]);

      const [rows] = await db.query(
        `
        SELECT
          PlaylistID,
          ListenerID,
          ArtistID,
          Name,
          Description,
          IsPublic,
          IsDeleted,
          COALESCE(IsLikedSongs, 0) AS IsLikedSongs,
          cover_media_id
        FROM Playlist
        WHERE PlaylistID = ? AND IsDeleted = 0
        `,
        [id]
      );

      if (!rows.length) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Playlist not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // POST /playlists → create (forces IsLikedSongs = 0)
    // ─────────────────────────────────────────────────────────────
    if (method === "POST" && pathname === "/playlists") {
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

          // Enforce free-account limits: non-subscribers may only create public playlists
          // and are limited to 10 public playlists. Check subscription status.
          if (ListenerID) {
            const [subRows] = await db.query(
              `SELECT * FROM Subscription WHERE ListenerID = ? AND IsActive = 1 AND IsDeleted = 0`,
              [ListenerID]
            );
            const isSubscribed = Array.isArray(subRows) && subRows.length > 0;
            // debug: log subscription and incoming listener
            console.log(`POST /playlists: ListenerID=${ListenerID}, isSubscribed=${isSubscribed}`);

            if (!isSubscribed) {
              // Non-subscribers may not create private playlists
              if (!Number(IsPublic)) {
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Private playlists are for subscribers only" }));
                return;
              }

              // Count existing public playlists for this listener (exclude deleted and liked-songs)
              const [existing] = await db.query(
                `SELECT COUNT(*) as cnt FROM Playlist WHERE ListenerID = ? AND IsDeleted = 0 AND (IsLikedSongs IS NULL OR IsLikedSongs = 0) AND IsPublic = 1`,
                [ListenerID]
              );
              const publicCount = (existing && existing[0] && existing[0].cnt) ? Number(existing[0].cnt) : 0;
              console.log(`POST /playlists: ListenerID=${ListenerID} publicCount=${publicCount}`);
              if (publicCount >= 10) {
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Free accounts can create up to 10 public playlists. Upgrade to create more." }));
                return;
              }
            }
          }

          const [result] = await db.query(
            `INSERT INTO Playlist
              (ListenerID, ArtistID, Name, Description, IsPublic, IsDeleted, IsLikedSongs, cover_media_id)
             VALUES (?, ?, ?, ?, ?, 0, 0, NULL)`,
            [
              ListenerID || null,
              ArtistID || null,
              Name,
              Description || null,
              Number(IsPublic) ? 1 : 0
            ]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            PlaylistID: result.insertId,
            ListenerID: ListenerID || null,
            ArtistID: ArtistID || null,
            Name,
            Description: Description || null,
            IsPublic: Number(IsPublic) ? 1 : 0,
            IsDeleted: 0,
            IsLikedSongs: 0,
            cover_media_id: null
          }));
        } catch (err) {
          console.error("Error parsing POST /playlists:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // PUT /playlists/:id → update (disallow changing IsLikedSongs)
    // ─────────────────────────────────────────────────────────────
    if (method === "PUT" && /^\/playlists\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/")[2]);

      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const fields = JSON.parse(body || "{}");
          const validCols = ["ListenerID", "ArtistID", "Name", "Description", "IsPublic", "cover_media_id"];

          // Prevent attempts to alter IsLikedSongs or IsDeleted directly here
          if ("IsLikedSongs" in fields) delete fields.IsLikedSongs;
          if ("IsDeleted" in fields) delete fields.IsDeleted;

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

    // ─────────────────────────────────────────────────────────────
    // DELETE /playlists/:id → soft delete
    // (Protect liked-songs playlist from deletion)
    // ─────────────────────────────────────────────────────────────
    if (method === "DELETE" && /^\/playlists\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/")[2]);

      // block deleting the "Liked Songs" playlist
      const [chk] = await db.query(
        `SELECT COALESCE(IsLikedSongs,0) AS IsLikedSongs FROM Playlist WHERE PlaylistID = ?`,
        [id]
      );
      if (chk?.[0]?.IsLikedSongs) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Cannot delete Liked Songs playlist" }));
        return;
      }

      const [result] = await db.query(
        `UPDATE Playlist SET IsDeleted = 1 WHERE PlaylistID = ?`,
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

    // Fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling playlist routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
