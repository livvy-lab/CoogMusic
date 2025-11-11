import db from "../db.js";
import { parse } from "url";

// get request body
function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        if (body === "") {
          resolve({});
          return;
        }
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", err => reject(err));
  });
}

// token validation (assuming token is admin id)
async function getAdminIdFromToken(req, db) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;
  const adminId = parseInt(token, 10);
  if (!adminId) return null;
  try {
    const [rows] = await db.query(
      "SELECT AdminID FROM Administrator WHERE AdminID = ? AND IsDeleted = 0", 
      [adminId]
    );
    if (rows.length > 0) return rows[0].AdminID;
  } catch (err) {
    return null;
  }
  return null;
}

export async function handleUserReportsRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // get reports
    if (pathname === "/user_reports" && method === "GET") {
      let sql = `
        SELECT 
          ur.ReportID,
          ur.ListenerID,
          ur.AdminID,
          ur.EntityType,
          ur.EntityID,
          ur.Reason,
          ur.Resolved,
          ur.DateCreated,
          ur.IsDeleted,
          ur.ReportType,
          ur.AdminActionTaken,
          ur.AdminJustification,
          acc.Username AS ReporterUsername,
          admin.Username AS ResolverName,
          COALESCE(s.Title, a.ArtistName, p.Name, accEnt.Username) AS EntityName
        FROM 
          UserReport ur
        LEFT JOIN 
          Listener repL ON ur.ListenerID = repL.ListenerID
        LEFT JOIN 
          AccountInfo acc ON repL.AccountID = acc.AccountID
        LEFT JOIN 
          Administrator admin ON ur.AdminID = admin.AdminID
        LEFT JOIN 
          Song s ON ur.EntityID = s.SongID AND ur.EntityType = 'Song'
        LEFT JOIN 
          Artist a ON ur.EntityID = a.ArtistID AND ur.EntityType = 'Artist'
        LEFT JOIN 
          Playlist p ON ur.EntityID = p.PlaylistID AND ur.EntityType = 'Playlist'
        LEFT JOIN 
          Listener entL ON ur.EntityID = entL.ListenerID AND (ur.EntityType = 'Listener' OR ur.EntityType = 'User')
        LEFT JOIN 
          AccountInfo accEnt ON entL.AccountID = accEnt.AccountID
        WHERE 
          ur.IsDeleted = 0
      `;
      const params = [];
      if (query.resolved === "false") sql += " AND ur.Resolved = 0";
      else if (query.resolved === "true") sql += " AND ur.Resolved = 1";
      if (query.reportType) {
        sql += " AND ur.ReportType = ?";
        params.push(query.reportType);
      }
      if (query.type) {
        sql += " AND ur.EntityType = ?";
        params.push(query.type);
      }
      if (query.startDate) {
        sql += " AND ur.DateCreated >= ?";
        params.push(query.startDate);
      }
      if (query.endDate) {
        sql += " AND ur.DateCreated <= ?";
        params.push(query.endDate);
      }
      if (query.adminAction) {
        sql += " AND ur.AdminActionTaken = ?";
        params.push(query.adminAction);
      }
      sql += " ORDER BY ur.DateCreated DESC";
      const [rows] = await db.query(sql, params);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // get report by id
    if (pathname.startsWith("/user_reports/") && method === "GET") {
      const reportId = pathname.split("/")[2];
      if (!reportId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "missing report id" }));
        return;
      }
      const [rows] = await db.query(
        `SELECT 
          ur.ReportID,
          ur.ListenerID,
          ur.AdminID,
          ur.EntityType,
          ur.EntityID,
          ur.Reason,
          ur.Resolved,
          ur.DateCreated,
          ur.IsDeleted,
          ur.ReportType,
          ur.AdminActionTaken,
          ur.AdminJustification,
          acc.Username AS ReporterUsername,
          admin.Username AS ResolverName,
          COALESCE(s.Title, a.ArtistName, p.Name, accEnt.Username) AS EntityName
        FROM 
          UserReport ur
        LEFT JOIN 
          Listener repL ON ur.ListenerID = repL.ListenerID
        LEFT JOIN 
          AccountInfo acc ON repL.AccountID = acc.AccountID
        LEFT JOIN 
          Administrator admin ON ur.AdminID = admin.AdminID
        LEFT JOIN 
          Song s ON ur.EntityID = s.SongID AND ur.EntityType = 'Song'
        LEFT JOIN 
          Artist a ON ur.EntityID = a.ArtistID AND ur.EntityType = 'Artist'
        LEFT JOIN 
          Playlist p ON ur.EntityID = p.PlaylistID AND ur.EntityType = 'Playlist'
        LEFT JOIN 
          Listener entL ON ur.EntityID = entL.ListenerID AND (ur.EntityType = 'Listener' OR ur.EntityType = 'User')
        LEFT JOIN 
          AccountInfo accEnt ON entL.AccountID = accEnt.AccountID
        WHERE 
          ur.ReportID = ? AND ur.IsDeleted = 0`,
        [reportId]
      );
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "user report not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // create user report
    if (pathname === "/user_reports" && method === "POST") {
      try {
        const { ListenerID, EntityType, EntityID, Reason, ReportType } = await getBody(req);
        if (!ListenerID || !EntityType || !EntityID || !Reason || !ReportType) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "missing required fields" }));
          return;
        }
        const dateCreated = new Date().toISOString().slice(0, 10);
        const [result] = await db.query(
          `INSERT INTO UserReport (ListenerID, EntityType, EntityID, Reason, ReportType, DateCreated, Resolved, IsDeleted) VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
          [ListenerID, EntityType, EntityID, Reason, ReportType, dateCreated]
        );
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ReportID: result.insertId, message: "report created" }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid request body or db error" }));
      }
      return;
    }

    // resolve user report
    if (pathname.startsWith("/user_reports/") && method === "PUT") {
      const reportId = pathname.split("/")[2];
      if (!reportId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "missing report id" }));
        return;
      }
      try {
        const adminId = await getAdminIdFromToken(req, db);
        if (!adminId) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "unauthorized" }));
          return;
        }
        const { AdminActionTaken, AdminJustification } = await getBody(req);
        if (!AdminActionTaken || !AdminJustification) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "missing required fields" }));
          return;
        }
        const [result] = await db.query(
          `UPDATE UserReport 
           SET 
             Resolved = 1, 
             AdminID = ?, 
             AdminActionTaken = ?, 
             AdminJustification = ?
           WHERE 
             ReportID = ?`,
          [adminId, AdminActionTaken, AdminJustification, reportId]
        );
        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "not found or no changes" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ReportID: reportId, message: "report resolved" }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid request body or db error" }));
      }
      return;
    }

    // soft-delete user report
    if (pathname.startsWith("/user_reports/") && method === "DELETE") {
      const reportId = pathname.split("/")[2];
      if (!reportId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "missing report id" }));
        return;
      }
      try {
        const [result] = await db.query(
          `UPDATE UserReport SET IsDeleted = 1 WHERE ReportID = ?`,
          [reportId]
        );
        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "report not found" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ReportID: reportId, message: "report deleted" }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "internal server error" }));
      }
      return;
    }

    // fallback
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "route not found in userreports handler" }));
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({ error: "internal server error" }));
  }
}
