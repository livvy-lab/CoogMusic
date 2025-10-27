import db from "../db.js";
import { parse } from "url";

export async function handleSubscriptionRoutes(req, res) {
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
    // GET all subscriptions
    if (pathname === "/subscriptions" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Subscription WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET one subscription by ID
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

    // POST new subscription
    if (pathname === "/subscriptions" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { ListenerID, SubscriptionID, DateStarted, DateEnded, Active } = JSON.parse(body);

          if (!ListenerID || !SubscriptionID || !DateStarted) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required fields: ListenerID, SubscriptionID, StartDate" }));
            return;
          }

          const [result] = await db.query(
            "INSERT INTO Subscription (ListenerID, PlanID, DateStarted, DateEnded, Active) VALUES (?, ?, ?, ?, ?)",
            [ListenerID, SubscriptionID, DateStarted, DateEnded || null, Active !== undefined ? Active : 1]
          );

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              SubscriptionID: result.insertId,
              ListenerID,
              DateStarted,
              DateEnded: DateEnded || null,
              Active: Active !== undefined ? Active : 1,
            })
          );
        } catch (err) {
          console.error("Error parsing request body for POST /subscriptions:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // PUT update subscription
    if (pathname.startsWith("/subscriptions/") && method === "PUT") {
      const subscriptionId = pathname.split("/")[2];
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { ListenerID, SubscriptionID, DateStarted, DateEnded, Active } = JSON.parse(body);

          // build dynamic update to allow partial updates
          const fields = [];
          const params = [];

          if (ListenerID !== undefined) { fields.push("ListenerID = ?"); params.push(ListenerID); }
          if (SubscriptionID !== undefined) { fields.push("SubscriptionID = ?"); params.push(PlanID); }
          if (DateStarted !== undefined) { fields.push("DateStarted = ?"); params.push(StartDate); }
          if (DateEnded !== undefined) { fields.push("DateEnded = ?"); params.push(EndDate); }
          if (Active !== undefined) { fields.push("Active = ?"); params.push(IsActive); }

          if (fields.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "No fields provided to update" }));
            return;
          }

          params.push(subscriptionId);
          const [result] = await db.query(
            `UPDATE Subscription SET ${fields.join(", ")} WHERE SubscriptionID = ? AND IsDeleted = 0`,
            params
          );

          if (result.affectedRows === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Subscription not found" }));
            return;
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              SubscriptionID: subscriptionId,
              message: "Subscription updated successfully",
            })
          );
        } catch (err) {
          console.error("Error parsing request body for PUT /subscriptions/:id:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }

    // DELETE subscription (soft delete)
    if (pathname.startsWith("/subscriptions/") && method === "DELETE") {
      const subscriptionId = pathname.split("/")[2];
      const [result] = await db.query(
        "UPDATE Subscription SET IsDeleted = 1 WHERE SubscriptionID = ?",
        [subscriptionId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Subscription not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Subscription soft deleted successfully" }));
      return;
    }

    // 404 Not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling subscription route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}