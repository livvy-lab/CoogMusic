import db from "../db.js";
import { parse } from "url";

export async function handleCompanyRoutes(req, res) {
  const url = parse(req.url, true);
  const idMatch = url.pathname.match(/^\/companies\/(\d+)$/);

  try {
    // Return all companies not soft deleted
    if (req.method === "GET" && url.pathname === "/companies") {
      const [rows] = await db.query("SELECT * FROM Company WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // Return a single company
    if (req.method === "GET" && idMatch) {
      const companyId = idMatch[1];
      const [rows] = await db.query("SELECT * FROM Company WHERE CompanyID = ? AND IsDeleted = 0", [companyId]);
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Company not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // Add a new company
    if (req.method === "POST" && url.pathname === "/companies") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { Name } = JSON.parse(body);
        if (!Name) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required field: Name" }));
          return;
        }

        // Generate the current date in YYYY-MM-DD format for DateCreated
        const dateCreated = new Date().toISOString().slice(0, 10);

        const [result] = await db.query(
          "INSERT INTO Company (Name, DateCreated) VALUES (?, ?)",
          [Name, dateCreated]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          CompanyID: result.insertId,
          Name,
          DateCreated: dateCreated
        }));
      });
      return;
    }

    // Update an existing company by ID
    if (req.method === "PUT" && idMatch) {
      const companyId = idMatch[1];
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { Name } = JSON.parse(body);
        if (!Name) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required field: Name" }));
            return;
        }

        const [result] = await db.query(
          "UPDATE Company SET Name = ? WHERE CompanyID = ? AND IsDeleted = 0",
          [Name, companyId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Company not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          CompanyID: companyId,
          Name,
          message: "Company updated successfully"
        }));
      });
      return;
    }

    // Soft delete a company
    if (req.method === "DELETE" && idMatch) {
      const companyId = idMatch[1];
      const [result] = await db.query(
        "UPDATE Company SET IsDeleted = 1 WHERE CompanyID = ?",
        [companyId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Company not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Company soft deleted successfully" }));
      return;
    }

    // Fallback for unsupported routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Company endpoint not found" }));

  } catch (err) {
    console.error("Company route error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}