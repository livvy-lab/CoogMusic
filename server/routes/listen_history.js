// server/routes/listen_history.js
import db from "../db.js";

export async function handleListenHistoryRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    if (pathname === "/listen_history/latest" && method === "GET") {
      const id = Number(url.searchParams.get("listenerId"));
      const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit")) || 3));

      if (!Number.isFinite(id) || id <= 0) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify([]));
        return;
      }

      const sql = `
        SELECT
          lh.EventID,
          s.SongID,
          s.Title,
          s.cover_media_id AS coverMediaId,
          (
            SELECT ar.ArtistID
            FROM Song_Artist sa
            JOIN Artist ar ON ar.ArtistID = sa.ArtistID AND COALESCE(ar.IsDeleted,0)=0
            WHERE sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
            ORDER BY CASE sa.Role WHEN 'Primary' THEN 0 ELSE 1 END, ar.ArtistID
            LIMIT 1
          ) AS ArtistID,
          (
            SELECT ar.ArtistName
            FROM Song_Artist sa
            JOIN Artist ar ON ar.ArtistID = sa.ArtistID AND COALESCE(ar.IsDeleted,0)=0
            WHERE sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
            ORDER BY CASE sa.Role WHEN 'Primary' THEN 0 ELSE 1 END, ar.ArtistID
            LIMIT 1
          ) AS Artist,
          lh.ListenedDate,
          lh.Duration
        FROM Listen_History lh
        JOIN Song s ON s.SongID = lh.SongID AND COALESCE(s.IsDeleted,0)=0
        WHERE lh.ListenerID = ?
          AND COALESCE(lh.IsDeleted,0)=0
          AND NOT EXISTS (
            SELECT 1
            FROM Listen_History x
            WHERE x.ListenerID = lh.ListenerID
              AND x.SongID = lh.SongID
              AND COALESCE(x.IsDeleted,0)=0
              AND (
                x.ListenedDate > lh.ListenedDate OR
                (x.ListenedDate = lh.ListenedDate AND x.EventID > lh.EventID)
              )
          )
        ORDER BY lh.ListenedDate DESC, lh.EventID DESC
        LIMIT ?
      `;

      const [rows] = await db.query(sql, [id, limit]);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows || []));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("listen_history route error:", err?.sqlMessage || err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
