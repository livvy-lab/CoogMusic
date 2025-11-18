import db from "../db.js";
import { parse } from "url";

// Helper to safely parse MySQL TINYINT/BIT fields
function parseSqlBoolean(value) {
  // Handle Buffer (common in MySQL for BIT/TINYINT)
  if (Buffer.isBuffer(value)) {
    return value[0] === 1;
  }
  // Handle standard types
  return value === 1 || value === "1" || value === true;
}

export async function handleSubscriptionRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // 1. GET all available subscription plans
    if (pathname === "/subscription-plans" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM SubscriptionPlan");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // 2. GET subscription status for a listener (Used by PlayerContext)
    // Matches: /subscriptions/status/123
    if (pathname.startsWith("/subscriptions/status/") && method === "GET") {
      const listenerIdRaw = pathname.split("/")[3]; // ["", "subscriptions", "status", "123"]
      const listenerId = parseInt(listenerIdRaw, 10);

      console.log(`\n[DEBUG] Checking subscription for ListenerID: ${listenerId}`);

      try {
        const [rows] = await db.query(
          "SELECT SubscriptionID, IsActive, IsDeleted FROM Subscription WHERE ListenerID = ?",
          [listenerId]
        );

        // Robust Filtering
        const active = rows.filter(row => {
          const isActive = parseSqlBoolean(row.IsActive);
          const isDeleted = parseSqlBoolean(row.IsDeleted);
          return isActive && !isDeleted;
        });

        const isSubscribed = active.length > 0;
        console.log(`[DEBUG] Found ${rows.length} subs. Active: ${active.length}. isSubscribed: ${isSubscribed}`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ isSubscribed }));
      } catch (err) {
        console.error("❌ Error checking status:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Server error", isSubscribed: false }));
      }
      return;
    }

    // 3. GET active subscription details (Admin/UI)
    // Matches: /subscriptions/listener/123
    if (pathname.startsWith("/subscriptions/listener/") && method === "GET") {
      const listenerId = pathname.split("/")[3];
      const [rows] = await db.query(
        "SELECT s.*, sp.PlanName, sp.Cost FROM Subscription s JOIN SubscriptionPlan sp ON s.PlanID = sp.PlanID WHERE s.ListenerID = ? AND s.IsDeleted = 0",
        [listenerId]
      );
      
      const activeSub = rows.find(row => parseSqlBoolean(row.IsActive));

      if (!activeSub) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No active subscription found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(activeSub));
      return;
    }

    // 4. Standard GET (all)
    if (pathname === "/subscriptions" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Subscription WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // 5. Standard GET (one)
    if (pathname.startsWith("/subscriptions/") && method === "GET") {
      const subscriptionId = pathname.split("/")[2];
      const [rows] = await db.query("SELECT * FROM Subscription WHERE SubscriptionID = ? AND IsDeleted = 0", [subscriptionId]);
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Subscription not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // 6. POST
    if (pathname === "/subscriptions" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          const { ListenerID, DateStarted, DateEnded, IsActive, PlanID } = data;
          const [result] = await db.query(
            "INSERT INTO Subscription (ListenerID, DateStarted, DateEnded, IsActive, PlanID) VALUES (?, ?, ?, ?, ?)",
            [ListenerID, DateStarted, DateEnded || null, IsActive ?? 1, PlanID]
          );
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ SubscriptionID: result.insertId, ...data }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // 7. PUT
    if (pathname.startsWith("/subscriptions/") && method === "PUT") {
      const subscriptionId = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          const keys = Object.keys(data);
          if (keys.length === 0) {
             res.writeHead(400, { "Content-Type": "application/json" });
             res.end(JSON.stringify({ error: "No fields" }));
             return;
          }
          const setClause = keys.map(k => `${k} = ?`).join(", ");
          const values = [...Object.values(data), subscriptionId];
          const [result] = await db.query(`UPDATE Subscription SET ${setClause} WHERE SubscriptionID = ?`, values);
          
          if (result.affectedRows === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found" })); 
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    // 8. DELETE
    if (pathname.startsWith("/subscriptions/") && method === "DELETE") {
      const subscriptionId = pathname.split("/")[2];
      await db.query("UPDATE Subscription SET IsDeleted = 1 WHERE SubscriptionID = ?", [subscriptionId]);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Deleted" }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));

  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server Error" }));
  }
}