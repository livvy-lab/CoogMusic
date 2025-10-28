// server/routes/play.js
import db from "../db.js";

const STREAM_MS_THRESHOLD = 0; // use 30000 in prod if you want 30s real plays

export async function handlePlayRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    // ---- POST /plays  -> record a play and return updated stream count ----
    if (pathname === "/plays" && method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        let payload;
        try {
          payload = JSON.parse(body || "{}");
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
          return;
        }

        const songId = Number(payload.songId);
        const listenerId = Number(payload.listenerId);
        const msPlayed = Number(payload.msPlayed ?? 0);

        if (!Number.isFinite(songId) || !Number.isFinite(listenerId)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "songId and listenerId are required numbers" }));
          return;
        }

        try {
          // insert play
          await db.query(
            `INSERT INTO Play (ListenerID, SongID, PlayedAt, MsPlayed, IsDeleted)
             VALUES (?, ?, NOW(), ?, 0)`,
            [listenerId, songId, msPlayed]
          );

          // count streams for that song (respect threshold & soft delete)
          const [[row]] = await db.query(
            `SELECT COUNT(*) AS Streams
               FROM Play
              WHERE SongID = ?
                AND IsDeleted = 0
                AND MsPlayed >= ?`,
            [songId, STREAM_MS_THRESHOLD]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, songId, streams: Number(row?.Streams || 0) }));
        } catch (e) {
          console.error("POST /plays error:", e?.sqlMessage || e?.message || e);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to record play" }));
        }
      });
      return;
    }

    // ---- GET /plays/count?songId=###  (handy for debugging) ----
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

    // ---- fallback ----
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Plays endpoint not found" }));
  } catch (err) {
    console.error("Play route error:", err?.sqlMessage || err?.message || err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
