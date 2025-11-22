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

    console.log('Artist Analytics Query Params:', { startDate, endDate, sort, order, album, song });

    // Convert to proper datetime format for SQL comparison
    const startDateTime = startDate ? `${startDate} 00:00:00` : '';
    const endDateTime = endDate ? `${endDate} 23:59:59` : null;

    console.log('Converted DateTime:', { startDateTime, endDateTime });

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
      // A. TOTALS
      const [[{ totalStreams = 0 }]] = await db.query(`
        SELECT COUNT(*) AS totalStreams 
        FROM Play P
        JOIN Song S ON P.SongID = S.SongID
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        WHERE SA.ArtistID = ?
          AND P.MsPlayed >= ?
          AND P.IsDeleted = 0
          AND S.IsDeleted = 0
          AND (? = '' OR P.PlayedAt >= ?) 
          AND (? IS NULL OR P.PlayedAt <= ?)
      `, [artistId, STREAM_MS_THRESHOLD, startDateTime, startDateTime, endDateTime, endDateTime]);
      
      const [[{ totalLikes = 0 }]] = await db.query(`
        SELECT COUNT(*) AS totalLikes 
        FROM Liked_Song LS
        JOIN Song S ON LS.SongID = S.SongID
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        WHERE SA.ArtistID = ?
          AND S.IsDeleted = 0
      `, [artistId]);
      
      const [[{ totalReleases = 0 }]] = await db.query(`
        SELECT COUNT(DISTINCT S.SongID) AS totalReleases 
        FROM Song S
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        WHERE SA.ArtistID = ? AND S.IsDeleted = 0
      `, [artistId]);

      // B. ALBUM LIST (For Dropdown) -- FIXED HERE
      const [albums] = await db.query(`
        SELECT DISTINCT Alb.AlbumID, Alb.Title 
        FROM Album Alb
        JOIN Album_Artist AA ON Alb.AlbumID = AA.AlbumID
        WHERE AA.ArtistID = ? 
          AND Alb.IsDeleted = 0 -- Added this check
        ORDER BY Alb.Title
      `, [artistId]);

      // C. DETAILED SONG PERFORMANCE
      const [songs] = await db.query(`
        SELECT
          S.SongID,
          S.Title AS songTitle,
          COALESCE(Alb.Title, 'Single') AS album,
          S.ReleaseDate AS releaseDate,
          COUNT(CASE 
            WHEN P.PlayID IS NOT NULL 
             AND P.MsPlayed >= ?
             AND P.IsDeleted = 0
             AND (? = '' OR P.PlayedAt >= ?) 
             AND (? IS NULL OR P.PlayedAt <= ?)
            THEN 1 
            ELSE NULL 
          END) AS totalStreams,
          COUNT(
            DISTINCT CASE 
              WHEN P.PlayID IS NOT NULL 
                AND P.MsPlayed >= ?
                AND P.IsDeleted = 0
                AND (? = '' OR P.PlayedAt >= ?) 
                AND (? IS NULL OR P.PlayedAt <= ?)
              THEN P.ListenerID 
              ELSE NULL 
            END
          ) AS uniqueListeners,
          (SELECT COUNT(*) FROM Liked_Song LS WHERE LS.SongID = S.SongID AND LS.IsLiked = 1) AS totalLikes,
          (SELECT COUNT(*) FROM Playlist_Track PT WHERE PT.SongID = S.SongID) AS playlistAdds,
          
          MIN(
            CASE 
              WHEN P.MsPlayed >= ? AND P.IsDeleted = 0 
                AND (? = '' OR P.PlayedAt >= ?) 
                AND (? IS NULL OR P.PlayedAt <= ?)
              THEN P.PlayedAt 
              ELSE NULL 
            END
          ) AS firstPlayedAt,

          MAX(
            CASE 
              WHEN P.MsPlayed >= ? AND P.IsDeleted = 0 
                AND (? = '' OR P.PlayedAt >= ?) 
                AND (? IS NULL OR P.PlayedAt <= ?)
              THEN P.PlayedAt 
              ELSE NULL 
            END
          ) AS lastPlayedAt,

          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'listenerId', LS.ListenerID,
                'username', AI_LIKE.Username
              )
            )
            FROM Liked_Song LS
            JOIN Listener L_LIKE ON LS.ListenerID = L_LIKE.ListenerID
            JOIN AccountInfo AI_LIKE ON L_LIKE.AccountID = AI_LIKE.AccountID
            WHERE LS.SongID = S.SongID
              AND LS.IsLiked = 1
          ) AS likedListeners,

          JSON_ARRAYAGG(
            CASE
              WHEN P.PlayID IS NOT NULL
                AND P.MsPlayed >= ?
                AND P.IsDeleted = 0
                AND (? = '' OR P.PlayedAt >= ?) 
                AND (? IS NULL OR P.PlayedAt <= ?)
              THEN JSON_OBJECT(
                'playId', P.PlayID,
                'listenerId', P.ListenerID,
                'username', AI.Username,
                'playedAt', P.PlayedAt
              )
              ELSE NULL
            END
          ) AS streamDetails

        FROM Song S
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        LEFT JOIN Album_Track AT ON S.SongID = AT.SongID
        LEFT JOIN Album Alb ON AT.AlbumID = Alb.AlbumID
        LEFT JOIN Play P ON S.SongID = P.SongID
        LEFT JOIN Listener L ON P.ListenerID = L.ListenerID
        LEFT JOIN AccountInfo AI ON L.AccountID = AI.AccountID
        WHERE SA.ArtistID = ?
          AND S.IsDeleted = 0
          AND (? = '' OR S.ReleaseDate >= ?)
          AND (? IS NULL OR S.ReleaseDate <= ?)
          ${album ? "AND Alb.AlbumID = ?" : ""}
          ${song ? "AND S.Title LIKE ?" : ""}
        GROUP BY S.SongID, S.Title, Alb.Title, S.ReleaseDate
        ORDER BY ${sortSQL} ${orderSQL}
      `, 
        [
          STREAM_MS_THRESHOLD, startDateTime, startDateTime, endDateTime, endDateTime,
          STREAM_MS_THRESHOLD, startDateTime, startDateTime, endDateTime, endDateTime,
          STREAM_MS_THRESHOLD, startDateTime, startDateTime, endDateTime, endDateTime,
          STREAM_MS_THRESHOLD, startDateTime, startDateTime, endDateTime, endDateTime,
          STREAM_MS_THRESHOLD, startDateTime, startDateTime, endDateTime, endDateTime,
          artistId,
          startDate || '', startDate || '1900-01-01',
          endDate, endDate
        ]
          .concat(album ? [album] : [])
          .concat(song ? [`%${song}%`] : [])
      );

      res.end(JSON.stringify({
        totals: [
          { label: "Total Streams", value: totalStreams },
          { label: "Total Likes", value: totalLikes },
          { label: "Total Releases", value: totalReleases },
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