import db from "../db.js";

export async function handleLikesPinRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  const m = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (m === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    if (p === "/songs/status" && m === "GET") {
      const listenerId = Number(url.searchParams.get("listenerId"));
      const ids = (url.searchParams.get("ids") || "").split(",").map(Number).filter(Boolean);
      if (!listenerId) { res.writeHead(200,{"Content-Type":"application/json"}); res.end(JSON.stringify({favorites:[], pinnedSongId:null})); return; }

      let favorites = [];
      if (ids.length) {
        const [rows] = await db.query(
          `SELECT SongID FROM Liked_Song WHERE ListenerID=? AND SongID IN (${ids.map(()=>"?").join(",")})`,
          [listenerId, ...ids]
        );
        favorites = rows.map(r => r.SongID);
      }

      const [pinRow] = await db.query(`SELECT PinnedSongID FROM Listener WHERE ListenerID=?`, [listenerId]);
      const pinnedSongId = pinRow?.[0]?.PinnedSongID ?? null;

      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({ favorites, pinnedSongId }));
      return;
    }

    if (p === "/likes" && (m === "POST" || m === "DELETE")) {
      let body=""; req.on("data",c=>body+=c); req.on("end", async ()=>{
        const { listenerId, songId } = JSON.parse(body||"{}");
        if (!listenerId || !songId) { res.writeHead(400,{"Content-Type":"application/json"}); res.end(JSON.stringify({error:"listenerId and songId required"})); return; }
        if (m === "POST") {
          await db.query(`INSERT IGNORE INTO Liked_Song (ListenerID, SongID, LikedDate) VALUES (?, ?, CURRENT_DATE())`, [listenerId, songId]);
        } else {
          await db.query(`DELETE FROM Liked_Song WHERE ListenerID=? AND SongID=?`, [listenerId, songId]);
        }
        res.writeHead(200,{"Content-Type":"application/json"}); res.end(JSON.stringify({ok:true}));
      });
      return;
    }

    if (p === "/pin" && (m === "POST" || m === "DELETE")) {
      let body=""; req.on("data",c=>body+=c); req.on("end", async ()=>{
        const { listenerId, songId } = JSON.parse(body||"{}");
        if (!listenerId) { res.writeHead(400,{"Content-Type":"application/json"}); res.end(JSON.stringify({error:"listenerId required"})); return; }
        if (m === "POST") {
          if (!songId) { res.writeHead(400,{"Content-Type":"application/json"}); res.end(JSON.stringify({error:"songId required"})); return; }
          await db.query(`UPDATE Listener SET PinnedSongID=? WHERE ListenerID=?`, [songId, listenerId]);
        } else {
          await db.query(`UPDATE Listener SET PinnedSongID=NULL WHERE ListenerID=?`, [listenerId]);
        }
        res.writeHead(200,{"Content-Type":"application/json"}); res.end(JSON.stringify({ok:true}));
      });
      return;
    }

    res.writeHead(404, {"Content-Type":"application/json"});
    res.end(JSON.stringify({error:"Route not found"}));
  } catch (e) {
    console.error("likes_pin route error:", e?.sqlMessage || e);
    res.writeHead(500, {"Content-Type":"application/json"});
    res.end(JSON.stringify({error:"Server error"}));
  }
}
