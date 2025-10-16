// routes/listener.js
import db from "../db.js";
import { parse } from "url";

export async function handleListenerRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // CORS setup
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // GET all listeners (not deleted)
    if (pathname === "/listeners" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Listener WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one listener by ID
    if (pathname.startsWith("/listeners/") && method === "GET") {
      const id = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Listener WHERE ListenerID = ? AND IsDeleted = 0",
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

    // POST create new listener
    if (pathname === "/listeners" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const {
            Username,
            FirstName,
            LastName,
            DateCreated,
            PFP,
            Banner,
            Bio,
            Major,
            Minor,
          } = JSON.parse(body);

          if (!Username || !FirstName || !LastName) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required fields: Username, FirstName, LastName" }));
            return;
          }

          const [result] = await db.query(
            `INSERT INTO Listener 
              (Username, FirstName, LastName, DateCreated, PFP, Banner, Bio, Major, Minor)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              Username,
              FirstName,
              LastName,
              DateCreated || new Date(),
              PFP || null,
              Banner || null,
              Bio || null,
              Major || null,
              Minor || null,
            ]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ListenerID: result.insertId,
              Username,
              FirstName,
              LastName,
              DateCreated,
              PFP,
              Banner,
              Bio,
              Major,
              Minor,
            })
          );
        } catch (err) {
          console.error("Error parsing request body for POST /listeners:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // PUT update listener (partial updates allowed)
    if (pathname.startsWith("/listeners/") && method === "PUT") {
      const id = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const fields = JSON.parse(body);
          const validCols = [
            "Username",
            "FirstName",
            "LastName",
            "DateCreated",
            "PFP",
            "Banner",
            "Bio",
            "Major",
            "Minor",
          ];

          const updates = [];
          const params = [];

          for (const [key, value] of Object.entries(fields)) {
            if (validCols.includes(key)) {
              updates.push(`${key} = ?`);
              params.push(value);
            }
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
          res.end(JSON.stringify({ ListenerID: id, message: "Listener updated successfully" }));
        } catch (err) {
          console.error("Error parsing PUT /listeners/:id body:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // DELETE (soft delete)
    if (pathname.startsWith("/listeners/") && method === "DELETE") {
      const id = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Listener SET IsDeleted = 1 WHERE ListenerID = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Listener not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Listener soft deleted successfully" }));
      return;
    }

    // 404 fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling listener routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
