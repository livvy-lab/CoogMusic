// routes/listener.js
import db from "../db.js";
import { parse } from "url";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

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
    // -----------------------------
    // LOGIN (username + password)
    // POST /login
    // Body: { Username, Password }
    // -----------------------------
    if (pathname === "/login" && method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { Username, Password } = JSON.parse(body || "{}");
          if (!Username || !Password) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Username and Password are required" }));
            return;
          }

          const [rows] = await db.query(
            "SELECT ListenerID, Username, Password FROM Listener WHERE Username = ? AND IsDeleted = 0",
            [Username]
          );

          if (rows.length === 0) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid username or password" }));
            return;
          }

          const ok = await bcrypt.compare(Password, rows[0].Password);
          if (!ok) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid username or password" }));
            return;
          }

          // successful login (do NOT return password)
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ListenerID: rows[0].ListenerID,
              Username: rows[0].Username,
              message: "Login successful",
            })
          );
        } catch (err) {
          console.error("Error parsing POST /login:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // -----------------------------
    // GET all listeners (not deleted) - hide Password
    // GET /listeners
    // -----------------------------
    if (pathname === "/listeners" && method === "GET") {
      const [rows] = await db.query(
        `SELECT ListenerID, Username, FirstName, LastName, DateCreated, PFP, Banner, Bio, Major, Minor, IsDeleted
         FROM Listener
         WHERE IsDeleted = 0`
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // -----------------------------
    // GET one listener by ID - hide Password
    // GET /listeners/:id
    // -----------------------------
    if (pathname.startsWith("/listeners/") && method === "GET") {
      const id = pathname.split("/")[2];
      const [rows] = await db.query(
        `SELECT ListenerID, Username, FirstName, LastName, DateCreated, PFP, Banner, Bio, Major, Minor, IsDeleted
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

    // -----------------------------
    // CREATE listener (hash Password)
    // POST /listeners
    // Body: { Username, FirstName, LastName, DateCreated?, PFP?, Banner?, Bio?, Major?, Minor?, Password }
    // -----------------------------
    if (pathname === "/listeners" && method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
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
            Password, // NEW
          } = JSON.parse(body || "{}");

          const missing = [];
          if (!Username) missing.push("Username");
          if (!FirstName) missing.push("FirstName");
          if (!LastName) missing.push("LastName");
          if (!Password) missing.push("Password");

          if (missing.length) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ error: `Missing required fields: ${missing.join(", ")}` })
            );
            return;
          }

          const hashed = await bcrypt.hash(Password, SALT_ROUNDS);
          const usedDate = DateCreated || new Date();

          const [result] = await db.query(
            `INSERT INTO Listener 
              (Username, FirstName, LastName, DateCreated, PFP, Banner, Bio, Major, Minor, Password, IsDeleted)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
              Username,
              FirstName,
              LastName,
              usedDate,
              PFP || null,
              Banner || null,
              Bio || null,
              Major || null,
              Minor || null,
              hashed,
            ]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ListenerID: result.insertId,
              Username,
              FirstName,
              LastName,
              DateCreated: usedDate,
              PFP: PFP || null,
              Banner: Banner || null,
              Bio: Bio || null,
              Major: Major || null,
              Minor: Minor || null,
              message: "Listener registered successfully",
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

    // -----------------------------
    // UPDATE listener (partial; re-hash if Password provided)
    // PUT /listeners/:id
    // -----------------------------
    if (pathname.startsWith("/listeners/") && method === "PUT") {
      const id = pathname.split("/")[2];
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const fields = JSON.parse(body || "{}");
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
            "Password", // allow password update
          ];

          const updates = [];
          const params = [];

          for (const [key, value] of Object.entries(fields)) {
            if (!validCols.includes(key)) continue;

            if (key === "Password") {
              if (!value) continue; // ignore empty password
              const hashed = await bcrypt.hash(value, SALT_ROUNDS);
              updates.push("Password = ?");
              params.push(hashed);
            } else {
              updates.push(`${key} = ?`);
              params.push(value ?? null);
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

    // -----------------------------
    // DELETE (soft delete)
    // DELETE /listeners/:id
    // -----------------------------
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
