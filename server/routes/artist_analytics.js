import db from "../db.js";
import { parse } from "url";

const STREAM_MS_THRESHOLD = 30000; // 30 seconds - industry standard for valid stream

export async function handleArtistAnalyticsRoutes(req, res) {
  const url = parse(req.url, true);
  const match = url.pathname.match(/^\/analytics\/artist\/(\d+)\/(summary|init)/);
  if (!match) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid analytics endpoint" }));
    return;
  }
  const artistId = match[1];
  const route = match[2];

  // fetches the artist's first release date for the filter default
  if (route === "init") {
    try {
      const [[{ firstReleaseDate }]] = await db.query(`
        SELECT MIN(S.ReleaseDate) as firstReleaseDate 
        FROM Song S
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        WHERE SA.ArtistID = ?
      `, [artistId]);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ firstReleaseDate }));
      return;

    } catch (e) {
      console.error("Artist init error", e);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Server error" }));
      return;
    }
  }

  if (route === "summary") {
    const { startDate, endDate, sort = "totalStreams", order = "desc", album = "", song = "" } = url.query;

    const sortCols = {
      songTitle: "S.Title",
      album: "album",
      releaseDate: "S.ReleaseDate",
      totalStreams: "totalStreams",
      totalLikes: "totalLikes",
      playlistAdds: "playlistAdds"
    };
    const orderCols = { asc: "ASC", desc: "DESC" };
    const sortSQL = sortCols[sort] || "totalStreams";
    const orderSQL = orderCols[order] || "DESC";

    try {
      const [[{ totalStreams = 0 }]] = await db.query(`
        SELECT COUNT(*) AS totalStreams 
        FROM Play P
        JOIN Song S ON P.SongID = S.SongID
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        WHERE SA.ArtistID = ?
          AND COALESCE(P.IsDeleted, 0) = 0
          AND COALESCE(S.IsDeleted, 0) = 0
          AND COALESCE(SA.IsDeleted, 0) = 0
          AND P.MsPlayed >= ?
          AND (? IS NULL OR DATE(P.PlayedAt) >= ?) 
          AND (? IS NULL OR DATE(P.PlayedAt) <= ?);
      `, [artistId, STREAM_MS_THRESHOLD, startDate, startDate, endDate, endDate]);
      
      const [[{ totalLikes = 0 }]] = await db.query(`
        SELECT COUNT(*) AS totalLikes FROM Liked_Song LS
        JOIN Song_Artist SA ON LS.SongID = SA.SongID
        WHERE SA.ArtistID = ?
          AND (? IS NULL OR LS.LikedDate >= ?) 
          AND (? IS NULL OR LS.LikedDate <= ?);
      `, [artistId, startDate, startDate, endDate, endDate]);
      
      const [[{ totalReleases = 0 }]] = await db.query(`
        SELECT COUNT(DISTINCT S.SongID) AS totalReleases FROM Song S
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        WHERE SA.ArtistID = ?
          AND (? IS NULL OR S.ReleaseDate >= ?) 
          AND (? IS NULL OR S.ReleaseDate <= ?);
      `, [artistId, startDate, startDate, endDate, endDate]);

      // Get album list for dropdown
      const [albums] = await db.query(`
        SELECT DISTINCT Alb.AlbumID, Alb.Title FROM Album Alb
        JOIN Album_Artist AA ON Alb.AlbumID = AA.AlbumID
        WHERE AA.ArtistID = ? ORDER BY Alb.Title
      `, [artistId]);

      // Performance Report query
      const [songs] = await db.query(`
        SELECT
          S.Title AS songTitle,
          COALESCE(Alb.Title, 'Single') AS album,
          S.ReleaseDate AS releaseDate,
          COUNT(DISTINCT CASE 
            WHEN (? IS NULL OR DATE(P.PlayedAt) >= ?) 
             AND (? IS NULL OR DATE(P.PlayedAt) <= ?)
             AND P.MsPlayed >= ?
            THEN P.PlayID 
            ELSE NULL 
          END) AS totalStreams,
          (SELECT COUNT(*) FROM Liked_Song LS WHERE LS.SongID = S.SongID) AS totalLikes,
          (SELECT COUNT(*) FROM Playlist_Track PT WHERE PT.SongID = S.SongID) AS playlistAdds
        FROM Song S
        JOIN Song_Artist SA ON S.SongID = SA.SongID
        LEFT JOIN Album_Track AT ON S.SongID = AT.SongID
        LEFT JOIN Album Alb ON AT.AlbumID = Alb.AlbumID
        LEFT JOIN Play P ON S.SongID = P.SongID AND COALESCE(P.IsDeleted, 0) = 0
        WHERE SA.ArtistID = ?
          AND COALESCE(S.IsDeleted, 0) = 0
          AND COALESCE(SA.IsDeleted, 0) = 0
          ${album ? "AND Alb.AlbumID = ?" : ""}
          ${song ? "AND S.Title LIKE ?" : ""}
        GROUP BY S.SongID, album, S.ReleaseDate
        ORDER BY ${sortSQL} ${orderSQL}
      `, 
        [startDate, startDate, endDate, endDate, STREAM_MS_THRESHOLD, artistId]
          .concat(album ? [album] : [])
          .concat(song ? [`%${song}%`] : [])
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        totals: [
          { label: "Total Streams", value: totalStreams },
          { label: "Total Likes", value: totalLikes },
          { label: "Total Releases", value: totalReleases },
        ],
        albums,
        songs
      }));
      return;
    } catch (err) {
      console.error("Artist analytics error", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
}