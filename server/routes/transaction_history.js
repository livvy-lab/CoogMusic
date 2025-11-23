import db from "../db.js";
import { parse } from "url";

export async function handleTransactionHistoryRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // GET /transaction-history/listener/:listenerId
    // Fetch all subscription transactions for a listener
    if (pathname.startsWith("/transaction-history/listener/") && method === "GET") {
      const listenerId = pathname.split("/")[3];
      console.log(`[Transaction History] Fetching listener transactions for ID: ${listenerId}`);

      try {
        const [rows] = await db.query(
          `
          SELECT 
            s.SubscriptionID,
            CONVERT_TZ(s.DateStarted, '+00:00', '-06:00') AS DateStarted,
            s.DateEnded,
            s.IsActive,
            sp.PlanName,
            sp.Cost AS Amount,
            NULL AS DurationMonths,
            'Subscription' AS TransactionType
          FROM Subscription s
          JOIN SubscriptionPlan sp ON s.PlanID = sp.PlanID
          WHERE s.ListenerID = ? AND s.IsDeleted = 0
          ORDER BY s.DateStarted DESC
          `,
          [listenerId]
        );

        console.log(`[Transaction History] Found ${rows.length} transactions for listener ${listenerId}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(rows));
        return;
      } catch (queryErr) {
        console.error(`[Transaction History] Query error for listener ${listenerId}:`, queryErr);
        throw queryErr;
      }
    }

    // GET /transaction-history/artist/:artistId
    // Fetch all ad purchase transactions for an artist
    if (pathname.startsWith("/transaction-history/artist/") && method === "GET") {
      const artistId = pathname.split("/")[3];
      console.log(`[Transaction History] Fetching artist transactions for ID: ${artistId}`);

      const [rows] = await db.query(
        `
        SELECT 
          ab.BuyID,
          CONVERT_TZ(ab.PurchaseDate, '+00:00', '-06:00') AS PurchaseDate,
          ab.AdID,
          a.AdName,
          CASE 
            WHEN a.AdType = 'audio' THEN 5.00
            WHEN a.AdType = 'banner' THEN 2.50
            ELSE a.Cost
          END AS Amount,
          a.AdType,
          'Ad Purchase' AS TransactionType
        FROM Artist_Buy ab
        JOIN Advertisement a ON ab.AdID = a.AdID
        WHERE ab.ArtistID = ? AND ab.IsDeleted = 0
        ORDER BY ab.PurchaseDate DESC
        `,
        [artistId]
      );

      console.log(`[Transaction History] Found ${rows.length} transactions for artist ${artistId}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    console.log(`[Transaction History] Route not found: ${pathname}`);
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));

  } catch (err) {
    console.error("Error in transaction history routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error", details: err.message }));
  }
}
