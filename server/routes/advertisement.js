import db from "../db.js";
import { parse } from "url";

export async function handleAdRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // ✅ Enable CORS manually
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // ---------- GET all advertisements ----------
    if (pathname === "/advertisements" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Advertisement WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // ---------- GET one advertisement by ID ----------
    if (pathname.startsWith("/advertisements/") && method === "GET") {
      const adId = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Advertisement WHERE adId = ? AND IsDeleted = 0",
        [adId]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Advertisement not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // ---------- POST (Add new advertisement) ----------
    if (pathname === "/advertisements" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { AdName, AdLength, AdFile } = JSON.parse(body);

        if (!AdName || !AdLength || !AdFile) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        const [result] = await db.query(
          "INSERT INTO Advertisement (AdName, AdLength, AdFile) VALUES (?, ?, ?)",
          [AdName, AdLength, AdFile]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            adId: result.insertId,
            AdName,
            AdLength,
            AdFile,
          })
        );
      });
      return;
    }

    // ---------- PUT (Update advertisement) ----------
    if (pathname.startsWith("/advertisements/") && method === "PUT") {
      const adId = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { AdName, AdLength, AdFile } = JSON.parse(body);

        const [result] = await db.query(
          "UPDATE Advertisement SET AdName = ?, AdLength = ?, AdFile = ? WHERE adId = ? AND IsDeleted = 0",
          [AdName, AdLength, AdFile, adId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Advertisement not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            adId,
            AdName,
            AdLength,
            AdFile,
            message: "Advertisement updated successfully",
          })
        );
      });
      return;
    }

    // ---------- DELETE (Soft delete advertisement) ----------
    if (pathname.startsWith("/advertisements/") && method === "DELETE") {
      const adId = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Advertisement SET IsDeleted = 1 WHERE adId = ?",
        [adId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Advertisement not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Advertisement soft deleted successfully" }));
      return;
    }

    // ---------- 404 Not Found ----------
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));

  } catch (err) {
    console.error("Error handling advertisement routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
