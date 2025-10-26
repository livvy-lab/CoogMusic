// server/routes/plays.js
import db from "../db.js";

export async function handlePlayRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // POST /plays  { songId, listenerId? }
  if (method === "POST" && pathname === "/plays") {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString() || "{}";

      let body;
      try { body = JSON.parse(raw); } catch {
        res.writeHead(400, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      const songId = Number(body.songId);
      const listenerId = body.listenerId === undefined || body.listenerId === null
        ? null
        : Number(body.listenerId);

      if (!Number.isFinite(songId)) {
        res.writeHead(400, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ error: "songId required" }));
        return;
      }

      // If your column is DATE, keep CURRENT_DATE().
      // If you later migrate to DATETIME (recommended), use NOW() instead.
      await db.query(
        `INSERT INTO Listen_History (ListenerID, SongID, ListenedDate, Duration, IsDeleted)
         VALUES (?, ?, CURRENT_DATE(), 0, 0)`,
        [Number.isFinite(listenerId) ? listenerId : null, songId]
      );

      const [[row]] = await db.query(
        `SELECT COUNT(*) AS Streams
           FROM Listen_History
          WHERE SongID = ? AND IsDeleted = 0`,
        [songId]
      );

      res.writeHead(201, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ songId, streams: Number(row.Streams) }));
      return;
    } catch (e) {
      console.error("plays route error:", e);
      res.writeHead(500, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ error: "Server error" }));
      return;
    }
  }

  // GET /plays/streams/:songId  --> current stream count (useful for debugging/UI)
  const mGet = pathname.match(/^\/plays\/streams\/(\d+)$/);
  if (method === "GET" && mGet) {
    try {
      const songId = Number(mGet[1]);
      const [[row]] = await db.query(
        `SELECT COUNT(*) AS Streams
           FROM Listen_History
          WHERE SongID = ? AND IsDeleted = 0`,
        [songId]
      );
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ songId, streams: Number(row.Streams) }));
      return;
    } catch (e) {
      console.error("plays get error:", e);
      res.writeHead(500, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ error: "Server error" }));
      return;
    }
  }
}
