import db from "../db.js";
import { parse } from "url";

export async function handleCompanyBuyRoutes(req, res) {
  const url = parse(req.url, true);
  const idMatch = url.pathname.match(/^\/company_buys\/(\d+)$/);

  try {
    // Return all company ad purchases not soft deleted
    if (req.method === "GET" && url.pathname === "/company_buys") {
      const [rows] = await db.query("SELECT * FROM Company_Buy WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // Return a single company ad purchase
    if (req.method === "GET" && idMatch) {
      const buyId = idMatch[1];
      const [rows] = await db.query("SELECT * FROM Company_Buy WHERE BuyID = ? AND IsDeleted = 0", [buyId]);
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Company ad purchase not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // Add a new company ad purchase
    if (req.method === "POST" && url.pathname === "/company_buys") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { AdID, CompanyID, Cost, StartDate, EndDate } = JSON.parse(body);
        if (!AdID || !CompanyID || Cost === undefined || !StartDate || !EndDate) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        const purchaseDate = new Date().toISOString().slice(0, 10);

        const [result] = await db.query(
          "INSERT INTO Company_Buy (AdID, CompanyID, Cost, PurchaseDate, StartDate, EndDate) VALUES (?, ?, ?, ?, ?, ?)",
          [AdID, CompanyID, Cost, purchaseDate, StartDate, EndDate]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          BuyID: result.insertId,
          AdID,
          CompanyID,
          Cost,
          PurchaseDate: purchaseDate,
          StartDate,
          EndDate
        }));
      });
      return;
    }

    // Update an existing company ad purchase by ID
    if (req.method === "PUT" && idMatch) {
      const buyId = idMatch[1];
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { AdID, CompanyID, Cost, StartDate, EndDate } = JSON.parse(body);

        if (!AdID || !CompanyID || Cost === undefined || !StartDate || !EndDate) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required fields for update" }));
            return;
        }

        const [result] = await db.query(
          "UPDATE Company_Buy SET AdID = ?, CompanyID = ?, Cost = ?, StartDate = ?, EndDate = ? WHERE BuyID = ? AND IsDeleted = 0",
          [AdID, CompanyID, Cost, StartDate, EndDate, buyId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Company ad purchase not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          BuyID: buyId,
          message: "Company ad purchase updated successfully"
        }));
      });
      return;
    }

    // Soft delete a company ad purchase
    if (req.method === "DELETE" && idMatch) {
      const buyId = idMatch[1];
      const [result] = await db.query(
        "UPDATE Company_Buy SET IsDeleted = 1 WHERE BuyID = ?",
        [buyId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Company ad purchase not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Company ad purchase soft deleted successfully" }));
      return;
    }

    // Fallback for unsupported routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Company_Buy endpoint not found" }));

  } catch (err) {
    console.error("Company_Buy route error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}