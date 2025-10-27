// server/routes/plays.js
import db from "../db.js";

const STREAM_MS_THRESHOLD = 5000; // count as a stream if >= 30s

export async function handlePlayRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // POST /plays  -> log the play + keep Listen_History updated
  if (method === "POST" && pathname === "/plays") {
    try {
      // read body
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
      const listenerId = Number(body.listenerId);
      const msPlayed = Number(body.msPlayed ?? 0);

      if (!Number.isFinite(songId) || !Number.isFinite(listenerId)) {
        res.writeHead(400, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ error: "songId and listenerId are required" }));
        return;
      }

      const [songCheck] = await db.query("SELECT 1 FROM Song WHERE SongID = ? AND IsDeleted = 0", [songId]);
      const [listenerCheck] = await db.query("SELECT 1 FROM Listener WHERE ListenerID = ? AND IsDeleted = 0", [listenerId]);
      if (songCheck.length === 0 || listenerCheck.length === 0) {
        res.writeHead(422, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ error: "Invalid songId or listenerId" }));
        return;
      }

      await db.query(
        `INSERT INTO Play (ListenerID, SongID, MsPlayed, IsDeleted)
         VALUES (?, ?, ?, 0)`,
        [listenerId, songId, msPlayed]
      );

      await db.query(
        `INSERT INTO Listen_History (ListenerID, SongID, ListenedDate, Duration, IsDeleted)
         VALUES (?, ?, CURRENT_DATE(), ?, 0)`,
        [listenerId, songId, msPlayed]
      );

      const [[row]] = await db.query(
        `SELECT COUNT(*) AS Streams
           FROM Play
          WHERE SongID = ? AND IsDeleted = 0 AND MsPlayed >= ?`,
        [songId, STREAM_MS_THRESHOLD]
      );

      res.writeHead(201, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ songId, streams: Number(row.Streams) }));
      return;
    } catch (e) {
      console.error("plays route error:", e?.sqlMessage || e?.message || e);
      res.writeHead(500, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ error: "Server error" }));
      return;
    }
  }

  const mGet = pathname.match(/^\/plays\/streams\/(\d+)$/);
  if (method === "GET" && mGet) {
    try {
      const songId = Number(mGet[1]);
      const [[row]] = await db.query(
        `SELECT COUNT(*) AS Streams
           FROM Play
          WHERE SongID = ? AND IsDeleted = 0 AND MsPlayed >= ?`,
        [songId, STREAM_MS_THRESHOLD]
      );
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ songId, streams: Number(row.Streams) }));
      return;
    } catch (e) {
      console.error("plays get error:", e?.sqlMessage || e?.message || e);
      res.writeHead(500, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ error: "Server error" }));
      return;
    }
  }
}
