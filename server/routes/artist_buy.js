import db from "../db.js";
import { parse } from "url";

export async function handleArtistBuyRoutes(req, res) {
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
    // GET all ad purchases (Admin view)
    if (pathname === "/artist_buys" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Artist_Buy WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // POST: Manually record a transaction (if needed separate from upload)
    if (pathname === "/artist_buys" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { AdID, ArtistID } = JSON.parse(body);

          if (!AdID || !ArtistID) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "AdID and ArtistID are required" }));
            return;
          }

          const [result] = await db.query(
            "INSERT INTO Artist_Buy (AdID, ArtistID, PurchaseDate, IsDeleted) VALUES (?, ?, NOW(), 0)",
            [AdID, ArtistID]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            BuyID: result.insertId,
            AdID,
            ArtistID,
            message: "Ad purchase recorded successfully"
          }));
        } catch (err) {
          console.error("Error recording ad buy:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Database error" }));
        }
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));

  } catch (err) {
    console.error("Error in artist_buy routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}