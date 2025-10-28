// server/routes/play.js
import db from "../db.js";

const STREAM_MS_THRESHOLD = 0; // e.g., 30000 in prod

export async function handlePlayRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    // POST /plays
    if (pathname === "/plays" && method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        let payload = {};
        try { payload = JSON.parse(body || "{}"); } catch {}

        const songId = Number(payload.songId);
        const listenerId = Number(payload.listenerId);
        const msPlayedRaw = Number(payload.msPlayed);
        const msPlayed = Number.isFinite(msPlayedRaw) && msPlayedRaw > 0 ? Math.floor(msPlayedRaw) : 0;

        if (!Number.isFinite(songId) || !Number.isFinite(listenerId)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "songId and listenerId are required numbers" }));
          return;
        }

        try {
          // verify song exists & not deleted
          const [[song]] = await db.query(
            "SELECT SongID FROM Song WHERE SongID = ? AND IsDeleted = 0",
            [songId]
          );
          if (!song) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Song not found or deleted" }));
            return;
          }

          // transaction (works for single connection too)
          if (db.beginTransaction) await db.beginTransaction();

          // Play row
          await db.query(
            `INSERT INTO Play (ListenerID, SongID, PlayedAt, MsPlayed, IsDeleted)
             VALUES (?, ?, NOW(), ?, 0)`,
            [listenerId, songId, msPlayed]
          );

          // Listen_History row (EventID will auto-increment after schema fix)
          const durationSec = Math.max(0, Math.floor(msPlayed / 1000));
          await db.query(
            `INSERT INTO Listen_History (ListenerID, SongID, ListenedDate, Duration, IsDeleted)
             VALUES (?, ?, CURDATE(), ?, 0)`,
            [listenerId, songId, durationSec]
          );

          // Threshold-aware stream count
          const [[row]] = await db.query(
            `SELECT COUNT(*) AS Streams
               FROM Play
              WHERE SongID = ?
                AND IsDeleted = 0
                AND MsPlayed >= ?`,
            [songId, STREAM_MS_THRESHOLD]
          );

          if (db.commit) await db.commit();

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            ok: true,
            songId,
            listenerId,
            msPlayed,
            streams: Number(row?.Streams || 0),
          }));
        } catch (e) {
          if (db.rollback) await db.rollback();
          console.error("POST /plays SQL error:", e?.sqlMessage || e?.message || e);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to record play" }));
        }
      });
      return;
    }

    // GET /plays/count?songId=###
    if (pathname === "/plays/count" && method === "GET") {
      const songId = Number(url.searchParams.get("songId"));
      if (!Number.isFinite(songId)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "songId query param is required" }));
        return;
      }
      const [[row]] = await db.query(
        `SELECT COUNT(*) AS Streams
           FROM Play
          WHERE SongID = ?
            AND IsDeleted = 0
            AND MsPlayed >= ?`,
        [songId, STREAM_MS_THRESHOLD]
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ songId, streams: Number(row?.Streams || 0) }));
      return;
    }

    // fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Plays endpoint not found" }));
  } catch (err) {
    console.error("Play route error:", err?.message || err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
