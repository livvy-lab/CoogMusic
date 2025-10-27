import db from "../db.js";
import { parse } from "url";

export async function handleListenerRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // ✅ CORS setup
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // ✅ GET /listeners → all listeners
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

    // ✅ GET /listeners/:id → one listener
    if (
      pathname.startsWith("/listeners/") &&
      method === "GET" &&
      !pathname.endsWith("/favorite-artists")
    ) {
      const id = pathname.split("/")[2];
      const [rows] = await db.query(
        `SELECT ListenerID, FirstName, LastName, DateCreated, PFP, Bio, Major, Minor, IsDeleted,
                PinnedSongID, PinnedPlaylistID
         FROM Listener
         WHERE ListenerID = ? AND IsDeleted = 0`,
        [id]
      );
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Listener not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // ✅ POST /listeners → create new listener
    if (pathname === "/listeners" && method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const {
        FirstName,
        LastName,
        DateCreated,
        PFP,
        Bio,
        Major,
        Minor,
        PinnedSongID,
        PinnedPlaylistID,
      } = JSON.parse(body || "{}");

      const missing = [];
      if (!FirstName) missing.push("FirstName");
      if (!LastName) missing.push("LastName");
      if (!Major) missing.push("Major");
      if (missing.length) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: `Missing required fields: ${missing.join(", ")}`,
          })
        );
        return;
      }

      const usedDate = DateCreated || new Date();
      const [result] = await db.query(
        `INSERT INTO Listener
           (FirstName, LastName, DateCreated, PFP, Bio, Major, Minor, IsDeleted, PinnedSongID, PinnedPlaylistID)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          FirstName,
          LastName,
          usedDate,
          PFP || null,
          Bio || null,
          Major,
          Minor || null,
          PinnedSongID || null,
          PinnedPlaylistID || null,
        ]
      );
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ListenerID: result.insertId,
          FirstName,
          LastName,
          DateCreated: usedDate,
          PFP: PFP || null,
          Bio: Bio || null,
          Major,
          Minor: Minor || null,
          PinnedSongID: PinnedSongID || null,
          PinnedPlaylistID: PinnedPlaylistID || null,
          message: "Listener created successfully",
        })
      );
      return;
    }

    // ✅ PUT /listeners/:id → full update (legacy)
    if (
      pathname.startsWith("/listeners/") &&
      method === "PUT" &&
      !pathname.endsWith("/favorite-artists")
    ) {
      const id = pathname.split("/")[2];
      let body = "";
      for await (const chunk of req) body += chunk;
      const fields = JSON.parse(body || "{}");

      const validCols = [
        "FirstName",
        "LastName",
        "DateCreated",
        "PFP",
        "Bio",
        "Major",
        "Minor",
        "PinnedSongID",
        "PinnedPlaylistID",
      ];
      const updates = [];
      const params = [];
      for (const [k, v] of Object.entries(fields)) {
        if (!validCols.includes(k)) continue;
        updates.push(`${k} = ?`);
        params.push(v ?? null);
      }
      if (updates.length === 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No valid fields provided to update" }));
        return;
      }
      params.push(id);

      const [result] = await db.query(
        `UPDATE Listener SET ${updates.join(", ")} WHERE ListenerID = ? AND IsDeleted = 0`,
        params
      );
      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Listener not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ ListenerID: id, message: "Listener updated successfully" })
      );
      return;
    }

    // ✅ PATCH /listeners/:id → partial update (used by EditProfile.jsx)
    if (
      pathname.startsWith("/listeners/") &&
      method === "PATCH" &&
      !pathname.endsWith("/favorite-artists") &&
      !pathname.endsWith("/pinned-playlist")
    ) {
      const id = pathname.split("/")[2];
      let body = "";
      for await (const chunk of req) body += chunk;
      const fields = JSON.parse(body || "{}");

      const validCols = [
        "FirstName",
        "LastName",
        "Bio",
        "Major",
        "Minor",
        "PFP",
      ];
      const updates = [];
      const params = [];

      for (const [k, v] of Object.entries(fields)) {
        if (!validCols.includes(k)) continue;
        updates.push(`${k} = ?`);
        params.push(v ?? null);
      }

      if (updates.length === 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "No valid fields provided for update" })
        );
        return;
      }

      params.push(id);
      const [result] = await db.query(
        `UPDATE Listener SET ${updates.join(", ")} WHERE ListenerID = ? AND IsDeleted = 0`,
        params
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Listener not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ ListenerID: id, message: "Profile updated successfully" })
      );
      return;
    }

    // ✅ PATCH /listeners/:id/pinned-playlist → pin playlist to profile
    if (pathname.match(/^\/listeners\/(\d+)\/pinned-playlist$/) && method === "PATCH") {
      const id = pathname.split("/")[2];
      let body = "";
      for await (const chunk of req) body += chunk;
      const { playlistId } = JSON.parse(body || "{}");

      if (!playlistId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing playlistId" }));
        return;
      }

      const [result] = await db.query(
        `UPDATE Listener SET PinnedPlaylistID = ? WHERE ListenerID = ? AND IsDeleted = 0`,
        [playlistId, id]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Listener not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, pinned: playlistId }));
      return;
    }

    // ✅ DELETE /listeners/:id → soft delete
    if (pathname.startsWith("/listeners/") && method === "DELETE") {
      const id = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Listener SET IsDeleted = 1 WHERE ListenerID = ?",
        [id]
      );
      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Listener not found or already deleted",
          })
        );
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Listener soft deleted successfully" }));
      return;
    }

    // ✅ Delegate favorite artists subroute
    if (pathname.startsWith("/listeners/") && pathname.endsWith("/favorite-artists")) {
      await handleFavoriteArtists(req, res);
      return;
    }

    // ✅ fallback 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling listener routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
