import db from "../db.js";
import { parse } from "url";

function parseSqlBoolean(value) {
  if (Buffer.isBuffer(value)) {
    return value[0] === 1;
  }
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
    // 1. All plans
    if (pathname === "/subscription-plans" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM SubscriptionPlan");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // 2. Status for PlayerContext: /subscriptions/status/:listenerId
    if (pathname.startsWith("/subscriptions/status/") && method === "GET") {
      const listenerIdRaw = pathname.split("/")[3];
      const listenerId = parseInt(listenerIdRaw, 10);

      console.log(`\n[DEBUG] Checking subscription for ListenerID: ${listenerId}`);

      try {
        const [rows] = await db.query(
          "SELECT SubscriptionID, IsActive, IsDeleted FROM Subscription WHERE ListenerID = ? AND IsDeleted = 0",
          [listenerId]
        );

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

    // 3. Active subscription details: /subscriptions/listener/:listenerId
    if (pathname.startsWith("/subscriptions/listener/") && method === "GET") {
      const listenerId = pathname.split("/")[3];
      const [rows] = await db.query(
        `
        SELECT s.*, sp.PlanName, sp.Cost
        FROM Subscription s
        JOIN SubscriptionPlan sp ON s.PlanID = sp.PlanID
        WHERE s.ListenerID = ?
          AND s.IsDeleted = 0
          AND s.IsActive = 1
        ORDER BY s.DateStarted DESC
        LIMIT 1
        `,
        [listenerId]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No active subscription found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // 4. GET all subscriptions
    if (pathname === "/subscriptions" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Subscription WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // 5. GET one subscription
    if (pathname.startsWith("/subscriptions/") && method === "GET") {
      const subscriptionId = pathname.split("/")[2];
      const [rows] = await db.query(
        "SELECT * FROM Subscription WHERE SubscriptionID = ? AND IsDeleted = 0",
        [subscriptionId]
      );
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Subscription not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // 6. POST: create / switch subscription
    if (pathname === "/subscriptions" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          const { ListenerID, DateStarted, DateEnded, IsActive, PlanID } = data;

          if (!ListenerID || !PlanID) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "ListenerID and PlanID are required" }));
            return;
          }

          await db.query(
            `
            UPDATE Subscription
            SET IsActive = 0,
                DateEnded = IF(DateEnded IS NULL, NOW(), DateEnded)
            WHERE ListenerID = ?
              AND IsActive = 1
              AND IsDeleted = 0
            `,
            [ListenerID]
          );

          const [result] = await db.query(
            `
            INSERT INTO Subscription (ListenerID, DateStarted, DateEnded, IsActive, IsDeleted, PlanID)
            VALUES (?, ?, ?, ?, 0, ?)
            `,
            [
              ListenerID,
              DateStarted || new Date(),
              DateEnded || null,
              IsActive ?? 1,
              PlanID,
            ]
          );

          const [rows] = await db.query(
            `
            SELECT s.*, sp.PlanName, sp.Cost
            FROM Subscription s
            JOIN SubscriptionPlan sp ON s.PlanID = sp.PlanID
            WHERE s.SubscriptionID = ?
            `,
            [result.insertId]
          );

          const created = rows[0] || { SubscriptionID: result.insertId, ...data };

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(created));
        } catch (err) {
          console.error("Error creating subscription:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // 7. PUT: update a subscription (used for unsubscribe)
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
          const [result] = await db.query(
            `UPDATE Subscription SET ${setClause} WHERE SubscriptionID = ?`,
            values
          );

          if (result.affectedRows === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found" }));
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          console.error("Error updating subscription:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    // 8. DELETE: soft delete
    if (pathname.startsWith("/subscriptions/") && method === "DELETE") {
      const subscriptionId = pathname.split("/")[2];
      await db.query(
        "UPDATE Subscription SET IsDeleted = 1, IsActive = 0 WHERE SubscriptionID = ?",
        [subscriptionId]
      );
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
