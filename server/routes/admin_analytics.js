import db from "../db.js";
import { parse } from "url";

export async function handleAdminAnalyticsRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const { method } = req;

  if (pathname === "/analytics/admin/reports" && method === "GET") {
    try {
      const { startDate, endDate, status, type, reportType } = query;

      const baseQuery = `
        SELECT
          ur.ReportID,
          ur.DateCreated,
          ur.EntityType,
          ur.ReportType,
          ur.Resolved,
          CONCAT(l_reporter.FirstName, ' ', l_reporter.LastName) AS ReporterName,
          admin.Username AS ResolverName,
          CASE
            WHEN ur.EntityType = 'Listener' THEN CONCAT(l_entity.FirstName, ' ', l_entity.LastName)
            WHEN ur.EntityType = 'Song' THEN s.Title
            WHEN ur.EntityType = 'Artist' THEN ar.ArtistName
            -- CORRECTED LINE: Changed p.PlaylistName to p.Name
            WHEN ur.EntityType = 'Playlist' THEN p.Name 
            ELSE 'N/A'
          END AS EntityName
        FROM UserReport ur
        JOIN Listener l_reporter ON ur.ListenerID = l_reporter.ListenerID
        LEFT JOIN Administrator admin ON ur.AdminID = admin.AdminID
        LEFT JOIN Listener l_entity ON ur.EntityType = 'Listener' AND ur.EntityID = l_entity.ListenerID
        LEFT JOIN Song s ON ur.EntityType = 'Song' AND ur.EntityID = s.SongID
        LEFT JOIN Artist ar ON ur.EntityType = 'Artist' AND ur.EntityID = ar.ArtistID
        LEFT JOIN Playlist p ON ur.EntityType = 'Playlist' AND ur.EntityID = p.PlaylistID
      `;

      const whereClauses = ["ur.IsDeleted = 0"];
      const params = [];

      if (startDate) {
        whereClauses.push("ur.DateCreated >= ?");
        params.push(startDate);
      }
      if (endDate) {
        whereClauses.push("ur.DateCreated <= ?");
        params.push(endDate);
      }
      if (status === "pending") {
        whereClauses.push("ur.Resolved = 0");
      }
      if (status === "resolved") {
        whereClauses.push("ur.Resolved = 1");
      }
      if (type) {
        whereClauses.push("ur.EntityType = ?");
        params.push(type);
      }
      if (reportType) {
        whereClauses.push("ur.ReportType = ?");
        params.push(reportType);
      }

      const sql = `${baseQuery} WHERE ${whereClauses.join(" AND ")} ORDER BY ur.DateCreated DESC`;
      const [rows] = await db.query(sql, params);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ reports: rows }));

    } catch (err) {
      console.error("Error fetching admin reports:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to fetch admin reports" }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Admin analytics route not found" }));
}