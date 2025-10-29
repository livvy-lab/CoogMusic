// server/routes/likes_pins.js
import db from "../db.js";

/**
 * Unified router:
 *  - GET  /songs/status?listenerId=&ids=1,2,3       → { favorites: number[], pinnedSongId: number|null }
 *  - POST /likes    { listenerId, songId }          → like a song
 *  - DELETE /likes  { listenerId, songId }          → unlike a song
 *  - POST /pin      { listenerId, songId }          → pin a song
 *  - DELETE /pin    { listenerId }                  → unpin song
 *
 * Favorite Artists (join table ListenerArtistPin):
 *  - GET    /listeners/:listenerId/pins/artists
 *  - POST   /listeners/:listenerId/pins/artists     { artistId }  (max 3)
 *  - DELETE /listeners/:listenerId/pins/artists/:artistId
 *
 * Pinned Playlist (must be public; cannot be Liked Songs):
 *  - GET    /listeners/:listenerId/pins/playlist
 *  - POST   /listeners/:listenerId/pins/playlist    { playlistId }
 *  - DELETE /listeners/:listenerId/pins/playlist
 */
export async function handleLikesPins(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname.replace(/\/+$/, ""); // strip trailing slashes
  const m = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (m === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const send = (status, body) => {
    if (!res.writableEnded) {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    }
  };

  try {
    // ───────────────────────────────────────────────
    // SONG likes + pinned song
    // ───────────────────────────────────────────────
    if (p === "/songs/status" && m === "GET") {
      const listenerId = Number(url.searchParams.get("listenerId"));
      const ids = (url.searchParams.get("ids") || "")
        .split(",").map(s => s.trim()).filter(Boolean).map(Number);

      if (!listenerId) return send(200, { favorites: [], pinnedSongId: null });

      let favorites = [];
      if (ids.length) {
        const [rows] = await db.query(
          `SELECT SongID FROM Liked_Song
           WHERE ListenerID = ? AND SongID IN (${ids.map(() => "?").join(",")})`,
          [listenerId, ...ids]
        );
        favorites = rows.map(r => r.SongID);
      }

      const [pinRow] = await db.query(
        `SELECT PinnedSongID FROM Listener WHERE ListenerID = ?`,
        [listenerId]
      );
      const pinnedSongId = pinRow?.[0]?.PinnedSongID ?? null;

      return send(200, { favorites, pinnedSongId });
    }

    if (p === "/likes" && (m === "POST" || m === "DELETE")) {
      let body = ""; req.on("data", c => body += c);
      req.on("end", async () => {
        try {
          const { listenerId, songId } = JSON.parse(body || "{}");
          if (!listenerId || !songId) return send(400, { error: "listenerId and songId required" });

          if (m === "POST") {
            await db.query(
              `INSERT IGNORE INTO Liked_Song (ListenerID, SongID, LikedDate)
               VALUES (?, ?, CURRENT_DATE())`,
              [listenerId, songId]
            );
          } else {
            await db.query(
              `DELETE FROM Liked_Song
               WHERE ListenerID = ? AND SongID = ?`,
              [listenerId, songId]
            );
          }
          return send(200, { ok: true });
        } catch {
          return send(400, { error: "BAD_JSON" });
        }
      });
      return;
    }

    if (p === "/pin" && (m === "POST" || m === "DELETE")) {
      let body = ""; req.on("data", c => body += c);
      req.on("end", async () => {
        try {
          const { listenerId, songId } = JSON.parse(body || "{}");
          if (!listenerId) return send(400, { error: "listenerId required" });

          if (m === "POST") {
            if (!songId) return send(400, { error: "songId required" });
            await db.query(
              `UPDATE Listener SET PinnedSongID = ? WHERE ListenerID = ?`,
              [songId, listenerId]
            );
          } else {
            await db.query(
              `UPDATE Listener SET PinnedSongID = NULL WHERE ListenerID = ?`,
              [listenerId]
            );
          }
          return send(200, { ok: true });
        } catch {
          return send(400, { error: "BAD_JSON" });
        }
      });
      return;
    }

    // ───────────────────────────────────────────────
    // FAVORITE ARTISTS (join table)
    // ───────────────────────────────────────────────

    // GET pinned artists
    let mList = p.match(/^\/listeners\/(\d+)\/pins\/artists$/);
    if (m === "GET" && mList) {
      const listenerId = Number(mList[1]);

      const [rows] = await db.query(
        `SELECT a.ArtistID, a.ArtistName, a.PFP, a.Bio, lap.CreatedAt
         FROM ListenerArtistPin lap
         JOIN Artist a ON a.ArtistID = lap.ArtistID
         WHERE lap.ListenerID = ? AND IFNULL(a.IsDeleted, 0) = 0
         ORDER BY lap.CreatedAt DESC`,
        [listenerId]
      );

      return send(200, rows); // [] if none
    }

    // POST pin artist (max 3)
    let mPost = p.match(/^\/listeners\/(\d+)\/pins\/artists$/);
    if (m === "POST" && mPost) {
      const listenerId = Number(mPost[1]);

      let body = ""; req.on("data", c => body += c);
      req.on("end", async () => {
        try {
          const { artistId } = JSON.parse(body || "{}");
          if (!artistId) return send(400, { error: "artistId required" });

          const [cntRows] = await db.query(
            `SELECT COUNT(*) AS c FROM ListenerArtistPin WHERE ListenerID = ?`,
            [listenerId]
          );
          if ((cntRows?.[0]?.c ?? 0) >= 3) return send(409, { error: "PIN_LIMIT_REACHED" });

          await db.query(
            `INSERT IGNORE INTO ListenerArtistPin (ListenerID, ArtistID)
             VALUES (?, ?)`,
            [listenerId, Number(artistId)]
          );

          return send(201, { ok: true });
        } catch (e) {
          if (e?.code === "ER_SIGNAL_EXCEPTION" || e?.errno === 1644) {
            return send(409, { error: "PIN_LIMIT_REACHED" });
          }
          return send(400, { error: "BAD_JSON" });
        }
      });
      return;
    }

    // DELETE unpin artist
    let mDel = p.match(/^\/listeners\/(\d+)\/pins\/artists\/(\d+)$/);
    if (m === "DELETE" && mDel) {
      const listenerId = Number(mDel[1]);
      const artistId = Number(mDel[2]);

      await db.query(
        `DELETE FROM ListenerArtistPin
         WHERE ListenerID = ? AND ArtistID = ?`,
        [listenerId, artistId]
      );

      return send(200, { ok: true });
    }

    // ───────────────────────────────────────────────
    // PINNED PLAYLIST (public only; never IsLikedSongs)
    // ───────────────────────────────────────────────

    // GET pinned playlist
    let mpGet = p.match(/^\/listeners\/(\d+)\/pins\/playlist$/);
    if (m === "GET" && mpGet) {
      const listenerId = Number(mpGet[1]);

      const [r] = await db.query(
        `SELECT PinnedPlaylistID FROM Listener WHERE ListenerID = ?`,
        [listenerId]
      );
      const pid = r?.[0]?.PinnedPlaylistID ?? null;
      if (!pid) return send(200, null);

      const [rows] = await db.query(
        `SELECT
           p.PlaylistID, p.ListenerID, p.ArtistID, p.Name, p.Description,
           p.IsPublic, p.IsDeleted, COALESCE(p.IsLikedSongs,0) AS IsLikedSongs, p.cover_media_id
         FROM Playlist p
         WHERE p.PlaylistID = ? AND IFNULL(p.IsDeleted,0)=0`,
        [pid]
      );
      const playlist = rows?.[0] ?? null;
      return send(200, playlist);
    }

    // POST pin playlist (validate public, not deleted, not IsLikedSongs)
    let mpPost = p.match(/^\/listeners\/(\d+)\/pins\/playlist$/);
    if (m === "POST" && mpPost) {
      const listenerId = Number(mpPost[1]);

      let body = ""; req.on("data", c => body += c);
      req.on("end", async () => {
        try {
          const { playlistId } = JSON.parse(body || "{}");
          if (!playlistId) return send(400, { error: "playlistId required" });

          const [rows] = await db.query(
            `SELECT PlaylistID, IsPublic, IsDeleted, COALESCE(IsLikedSongs,0) AS IsLikedSongs
             FROM Playlist
             WHERE PlaylistID = ?`,
            [playlistId]
          );
          const pl = rows?.[0];

          if (!pl || Number(pl.IsDeleted) === 1 || Number(pl.IsPublic) !== 1) {
            return send(404, { error: "NOT_FOUND_OR_PRIVATE" });
          }
          if (Number(pl.IsLikedSongs) === 1) {
            return send(400, { error: "CANNOT_PIN_LIKED_SONGS" });
          }

          await db.query(
            `UPDATE Listener SET PinnedPlaylistID = ? WHERE ListenerID = ?`,
            [playlistId, listenerId]
          );
          return send(201, { ok: true });
        } catch {
          return send(400, { error: "BAD_JSON" });
        }
      });
      return;
    }

    // DELETE unpin playlist
    let mpDel = p.match(/^\/listeners\/(\d+)\/pins\/playlist$/);
    if (m === "DELETE" && mpDel) {
      const listenerId = Number(mpDel[1]);
      await db.query(
        `UPDATE Listener SET PinnedPlaylistID = NULL WHERE ListenerID = ?`,
        [listenerId]
      );
      return send(200, { ok: true });
    }

    // No match → let other routers try
    return;
  } catch (e) {
    console.error("likes_pins route error:", e?.sqlMessage || e);
    return send(500, { error: "Server error" });
  }
}
