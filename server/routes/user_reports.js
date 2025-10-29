import db from "../db.js";
import { parse } from "url";

export async function handleUserReportsRoutes(req, res) {
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
    if (pathname === "/user_reports" && method === "GET") {
      const [rows] = await db.query(
        "SELECT * FROM UserReport WHERE IsDeleted = 0"
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    if (pathname.startsWith("/user_reports/") && method === "GET") {
      const reportId = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM UserReport WHERE ReportID = ? AND IsDeleted = 0",
        [reportId]
      );
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "User report not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    if (pathname === "/user_reports" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { ListenerID, EntityType, EntityID, Reason, ReportType } = JSON.parse(body);
          if (!ListenerID || !EntityType || !EntityID || !Reason || !ReportType) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required fields" }));
            return;
          }
          const dateCreated = new Date().toISOString().slice(0, 10);
          const [result] = await db.query(
            `INSERT INTO UserReport (ListenerID, EntityType, EntityID, Reason, ReportType, DateCreated) VALUES (?, ?, ?, ?, ?, ?)`,
            [ListenerID, EntityType, EntityID, Reason, ReportType, dateCreated]
          );
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ReportID: result.insertId, message: "Report created successfully" }));
        } catch (err) {
          console.error("Error creating user report:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid request body or database error" }));
        }
      });
      return;
    }

    // Fallback error if no method/path inside this file matches
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found within UserReports handler" }));

  } catch (err) {
    console.error("Server error handling user report route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}