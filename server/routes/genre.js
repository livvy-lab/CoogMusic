// server/routes/genre.js
import db from "../db.js";

export async function handleGenreRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    // GET /genres -> list all genres
    if (method === "GET" && pathname === "/genres") {
      const [rows] = await db.query(
        "SELECT GenreID, Name AS GenreName FROM Genre"
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET /genres/:idOrName/songs
    const mSongs = pathname.match(/^\/genres\/([^/]+)\/songs\/?$/);
    if (method === "GET" && mSongs) {
      const raw = decodeURIComponent(mSongs[1]);
      const maybeId = Number(raw);

      // Resolve genre by ID or by Name (case-insensitive)
      let genre = null;
      if (Number.isFinite(maybeId) && maybeId > 0) {
        const [[g]] = await db.query(
          "SELECT GenreID, Name AS GenreName FROM Genre WHERE GenreID = ?",
          [maybeId]
        );
        genre = g || null;
      } else {
        const [[g]] = await db.query(
          "SELECT GenreID, Name AS GenreName FROM Genre WHERE LOWER(Name) = LOWER(?)",
          [raw]
        );
        genre = g || null;
      }

      if (!genre) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Genre not found" }));
        return;
      }

      // Songs + Artists + Stream totals
      const [songs] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.DurationSeconds,
          s.ReleaseDate,
          s.GenreID,
          COALESCE(
            GROUP_CONCAT(DISTINCT a.ArtistName ORDER BY a.ArtistName SEPARATOR ', '),
            'Unknown Artist'
          ) AS ArtistName,
          COALESCE(lh.Streams, 0) AS Streams
        FROM Song s
        LEFT JOIN Song_Artist sa
          ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
        LEFT JOIN Artist a
          ON a.ArtistID = sa.ArtistID AND COALESCE(a.IsDeleted,0)=0
        LEFT JOIN (
          SELECT SongID, COUNT(*) AS Streams
          FROM Listen_History
          WHERE COALESCE(IsDeleted,0)=0
          GROUP BY SongID
        ) lh ON lh.SongID = s.SongID
        WHERE COALESCE(s.IsDeleted,0)=0
          AND s.GenreID = ?
        GROUP BY s.SongID
        ORDER BY s.ReleaseDate DESC, s.SongID DESC
        `,
        [genre.GenreID]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ genre, songs }));
      return;
    }

    // 404 fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Genre endpoint not found" }));
  } catch (err) {
    console.error("Genre route error:", err?.sqlMessage || err?.message || err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
