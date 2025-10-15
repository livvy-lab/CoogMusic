import db from "../db.js";
import { parse } from "url";

export async function handleAdViewRoutes(req, res) {
  const { pathname } = parse(req.url, true);
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
    // GET all ad views
    if (pathname === "/ad_views" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Ad_View WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one ad view by ID
    if (pathname.startsWith("/ad_views/") && method === "GET") {
      const viewId = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Ad_View WHERE ViewID = ? AND IsDeleted = 0",
        [viewId]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Ad view not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // POST new ad view
    if (pathname === "/ad_views" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { ListenerID, AdID, DateViewed } = JSON.parse(body);

        if (!ListenerID || !AdID || !DateViewed) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        const [result] = await db.query(
          "INSERT INTO Ad_View (ListenerID, AdID, DateViewed) VALUES (?, ?, ?)",
          [ListenerID, AdID, DateViewed]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ViewID: result.insertId,
            ListenerID,
            AdID,
            DateViewed,
          })
        );
      });
      return;
    }

    // PUT update ad view
    if (pathname.startsWith("/ad_views/") && method === "PUT") {
      const viewId = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const { ListenerID, AdID, DateViewed } = JSON.parse(body);

        const [result] = await db.query(
          "UPDATE Ad_View SET ListenerID = ?, AdID = ?, DateViewed = ? WHERE ViewID = ? AND IsDeleted = 0",
          [ListenerID, AdID, DateViewed, viewId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Ad view not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ViewID: viewId,
            ListenerID,
            AdID,
            DateViewed,
            message: "Ad view updated successfully",
          })
        );
      });
      return;
    }

    // DELETE ad view (soft delete)
    if (pathname.startsWith("/ad_views/") && method === "DELETE") {
      const viewId = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Ad_View SET IsDeleted = 1 WHERE ViewID = ?",
        [viewId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Ad view not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Ad view soft deleted successfully" }));
      return;
    }

    // 404 Not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling ad view route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}