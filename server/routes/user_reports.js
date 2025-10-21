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
    // GET all user reports
    if (pathname === "/user_reports" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM UserReport WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one report by ID
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

    // POST new user report
    if (pathname === "/user_reports" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { ReporterID, ReportedUserID, Reason, DateReported, IsResolved } = JSON.parse(body);

          if (!ReporterID || !ReportedUserID || !Reason) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required fields: ReporterID, ReportedUserID, Reason" }));
            return;
          }

          const [result] = await db.query(
            "INSERT INTO UserReport (ReporterID, ReportedUserID, Reason, DateReported, IsResolved) VALUES (?, ?, ?, ?, ?)",
            [ReporterID, ReportedUserID, Reason, DateReported || null, IsResolved !== undefined ? IsResolved : 0]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ReportID: result.insertId,
              ReporterID,
              ReportedUserID,
              Reason,
              DateReported: DateReported || null,
              IsResolved: IsResolved !== undefined ? IsResolved : 0,
            })
          );
        } catch (err) {
          console.error("Error parsing request body for POST /user_reports:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // PUT update user report (partial allowed)
    if (pathname.startsWith("/user_reports/") && method === "PUT") {
      const reportId = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { ReporterID, ReportedUserID, Reason, DateReported, IsResolved } = JSON.parse(body);

          const fields = [];
          const params = [];

          if (ReporterID !== undefined) { fields.push("ReporterID = ?"); params.push(ReporterID); }
          if (ReportedUserID !== undefined) { fields.push("ReportedUserID = ?"); params.push(ReportedUserID); }
          if (Reason !== undefined) { fields.push("Reason = ?"); params.push(Reason); }
          if (DateReported !== undefined) { fields.push("DateReported = ?"); params.push(DateReported); }
          if (IsResolved !== undefined) { fields.push("IsResolved = ?"); params.push(IsResolved); }

          if (fields.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "No fields provided to update" }));
            return;
          }

          params.push(reportId);
          const [result] = await db.query(
            `UPDATE UserReport SET ${fields.join(", ")} WHERE ReportID = ? AND IsDeleted = 0`,
            params
          );

          if (result.affectedRows === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "User report not found" }));
            return;
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ReportID: reportId, message: "User report updated successfully" }));
        } catch (err) {
          console.error("Error parsing request body for PUT /user_reports/:id:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // DELETE user report (soft delete)
    if (pathname.startsWith("/user_reports/") && method === "DELETE") {
      const reportId = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE UserReport SET IsDeleted = 1 WHERE ReportID = ?",
        [reportId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "User report not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "User report soft deleted successfully" }));
      return;
    }

    // 404 Not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling user_report route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}