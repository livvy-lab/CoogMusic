// server/routes/genre.js
import db from "../db.js";

const STREAM_MS_THRESHOLD = 0; // set to 30000 when using real msPlayed data

export async function handleGenreRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    // --- GET all genres (return both Name and GenreName for compatibility) ---
    if (method === "GET" && pathname === "/genres") {
      const [rows] = await db.query(
        `SELECT
           GenreID,
           Name,               -- legacy
           Name AS GenreName   -- new
         FROM Genre
         ORDER BY Name ASC`
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // --- GET a genre by ID with its songs ---
    if (method === "GET" && /^\/genres\/\d+\/songs\/?$/.test(pathname)) {
      const genreId = Number(pathname.split("/")[2]);

      const [[genre]] = await db.query(
        "SELECT GenreID, Name, Name AS GenreName FROM Genre WHERE GenreID = ?",
        [genreId]
      );
      if (!genre) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Genre not found" }));
        return;
      }

      const [songs] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.DurationSeconds,
          s.ReleaseDate,
          COALESCE(
            GROUP_CONCAT(DISTINCT a.ArtistName ORDER BY a.ArtistName SEPARATOR ', '),
            'Unknown Artist'
          ) AS ArtistName,
          GROUP_CONCAT(DISTINCT a.ArtistID ORDER BY a.ArtistName SEPARATOR ',') AS ArtistIDs,
          COALESCE(COUNT(p.PlayID), 0) AS Streams
        FROM Song s
        LEFT JOIN Song_Artist sa
          ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted, 0) = 0
        LEFT JOIN Artist a
          ON a.ArtistID = sa.ArtistID AND COALESCE(a.IsDeleted, 0) = 0
        LEFT JOIN Play p
          ON p.SongID = s.SongID
         AND p.IsDeleted = 0
         AND p.MsPlayed >= ?
        WHERE s.IsDeleted = 0
          AND s.GenreID = ?
        GROUP BY s.SongID
        ORDER BY s.SongID DESC
        `,
        [STREAM_MS_THRESHOLD, genreId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ genre, songs }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Genre endpoint not found" }));
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      res.writeHead(409, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "A genre with this name already exists." }));
      return;
    }
    console.error("Genre route error:", err?.sqlMessage || err?.message || err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
