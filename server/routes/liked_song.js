// server/routes/liked_song.js
import db from "../db.js";
import { parse } from "url";

export async function handleLikedSongRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // ✅ CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // =======================================================
    // 🔹 GET /listeners/:id/liked_songs
    // =======================================================
    if (/^\/listeners\/\d+\/liked_songs$/.test(pathname) && method === "GET") {
      const listenerId = Number(pathname.split("/")[2]);

const [rows] = await db.query(`
  SELECT
    s.SongID,
    s.Title,
    s.DurationSeconds,
    s.ReleaseDate,
    COALESCE(al.Title, 'Unknown Album') AS Album,
    GROUP_CONCAT(DISTINCT ar.ArtistName ORDER BY ar.ArtistName SEPARATOR ', ') AS ArtistName,
    ls.LikedDate
  FROM Liked_Song ls
  JOIN Song s ON ls.SongID = s.SongID
  LEFT JOIN Album_Track at ON s.SongID = at.SongID
  LEFT JOIN Album al ON at.AlbumID = al.AlbumID
  LEFT JOIN Song_Artist sa ON s.SongID = sa.SongID
  LEFT JOIN Artist ar ON sa.ArtistID = ar.ArtistID
  WHERE ls.ListenerID = ?
  GROUP BY s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate, al.Title, ls.LikedDate
  ORDER BY ls.LikedDate DESC;
`, [listenerId]);




      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // =======================================================
    // 🔹 POST /listeners/:id/liked_songs/toggle
    // Body: { songId: number }
    // =======================================================
    if (/^\/listeners\/\d+\/liked_songs\/toggle$/.test(pathname) && method === "POST") {
      const listenerId = Number(pathname.split("/")[2]);
      console.log(`🎵 [LIKED_SONG] Toggle request - ListenerID: ${listenerId}, Path: ${pathname}`);
      let body = "";

      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { songId } = JSON.parse(body || "{}");
          console.log(`🎵 [LIKED_SONG] SongID: ${songId}`);
          if (!songId) {
            console.log("❌ [LIKED_SONG] Missing songId in request body");
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing songId" }));
            return;
          }

          // Check if song already liked
          console.log(`🔍 [LIKED_SONG] Checking if song exists: ListenerID=${listenerId}, SongID=${songId}`);
          const [exists] = await db.query(
            "SELECT * FROM Liked_Song WHERE ListenerID = ? AND SongID = ?",
            [listenerId, songId]
          );
          console.log(`🔍 [LIKED_SONG] Exists check result:`, exists);

          if (exists.length > 0) {
            // Unlike (delete)
            console.log(`❌ [LIKED_SONG] Deleting like - ListenerID=${listenerId}, SongID=${songId}`);
            await db.query(
              "DELETE FROM Liked_Song WHERE ListenerID = ? AND SongID = ?",
              [listenerId, songId]
            );
            console.log(`✅ [LIKED_SONG] Successfully deleted like`);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ liked: false }));
          } else {
            // Like (insert)
            console.log(`➕ [LIKED_SONG] Inserting like - ListenerID=${listenerId}, SongID=${songId}`);
            const result = await db.query(
              "INSERT INTO Liked_Song (ListenerID, SongID, LikedDate) VALUES (?, ?, CURDATE())",
              [listenerId, songId]
            );
            console.log(`✅ [LIKED_SONG] Successfully inserted like, result:`, result);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ liked: true }));
          }
        } catch (err) {
          console.error("❌ [LIKED_SONG] Error toggling liked song:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // =======================================================
    // ❌ Fallback
    // =======================================================
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("❌ Error in handleLikedSongRoutes:", err.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}
