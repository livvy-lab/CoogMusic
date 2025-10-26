import db from "../db.js";
import { parse } from "url";

export async function handleListenHistoryRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // ---- LATEST SONGS FOR A LISTENER ----
    if (pathname === "/listen_history/latest" && method === "GET") {
      const id = Number(query.listenerId);
      const limit = Math.max(1, Math.min(50, Number(query.limit) || 3));

      if (!Number.isFinite(id) || id <= 0) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify([]));
        return;
      }

      // Query only valid columns; pull artist via subquery
      const sql = `
        SELECT
          lh.EventID,
          s.SongID,
          s.Title,
          (
            SELECT ar.ArtistName
            FROM Song_Artist sa
            JOIN Artist ar
              ON ar.ArtistID = sa.ArtistID
             AND ar.IsDeleted = 0
            WHERE sa.SongID = s.SongID
              AND sa.IsDeleted = 0
            ORDER BY CASE sa.Role WHEN 'Primary' THEN 0 ELSE 1 END, ar.ArtistID
            LIMIT 1
          ) AS Artist,
          lh.ListenedDate,
          lh.Duration
        FROM Listen_History lh
        JOIN Song s
          ON s.SongID = lh.SongID
         AND s.IsDeleted = 0
        WHERE lh.ListenerID = ?
          AND lh.IsDeleted = 0
        ORDER BY lh.ListenedDate DESC, lh.EventID DESC
        LIMIT ?
      `;

      const [rows] = await db.query(sql, [id, limit]);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows || []));
      return;
    }

    // ---- FALLBACK ----
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("listen_history route error:", err?.sqlMessage || err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
