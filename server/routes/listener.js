import db from "../db.js";
import { parse } from "url";

export async function handleListenerRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    if (pathname === "/listeners" && method === "GET") {
      const [rows] = await db.query(
        `SELECT ListenerID, FirstName, LastName, DateCreated, PFP, Bio, Major, Minor, IsDeleted,
                PinnedSongID, PinnedPlaylistID
         FROM Listener
         WHERE IsDeleted = 0`
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    if (pathname.startsWith("/listeners/") && method === "GET" && !pathname.endsWith("/favorite-artists")) {
      const id = pathname.split("/")[2];
      const [rows] = await db.query(
        `SELECT ListenerID, FirstName, LastName, DateCreated, PFP, Bio, Major, Minor, IsDeleted,
                PinnedSongID, PinnedPlaylistID
         FROM Listener
         WHERE ListenerID = ? AND IsDeleted = 0`,
        [id]
      );
      if (rows.length === 0) { res.writeHead(404, {"Content-Type":"application/json"}); res.end(JSON.stringify({error:"Listener not found"})); return; }
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify(rows[0]));
      return;
    }

    if (pathname === "/listeners" && method === "POST") {
      let body = ""; req.on("data", c => body += c);
      req.on("end", async () => {
        const { FirstName, LastName, DateCreated, PFP, Bio, Major, Minor, PinnedSongID, PinnedPlaylistID } = JSON.parse(body || "{}");
        const missing = []; if (!FirstName) missing.push("FirstName"); if (!LastName) missing.push("LastName"); if (!Major) missing.push("Major");
        if (missing.length) { res.writeHead(400, {"Content-Type":"application/json"}); res.end(JSON.stringify({error:`Missing required fields: ${missing.join(", ")}`})); return; }
        const usedDate = DateCreated || new Date();
        const [result] = await db.query(
          `INSERT INTO Listener
           (FirstName, LastName, DateCreated, PFP, Bio, Major, Minor, IsDeleted, PinnedSongID, PinnedPlaylistID)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [FirstName, LastName, usedDate, PFP || null, Bio || null, Major, Minor || null, PinnedSongID || null, PinnedPlaylistID || null]
        );
        res.writeHead(201, {"Content-Type":"application/json"});
        res.end(JSON.stringify({
          ListenerID: result.insertId, FirstName, LastName, DateCreated: usedDate,
          PFP: PFP || null, Bio: Bio || null, Major, Minor: Minor || null,
          PinnedSongID: PinnedSongID || null, PinnedPlaylistID: PinnedPlaylistID || null,
          message: "Listener created successfully"
        }));
      });
      return;
    }

    if (pathname.startsWith("/listeners/") && method === "PUT" && !pathname.endsWith("/favorite-artists")) {
      const id = pathname.split("/")[2];
      let body = ""; req.on("data", c => body += c);
      req.on("end", async () => {
        const fields = JSON.parse(body || "{}");
        const validCols = ["FirstName","LastName","DateCreated","PFP","Bio","Major","Minor","PinnedSongID","PinnedPlaylistID"];
        const updates = []; const params = [];
        for (const [k,v] of Object.entries(fields)) { if (!validCols.includes(k)) continue; updates.push(`${k} = ?`); params.push(v ?? null); }
        if (updates.length === 0) { res.writeHead(400, {"Content-Type":"application/json"}); res.end(JSON.stringify({error:"No valid fields provided to update"})); return; }
        params.push(id);
        const [result] = await db.query(`UPDATE Listener SET ${updates.join(", ")} WHERE ListenerID = ? AND IsDeleted = 0`, params);
        if (result.affectedRows === 0) { res.writeHead(404, {"Content-Type":"application/json"}); res.end(JSON.stringify({error:"Listener not found"})); return; }
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ ListenerID: id, message: "Listener updated successfully" }));
      });
      return;
    }

    if (pathname.startsWith("/listeners/") && method === "DELETE") {
      const id = pathname.split("/")[2];
      const [result] = await db.query("UPDATE Listener SET IsDeleted = 1 WHERE ListenerID = ?", [id]);
      if (result.affectedRows === 0) { res.writeHead(404, {"Content-Type":"application/json"}); res.end(JSON.stringify({error:"Listener not found or already deleted"})); return; }
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify({message:"Listener soft deleted successfully"}));
      return;
    }

    if (pathname.startsWith("/listeners/") && pathname.endsWith("/favorite-artists")) {
      await handleFavoriteArtists(req, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling listener routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
