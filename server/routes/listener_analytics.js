import db from "../db.js";
import { parse } from "url";

export async function handleListenerAnalyticsRoutes(req, res) {
  const url = parse(req.url, true);
  const match = url.pathname.match(/^\/analytics\/listener\/(\d+)\/(summary|init)/);
  if (!match) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid analytics endpoint" }));
    return;
  }
  const listenerId = match[1];
  const route = match[2];

  if (route === "init") {
    try {
      const [[{ firstListenDate }]] = await db.query(`
        SELECT MIN(LH.ListenedDate) as firstListenDate 
        FROM Listen_History LH
        WHERE LH.ListenerID = ?
      `, [listenerId]);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ firstListenDate }));
      return;

    } catch (e) {
      console.error("Listener init error", e);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Server error" }));
      return;
    }
  }

  if (route === "summary") {
    const {
      startDate, endDate,
      song = '', album = '', artist = '', genre = '',
      sort = 'ListenedDate', order = 'desc'
    } = url.query;

    const sortCols = {
      ListenedDate: 'LH.ListenedDate',
      songTitle: 'S.Title',
      artist: 'artist',
      album: 'album',
      genre: 'genre',
      liked: 'liked',
      streams: 'streams'
    };
    const orderCols = { asc: "ASC", desc: "DESC" };
    const sortSQL = sortCols[sort] || 'LH.ListenedDate';
    const orderSQL = orderCols[order] || 'DESC';

    try {
      const [[{ totalPlayed = 0 }]] = await db.query(
        `SELECT COUNT(*) AS totalPlayed FROM Listen_History WHERE ListenerID = ? AND (? IS NULL OR ListenedDate >= ?) AND (? IS NULL OR ListenedDate <= ?)`,
        [listenerId, startDate, startDate, endDate, endDate]
      );
      const [[{ totalLikes = 0 }]] = await db.query(
        `SELECT COUNT(*) AS totalLikes FROM Liked_Song WHERE ListenerID = ? AND (? IS NULL OR LikedDate >= ?) AND (? IS NULL OR LikedDate <= ?)`,
        [listenerId, startDate, startDate, endDate, endDate]
      );

      const [[topArtist = {}]] = await db.query(`
        SELECT AR.ArtistName, COUNT(*) as playCount
        FROM Listen_History LH
        JOIN Song_Artist SA ON LH.SongID = SA.SongID
        JOIN Artist AR ON SA.ArtistID = AR.ArtistID
        WHERE LH.ListenerID = ? AND (? IS NULL OR LH.ListenedDate >= ?) AND (? IS NULL OR LH.ListenedDate <= ?)
        GROUP BY AR.ArtistID ORDER BY playCount DESC LIMIT 1
      `, [listenerId, startDate, startDate, endDate, endDate]);

      const [[topGenre = {}]] = await db.query(`
        SELECT G.Name, COUNT(*) as playCount
        FROM Listen_History LH
        JOIN Song S ON LH.SongID = S.SongID
        JOIN Genre G ON S.GenreID = G.GenreID
        WHERE LH.ListenerID = ? AND (? IS NULL OR LH.ListenedDate >= ?) AND (? IS NULL OR LH.ListenedDate <= ?)
        GROUP BY G.GenreID ORDER BY playCount DESC LIMIT 1
      `, [listenerId, startDate, startDate, endDate, endDate]);

      const [albums] = await db.query(
        `SELECT DISTINCT Alb.AlbumID, Alb.Title FROM Album Alb JOIN Album_Track AT ON Alb.AlbumID = AT.AlbumID JOIN Listen_History LH ON LH.SongID = AT.SongID WHERE LH.ListenerID = ? ORDER BY Alb.Title`,
        [listenerId]
      );
      const [artists] = await db.query(
        `SELECT DISTINCT AR.ArtistID, AR.ArtistName FROM Artist AR JOIN Song_Artist SA ON AR.ArtistID = SA.ArtistID JOIN Listen_History LH ON LH.SongID = SA.SongID WHERE LH.ListenerID = ? ORDER BY AR.ArtistName`,
        [listenerId]
      );
      const [genres] = await db.query(
        `SELECT DISTINCT G.GenreID, G.Name FROM Genre G JOIN Song S ON G.GenreID = S.GenreID JOIN Listen_History LH ON LH.SongID = S.SongID WHERE LH.ListenerID = ? ORDER BY G.Name`,
        [listenerId]
      );

      const [listens] = await db.query(`
        SELECT
          LH.ListenedDate, S.Title AS songTitle,
          GROUP_CONCAT(DISTINCT AR.ArtistName ORDER BY AR.ArtistName SEPARATOR ', ') AS artist,
          COALESCE(Alb.Title, '-') AS album,
          GROUP_CONCAT(DISTINCT G.Name ORDER BY G.Name SEPARATOR ', ') AS genre,
          MAX(CASE WHEN LS.ListenerID IS NULL THEN 0 ELSE 1 END) AS liked,
          COUNT(LH.EventID) AS streams
        FROM Listen_History LH
        JOIN Song S ON LH.SongID = S.SongID
        LEFT JOIN Song_Artist SA ON S.SongID = SA.SongID
        LEFT JOIN Artist AR ON SA.ArtistID = AR.ArtistID
        LEFT JOIN Album_Track AT ON S.SongID = AT.SongID
        LEFT JOIN Album Alb ON AT.AlbumID = Alb.AlbumID
        LEFT JOIN Genre G ON S.GenreID = G.GenreID
        LEFT JOIN Liked_Song LS ON S.SongID = LS.SongID AND LS.ListenerID = LH.ListenerID
        WHERE LH.ListenerID = ?
          AND (? IS NULL OR LH.ListenedDate >= ?)
          AND (? IS NULL OR LH.ListenedDate <= ?)
          ${album ? 'AND Alb.AlbumID = ?' : ''}
          ${artist ? 'AND AR.ArtistID = ?' : ''}
          ${genre ? 'AND G.GenreID = ?' : ''}
          ${song ? 'AND S.Title LIKE ?' : ''}
        GROUP BY LH.ListenedDate, S.SongID, S.Title, Alb.Title
        ORDER BY ${sortSQL} ${orderSQL}
      `,
        [listenerId, startDate, startDate, endDate, endDate]
          .concat(album ? [album] : [])
          .concat(artist ? [artist] : [])
          .concat(genre ? [genre] : [])
          .concat(song ? [`%${song}%`] : [])
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        totals: [
          { label: "Total Streamed", value: totalPlayed },
          { label: "Total Likes", value: totalLikes },
          { label: "Top Artist", value: topArtist.ArtistName || "N/A" },
          { label: "Top Genre", value: topGenre.Name || "N/A" },
        ],
        albums,
        artists,
        genres,
        listens
      }));
    } catch (err) {
      console.error("Listener analytics error", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
}