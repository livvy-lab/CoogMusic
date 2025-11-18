import db from "../db.js";
import { parse } from "url";

export async function handleAdminSongReport(req, res) {
  try {
    const { query } = parse(req.url, true);
    const minPlays = Number(query.minPlays) || 0;
    const minLikes = Number(query.minLikes) || 0;
    const minListeners = Number(query.minListeners) || 0;
    const activeSinceDays = Number(query.activeSinceDays) || 0;

    let activeSinceDate = null;
    if (activeSinceDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() - activeSinceDays);
      activeSinceDate = d.toISOString().slice(0, 10);
    }

    let sql = `
      SELECT
        v.SongID,
        s.Title AS Title,
        a.ArtistID,
        a.ArtistName AS ArtistName,
        v.total_plays,
        v.unique_listeners,
        COALESCE(lk.likes_count, 0) AS likes,
        v.total_ms_played,
        v.listen_events,
        v.total_listen_duration,
        v.first_played_at,
        v.last_played_at
      FROM vw_song_performance v
      JOIN Song s
        ON s.SongID = v.SongID
      LEFT JOIN Song_Artist sa
        ON sa.SongID = s.SongID
       AND sa.IsDeleted = 0
      LEFT JOIN Artist a
        ON a.ArtistID = sa.ArtistID
      LEFT JOIN (
        SELECT
          SongID,
          COUNT(DISTINCT ListenerID) AS likes_count
        FROM Liked_Song
        WHERE IsLiked = 1
        GROUP BY SongID
      ) AS lk
        ON lk.SongID = v.SongID
      WHERE v.total_plays >= ?
        AND COALESCE(lk.likes_count, 0) >= ?
        AND v.unique_listeners >= ?
    `;
    const params = [minPlays, minLikes, minListeners];

    if (activeSinceDate) {
      sql += ` AND v.last_played_at >= ?`;
      params.push(activeSinceDate);
    }

    sql += ` ORDER BY v.total_plays DESC LIMIT 200`;

    const [rows] = await db.query(sql, params);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rows));
  } catch (err) {
    console.error("Error fetching song performance report:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
