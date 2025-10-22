import db from "../db.js";
import { parse } from "url";

export async function handleLikedSongRoutes(req, res) {
  const url = parse(req.url, true);
  const getAllMatch = url.pathname.match(/^\/listeners\/(\d+)\/liked_songs$/);
  const deleteMatch = url.pathname.match(/^\/listeners\/(\d+)\/liked_songs\/(\d+)$/);

  try {
    // return all liked songs for a specific listener
    if (req.method === "GET" && getAllMatch) {
      const listenerId = getAllMatch[1];
      
      // join with the Song table to get details about the songs
      const [rows] = await db.query(
        `SELECT s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate 
         FROM Liked_Song ls 
         JOIN Song s ON ls.SongID = s.SongID 
         WHERE ls.ListenerID = ?`,
        [listenerId]
      );
      
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // add a new liked song for a listener
    if (req.method === "POST" && getAllMatch) {
      const listenerId = getAllMatch[1];
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { SongID } = JSON.parse(body);
        if (!SongID) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required field: SongID" }));
          return;
        }

        // generate the current date for LikedDate
        const likedDate = new Date().toISOString().slice(0, 10);

        const [result] = await db.query(
          "INSERT INTO Liked_Song (ListenerID, SongID, LikedDate) VALUES (?, ?, ?)",
          [listenerId, SongID, likedDate]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ListenerID: listenerId,
          SongID,
          LikedDate: likedDate,
          message: "Song liked successfully"
        }));
      });
      return;
    }

    // remove a liked song from a listener's list
    if (req.method === "DELETE" && deleteMatch) {
      const listenerId = deleteMatch[1];
      const songId = deleteMatch[2];
      
      const [result] = await db.query(
        "DELETE FROM Liked_Song WHERE ListenerID = ? AND SongID = ?",
        [listenerId, songId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Liked song entry not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Song unliked successfully" }));
      return;
    }

    // fallback for unsupported routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Liked Song endpoint not found" }));

  } catch (err) {
    console.error("Liked Song route error:", err);
    // check for foreign key constraint errors (listener or song doesn't exist)
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "The specified ListenerID or SongID does not exist." }));
        return;
    }
    // check for duplicate entry errors
    if (err.code === 'ER_DUP_ENTRY') {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "This song has already been liked by the listener." }));
        return;
    }
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}