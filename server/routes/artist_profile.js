// server/routes/artist_profile.js
import db from "../db.js";

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export async function handleArtistProfileRoutes(req, res) {
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // MATCHERS
  const mProfile = pathname.match(/^\/artists\/(\d+)\/profile$/);
  const mAbout   = pathname.match(/^\/artists\/(\d+)\/about$/);
  const mTop     = pathname.match(/^\/artists\/(\d+)\/top-tracks$/);
  const mDiscog  = pathname.match(/^\/artists\/(\d+)\/discography$/);

  try {
    // ------------------------------------------------------------
    // GET /artists/:id/profile
    // ------------------------------------------------------------
    if (method === "GET" && mProfile) {
      const artistId = mProfile[1];

      const [rows] = await db.query(
        `
        SELECT
          a.ArtistID,
          a.ArtistName,
          a.Bio,
          a.PFP,
          COALESCE(songs.SongCount, 0)       AS SongCount,
          COALESCE(follows.FollowerCount, 0) AS FollowerCount
        FROM Artist a
        LEFT JOIN (
          SELECT sa.ArtistID, COUNT(DISTINCT sa.SongID) AS SongCount
          FROM Song_Artist sa
          JOIN Song s ON s.SongID = sa.SongID AND s.IsDeleted = 0
          WHERE sa.IsDeleted = 0 AND sa.Role = 'Primary'
          GROUP BY sa.ArtistID
        ) songs ON songs.ArtistID = a.ArtistID
        LEFT JOIN (
          SELECT FollowingID, COUNT(*) AS FollowerCount
          FROM Follows
          WHERE FollowingType = 'Artist'
          GROUP BY FollowingID
        ) follows ON follows.FollowingID = a.ArtistID
        WHERE a.IsDeleted = 0 AND a.ArtistID = ?
        `,
        [artistId]
      );

      if (rows.length === 0) return json(res, 404, { error: "Artist not found" });

      const row = rows[0];
      row.Bio = row.Bio || "";
      row.PFP = row.PFP || null;

      return json(res, 200, row);
    }

    // ------------------------------------------------------------
    // GET /artists/:id/about
    // ------------------------------------------------------------
    if (method === "GET" && mAbout) {
      const artistId = mAbout[1];

      const [rows] = await db.query(
        `
        SELECT
          a.ArtistID,
          a.ArtistName,
          COALESCE(a.Bio, '') AS Bio,
          a.PFP
        FROM Artist a
        WHERE a.IsDeleted = 0 AND a.ArtistID = ?
        `,
        [artistId]
      );

      if (rows.length === 0) return json(res, 404, { error: "Artist not found" });

      const row = rows[0];

      return json(res, 200, {
        ArtistID: row.ArtistID,
        ArtistName: row.ArtistName,
        Bio: row.Bio,
        HasBio: row.Bio.trim().length > 0,
        PFP: row.PFP || null,
      });
    }

    // ------------------------------------------------------------
    // GET /artists/:id/top-tracks?limit=10
    // ------------------------------------------------------------
    if (method === "GET" && mTop) {
      const artistId = Number(mTop[1]);
      const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit")) || 10));

      const [rows] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.DurationSeconds,
          s.ReleaseDate,
          COALESCE(COUNT(lh.EventID), 0) AS StreamCount
        FROM Song s
        JOIN Song_Artist sa
          ON sa.SongID = s.SongID
         AND sa.ArtistID = ?
         AND sa.IsDeleted = 0
         AND sa.Role IN ('Primary','Featured')
        LEFT JOIN Listen_History lh
          ON lh.SongID = s.SongID
         AND lh.IsDeleted = 0
        WHERE s.IsDeleted = 0
        GROUP BY s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate
        ORDER BY StreamCount DESC, s.ReleaseDate DESC, s.SongID ASC
        LIMIT ?
        `,
        [artistId, limit]
      );

      return json(res, 200, {
        ArtistID: artistId,
        limit,
        tracks: rows.map(r => ({
          SongID: r.SongID,
          Title: r.Title,
          DurationSeconds: r.DurationSeconds,
          ReleaseDate: r.ReleaseDate,
          StreamCount: Number(r.StreamCount) || 0,
        })),
      });
    }

    // ------------------------------------------------------------
    // GET /artists/:id/discography
    // albums = all albums artist is on
    // singles = artist songs not on any album (no duplicates)
    // ------------------------------------------------------------
    if (method === "GET" && mDiscog) {
      const artistId = Number(mDiscog[1]);

      // Albums + track counts
      const [albums] = await db.query(
        `
        SELECT
          al.AlbumID,
          al.Title,
          al.ReleaseDate,
          COUNT(DISTINCT at2.SongID) AS TrackCount
        FROM Album al
        JOIN Album_Artist aa
          ON aa.AlbumID = al.AlbumID
         AND aa.ArtistID = ?
        LEFT JOIN Album_Track at2
          ON at2.AlbumID = al.AlbumID
        GROUP BY al.AlbumID, al.Title, al.ReleaseDate
        ORDER BY al.ReleaseDate DESC, al.AlbumID DESC
        `,
        [artistId]
      );

      // Singles (songs by artist not in any album)
      const [singles] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.ReleaseDate,
          s.DurationSeconds
        FROM Song s
        JOIN Song_Artist sa
          ON sa.SongID = s.SongID
         AND sa.ArtistID = ?
         AND sa.IsDeleted = 0
        LEFT JOIN Album_Track atx
          ON atx.SongID = s.SongID
        WHERE s.IsDeleted = 0
          AND atx.SongID IS NULL
        GROUP BY s.SongID, s.Title, s.ReleaseDate, s.DurationSeconds
        ORDER BY s.ReleaseDate DESC, s.SongID DESC
        `,
        [artistId]
      );

      return json(res, 200, {
        ArtistID: artistId,
        albums: albums.map(a => ({
          AlbumID: a.AlbumID,
          Title: a.Title,
          ReleaseDate: a.ReleaseDate,
          TrackCount: Number(a.TrackCount) || 0,
        })),
        singles: singles.map(s => ({
          SongID: s.SongID,
          Title: s.Title,
          ReleaseDate: s.ReleaseDate,
          DurationSeconds: s.DurationSeconds,
        })),
      });
    }

    // not matched
  } catch (err) {
    console.error("artist_profile route error:", err);
    return json(res, 500, { error: "Server error" });
  }
}
