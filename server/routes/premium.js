// server/routes/premium.js
import db from "../db.js";

export async function handlePremiumRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // GET /premium/check/:listenerId - Check if listener has active premium
    const checkMatch = pathname.match(/^\/premium\/check\/(\d+)$/);
    if (checkMatch && method === "GET") {
      const listenerId = Number(checkMatch[1]);

      const [[result]] = await db.query(
        `SELECT 
          s.SubscriptionID,
          s.DateStarted,
          s.DateEnded,
          s.IsActive,
          CASE 
            WHEN s.DateEnded IS NULL THEN 1
            WHEN s.DateEnded >= CURDATE() THEN 1
            ELSE 0
          END AS HasActivePremium,
          CASE 
            WHEN s.DateEnded IS NULL THEN NULL
            ELSE DATEDIFF(s.DateEnded, CURDATE())
          END AS DaysRemaining
        FROM Subscription s
        WHERE s.ListenerID = ?
          AND s.IsActive = 1
          AND COALESCE(s.IsDeleted, 0) = 0
          AND (s.DateEnded IS NULL OR s.DateEnded >= CURDATE())
        ORDER BY s.DateStarted DESC
        LIMIT 1`,
        [listenerId]
      );

      if (!result) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          listenerId,
          isPremium: false,
          hasActiveSubscription: false
        }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        listenerId,
        isPremium: true,
        hasActiveSubscription: true,
        subscription: {
          subscriptionId: result.SubscriptionID,
          dateStarted: result.DateStarted,
          dateEnded: result.DateEnded,
          daysRemaining: result.DaysRemaining,
          isLifetime: result.DateEnded === null
        }
      }));
      return;
    }

    // POST /premium/subscribe - Create new subscription for listener
    if (pathname === "/premium/subscribe" && method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { listenerId, durationMonths } = JSON.parse(body || "{}");

          if (!listenerId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "listenerId is required" }));
            return;
          }

          // Calculate end date (null for lifetime, or add months)
          let dateEnded = null;
          if (durationMonths && durationMonths > 0) {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + durationMonths);
            dateEnded = endDate.toISOString().split('T')[0];
          }

          // Insert new subscription
          const [result] = await db.query(
            `INSERT INTO Subscription (ListenerID, DateStarted, DateEnded, IsActive, IsDeleted)
             VALUES (?, CURDATE(), ?, 1, 0)`,
            [listenerId, dateEnded]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            success: true,
            subscriptionId: result.insertId,
            listenerId,
            dateStarted: new Date().toISOString().split('T')[0],
            dateEnded,
            message: dateEnded 
              ? `Premium subscription activated for ${durationMonths} months` 
              : "Lifetime premium subscription activated"
          }));
        } catch (err) {
          console.error("Error creating subscription:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to create subscription" }));
        }
      });
      return;
    }

    // PUT /premium/cancel/:subscriptionId - Cancel a subscription
    if (pathname.match(/^\/premium\/cancel\/(\d+)$/) && method === "PUT") {
      const subscriptionId = Number(pathname.split("/")[3]);

      await db.query(
        `UPDATE Subscription 
         SET IsActive = 0, DateEnded = CURDATE()
         WHERE SubscriptionID = ?`,
        [subscriptionId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        message: "Subscription cancelled successfully"
      }));
      return;
    }

    // GET /premium/status/:listenerId - Get detailed subscription status
    if (pathname.match(/^\/premium\/status\/(\d+)$/) && method === "GET") {
      const listenerId = Number(pathname.split("/")[3]);

      const [subscriptions] = await db.query(
        `SELECT 
          SubscriptionID,
          DateStarted,
          DateEnded,
          IsActive,
          CASE 
            WHEN DateEnded IS NULL THEN 'Lifetime'
            WHEN DateEnded < CURDATE() THEN CONCAT('Expired ', DATEDIFF(CURDATE(), DateEnded), ' days ago')
            ELSE CONCAT('Active - ', DATEDIFF(DateEnded, CURDATE()), ' days remaining')
          END AS Status
        FROM Subscription
        WHERE ListenerID = ?
          AND COALESCE(IsDeleted, 0) = 0
        ORDER BY DateStarted DESC`,
        [listenerId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        listenerId,
        subscriptions
      }));
      return;
    }

    // No matching route
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Premium route not found" }));

  } catch (err) {
    console.error("Premium route error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
