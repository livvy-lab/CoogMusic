// routes/playlist_track.js
import db from "../db.js";
import { parse } from "url";

export async function handlePlaylistTrackRoutes(req, res) {
  const { pathname } = parse(req.url, true);
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
    // GET all rows (optionally filter by playlist)
    // /playlist_tracks            -> all mappings
    // /playlist_tracks?playlistId=123 -> only one playlist's tracks
    if (pathname === "/playlist_tracks" && method === "GET") {
      const { query } = parse(req.url, true);
      const { playlistId } = query;

      let rows;
      if (playlistId) {
        [rows] = await db.query(
          "SELECT * FROM Playlist_Track WHERE PlaylistID = ? ORDER BY TrackNumber ASC",
          [playlistId]
        );
      } else {
        [rows] = await db.query(
          "SELECT * FROM Playlist_Track ORDER BY PlaylistID ASC, TrackNumber ASC"
        );
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET a specific mapping by composite key:
    // /playlist_tracks/:playlistId/:songId
    if (pathname.startsWith("/playlist_tracks/") && method === "GET") {
      const parts = pathname.split("/"); // ["", "playlist_tracks", ":playlistId", ":songId"]
      if (parts.length === 4 && parts[2] && parts[3]) {
        const playlistId = parts[2];
        const songId = parts[3];

        const [rows] = await db.query(
          "SELECT * FROM Playlist_Track WHERE PlaylistID = ? AND SongID = ?",
          [playlistId, songId]
        );

        if (rows.length === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Playlist_Track entry not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows[0]));
        return;
      }
    }

    // POST create a new mapping
    // body: { PlaylistID, SongID, TrackNumber?, DateSongAdded? }
    if (pathname === "/playlist_tracks" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          let { PlaylistID, SongID, TrackNumber, DateSongAdded } = JSON.parse(body);

          if (!PlaylistID || !SongID) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required fields: PlaylistID and SongID" }));
            return;
          }

          // If TrackNumber wasn't provided, compute the next track number for the playlist
          try {
            if (TrackNumber === undefined || TrackNumber === null) {
              const [rows] = await db.query(
                "SELECT COALESCE(MAX(TrackNumber), 0) AS maxTrack FROM Playlist_Track WHERE PlaylistID = ?",
                [PlaylistID]
              );
              const maxTrack = rows?.[0]?.maxTrack ?? 0;
              TrackNumber = Number(maxTrack) + 1;
            }

            // Default DateSongAdded to now if not provided
            if (!DateSongAdded) DateSongAdded = new Date().toISOString().slice(0, 19).replace('T', ' ');

            const [result] = await db.query(
              `INSERT INTO Playlist_Track (PlaylistID, SongID, TrackNumber, DateSongAdded)
               VALUES (?, ?, ?, ?)`,
              [PlaylistID, SongID, TrackNumber, DateSongAdded]
            );

            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                PlaylistID,
                SongID,
                TrackNumber: TrackNumber,
                DateSongAdded: DateSongAdded,
              })
            );
          } catch (err) {
            // Handle duplicate composite key
            if (err && err.code === "ER_DUP_ENTRY") {
              res.writeHead(409, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "This song is already in that playlist" }));
              return;
            }
            console.error("DB error on POST /playlist_tracks:", err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Database error" }));
          }
        } catch (err) {
          console.error("Invalid JSON for POST /playlist_tracks:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // PUT update an existing mapping (composite key in path)
    // /playlist_tracks/:playlistId/:songId
    // body can include: TrackNumber, DateSongAdded (partial updates ok)
    if (pathname.startsWith("/playlist_tracks/") && method === "PUT") {
      const parts = pathname.split("/");
      if (parts.length === 4 && parts[2] && parts[3]) {
        const playlistId = parts[2];
        const songId = parts[3];

        let body = "";
        req.on("data", chunk => (body += chunk));
        req.on("end", async () => {
          try {
            const payload = JSON.parse(body);

            const validCols = ["TrackNumber", "DateSongAdded"];
            const updates = [];
            const params = [];

            for (const [key, value] of Object.entries(payload)) {
              if (validCols.includes(key)) {
                updates.push(`${key} = ?`);
                params.push(value);
              }
            }

            if (updates.length === 0) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "No valid fields provided to update" }));
              return;
            }

            params.push(playlistId, songId);

            const [result] = await db.query(
              `UPDATE Playlist_Track SET ${updates.join(", ")}
               WHERE PlaylistID = ? AND SongID = ?`,
              params
            );

            if (result.affectedRows === 0) {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Playlist_Track entry not found" }));
              return;
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                PlaylistID: playlistId,
                SongID: songId,
                message: "Playlist_Track updated successfully",
              })
            );
          } catch (err) {
            console.error("Invalid JSON for PUT /playlist_tracks/:playlistId/:songId:", err);
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON body" }));
          }
        });
        return;
      }
    }

    // DELETE hard delete by composite key
    // /playlist_tracks/:playlistId/:songId
    if (pathname.startsWith("/playlist_tracks/") && method === "DELETE") {
      const parts = pathname.split("/");
      if (parts.length === 4 && parts[2] && parts[3]) {
        const playlistId = parts[2];
        const songId = parts[3];

        const [result] = await db.query(
          "DELETE FROM Playlist_Track WHERE PlaylistID = ? AND SongID = ?",
          [playlistId, songId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Playlist_Track entry not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Deleted successfully" }));
        return;
      }
    }

    // fallback for paths this handler doesn't own
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling playlist_track routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
