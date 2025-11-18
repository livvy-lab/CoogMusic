import db from "../db.js";
import { parse } from "url";

const STREAM_MS_THRESHOLD = 30000; // 30s threshold

export async function handleArtistAnalyticsRoutes(req, res) {
  const url = parse(req.url, true);
  const match = url.pathname.match(/^\/analytics\/artist\/(\d+)\/(summary|init)/);
  
  if (!match) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid endpoint" }));
    return;
  }
  
  const artistId = match[1];
  const route = match[2];

  res.setHeader("Content-Type", "application/json");

  // 1. INIT: Get First Release Date
  if (route === "init") {
    try {
      const [[{ firstReleaseDate }]] = await db.query(`
        SELECT MIN(S.ReleaseDate) as firstReleaseDate 
        FROM Song S
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        WHERE SA.ArtistID = ? AND S.IsDeleted = 0
      `, [artistId]);

      res.end(JSON.stringify({ firstReleaseDate }));
      return;
    } catch (e) {
      console.error("Artist init error", e);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Server error" }));
      return;
    }
  }

  // 2. SUMMARY: Get Stats & Table Data
  if (route === "summary") {
    const { startDate, endDate, sort = "totalStreams", order = "desc", album = "", song = "" } = url.query;

    const endDateTime = endDate ? `${endDate} 23:59:59` : new Date();

    const sortCols = {
      songTitle: "S.Title",
      album: "album",
      releaseDate: "S.ReleaseDate",
      totalStreams: "totalStreams",
      totalLikes: "totalLikes",
      playlistAdds: "playlistAdds"
    };
    const sortSQL = sortCols[sort] || "totalStreams";
    const orderSQL = order === "asc" ? "ASC" : "DESC";

    try {
      // --- FIX A: STRICTER TOTALS QUERIES ---
      
      // 1. Total Streams (Respects Date Range + IsDeleted Checks)
      const [[{ totalStreams = 0 }]] = await db.query(`
        SELECT COUNT(*) AS totalStreams 
        FROM Play P
        JOIN Song S ON P.SongID = S.SongID       -- Join Song to check IsDeleted
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        WHERE SA.ArtistID = ?
          AND P.MsPlayed >= ?                    -- 30s Threshold
          AND P.IsDeleted = 0                    -- Exclude deleted plays
          AND S.IsDeleted = 0                    -- Exclude deleted songs
          AND (? IS NULL OR P.PlayedAt >= ?) 
          AND (? IS NULL OR P.PlayedAt <= ?)
      `, [artistId, STREAM_MS_THRESHOLD, startDate, startDate, endDateTime, endDateTime]);
      
      // 2. Total Likes (Lifetime, excludes deleted songs)
      // Note: Removed Date Range here to show TRUE total profile likes
      const [[{ totalLikes = 0 }]] = await db.query(`
        SELECT COUNT(*) AS totalLikes 
        FROM Liked_Song LS
        JOIN Song S ON LS.SongID = S.SongID
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        WHERE SA.ArtistID = ?
          AND S.IsDeleted = 0
      `, [artistId]);
      
      // 3. Total Releases (Lifetime, excludes deleted songs)
      const [[{ totalReleases = 0 }]] = await db.query(`
        SELECT COUNT(DISTINCT S.SongID) AS totalReleases 
        FROM Song S
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        WHERE SA.ArtistID = ? AND S.IsDeleted = 0
      `, [artistId]);

      // B. ALBUM LIST
      const [albums] = await db.query(`
        SELECT DISTINCT Alb.AlbumID, Alb.Title 
        FROM Album Alb
        JOIN Album_Artist AA ON Alb.AlbumID = AA.AlbumID
        WHERE AA.ArtistID = ? 
        ORDER BY Alb.Title
      `, [artistId]);

      // C. DETAILED SONG PERFORMANCE
      const [songs] = await db.query(`
        SELECT
          S.SongID,
          S.Title AS songTitle,
          COALESCE(Alb.Title, 'Single') AS album,
          S.ReleaseDate AS releaseDate,
          -- Streams (Period & Validated)
          COUNT(CASE 
            WHEN P.PlayID IS NOT NULL 
             AND P.MsPlayed >= ?
             AND P.IsDeleted = 0
             AND (? IS NULL OR P.PlayedAt >= ?) 
             AND (? IS NULL OR P.PlayedAt <= ?)
            THEN 1 
            ELSE NULL 
          END) AS totalStreams,
          -- Lifetime Likes
          (SELECT COUNT(*) FROM Liked_Song LS WHERE LS.SongID = S.SongID) AS totalLikes,
          -- Lifetime Playlist Adds
          (SELECT COUNT(*) FROM Playlist_Track PT WHERE PT.SongID = S.SongID) AS playlistAdds
        FROM Song S
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        LEFT JOIN Album_Track AT ON S.SongID = AT.SongID
        LEFT JOIN Album Alb ON AT.AlbumID = Alb.AlbumID
        LEFT JOIN Play P ON S.SongID = P.SongID
        WHERE SA.ArtistID = ?
          AND S.IsDeleted = 0
          ${album ? "AND Alb.AlbumID = ?" : ""}
          ${song ? "AND S.Title LIKE ?" : ""}
        GROUP BY S.SongID, S.Title, Alb.Title, S.ReleaseDate
        ORDER BY ${sortSQL} ${orderSQL}
      `, 
        [STREAM_MS_THRESHOLD, startDate, startDate, endDateTime, endDateTime, artistId]
          .concat(album ? [album] : [])
          .concat(song ? [`%${song}%`] : [])
      );

      res.end(JSON.stringify({
        totals: [
          { label: "Total Streams", value: totalStreams }, // Affected by Date Picker
          { label: "Total Likes", value: totalLikes },     // Lifetime
          { label: "Total Releases", value: totalReleases }, // Lifetime
        ],
        albums,
        songs
      }));

    } catch (err) {
      console.error("Artist analytics error", err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
}