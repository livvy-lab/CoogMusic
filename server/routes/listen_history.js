// routes/listen_history.js
import db from "../db.js";
import { parse } from "url";

export async function handleListenHistoryRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // NEW: last 3 songs for a listener
    if (pathname === "/listen_history/latest" && method === "GET") {
      const listenerId = query.listenerId;
      if (!listenerId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "listenerId is required" }));
        return;
      }

      const [rows] = await db.query(
        `SELECT s.SongID, s.Title, s.Artist
         FROM Listen_History lh
         JOIN Song s ON s.SongID = lh.SongID
         WHERE lh.ListenerID = ? AND lh.IsDeleted = 0
         ORDER BY lh.ListenedDate DESC, lh.EventID DESC
         LIMIT 3`,
        [listenerId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET all listen history (not deleted)
    if (pathname === "/listen_history" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Listen_History WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one listen history event by ID
    if (pathname.startsWith("/listen_history/") && method === "GET") {
      const eventId = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Listen_History WHERE EventID = ? AND IsDeleted = 0",
        [eventId]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Listen history event not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // POST new listen history event
    if (pathname === "/listen_history" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { ListenerID, SongID, ListenedDate, Duration } = JSON.parse(body);

        if (!ListenerID || !SongID || !ListenedDate || (Duration === undefined || Duration === null)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        const [result] = await db.query(
          "INSERT INTO Listen_History (ListenerID, SongID, ListenedDate, Duration) VALUES (?, ?, ?, ?)",
          [ListenerID, SongID, ListenedDate, Duration]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            EventID: result.insertId,
            ListenerID,
            SongID,
            ListenedDate,
            Duration
          })
        );
      });
      return;
    }

    // PUT update listen history event
    if (pathname.startsWith("/listen_history/") && method === "PUT") {
      const eventId = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { ListenerID, SongID, ListenedDate, Duration } = JSON.parse(body);

        const [result] = await db.query(
          "UPDATE Listen_History SET ListenerID = ?, SongID = ?, ListenedDate = ?, Duration = ? WHERE EventID = ? AND IsDeleted = 0",
          [ListenerID, SongID, ListenedDate, Duration, eventId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Listen history event not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            EventID: eventId,
            ListenerID,
            SongID,
            ListenedDate,
            Duration,
            message: "Listen history updated successfully",
          })
        );
      });
      return;
    }

    // DELETE (soft delete)
    if (pathname.startsWith("/listen_history/") && method === "DELETE") {
      const eventId = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Listen_History SET IsDeleted = 1 WHERE EventID = ?",
        [eventId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Listen history event not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Listen history soft deleted successfully" }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling listen history route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
