import db from "../db.js";
import { parse } from "url";

export async function handleAdminRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // Enable CORS manually
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // ---------- GET all administrators ----------
    if (pathname === "/administrators" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Administrator WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // ---------- GET one administrator by ID ----------
    if (pathname.startsWith("/administrators/") && method === "GET") {
      const adminId = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Administrator WHERE AdminID = ? AND IsDeleted = 0",
        [adminId]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Administrator not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // ---------- POST new administrator ----------
    if (pathname === "/administrators" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { Username, DateCreated } = JSON.parse(body);

        if (!Username || !DateCreated) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        const [result] = await db.query(
          "INSERT INTO Administrator (Username, DateCreated) VALUES (?, ?)",
          [Username, DateCreated]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            AdminID: result.insertId,
            Username,
            DateCreated,
          })
        );
      });
      return;
    }

    // ---------- PUT update administrator ----------
    if (pathname.startsWith("/administrators/") && method === "PUT") {
      const adminId = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { Username, DateCreated } = JSON.parse(body);

        const [result] = await db.query(
          "UPDATE Administrator SET Username = ?, DateCreated = ? WHERE AdminID = ? AND IsDeleted = 0",
          [Username, DateCreated, adminId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Administrator not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            AdminID: adminId,
            Username,
            DateCreated,
            message: "Administrator updated successfully",
          })
        );
      });
      return;
    }

    // ---------- DELETE administrator (soft delete) ----------
    if (pathname.startsWith("/administrators/") && method === "DELETE") {
      const adminId = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Administrator SET IsDeleted = 1 WHERE AdminID = ?",
        [adminId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Administrator not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Administrator soft deleted successfully" }));
      return;
    }

    // ---------- 404 Not Found ----------
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));

  } catch (err) {
    console.error("Error handling administrator routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
