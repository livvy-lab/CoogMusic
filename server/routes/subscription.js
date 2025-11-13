import db from "../db.js";
import { parse } from "url";
import http from "http";
import url from "url";


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
    // GET all available subscription plans
    if (pathname === "/subscription-plans" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM SubscriptionPlan");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET all subscriptions (admin)
    if (pathname === "/subscriptions" && method === "GET") {
      const [rows] = await db.query("SELECT * FROM Subscription WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // GET active subscription for a specific listener
    if (pathname.startsWith("/subscriptions/listener/") && method === "GET") {
      const listenerId = pathname.split("/")[3]; // 0='', 1='subscriptions', 2='listener', 3=listenerId
      console.log("📡 Received request for listenerId:", listenerId);
      
      // Updated query to JOIN SubscriptionPlan
      const [rows] = await db.query(
        "SELECT s.*, sp.PlanName, sp.Cost FROM Subscription s JOIN SubscriptionPlan sp ON s.PlanID = sp.PlanID WHERE s.ListenerID = ? AND s.IsActive = 1 AND s.IsDeleted = 0",
        [listenerId]
      );

      console.log("🗂 DB result:", rows);
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No active subscription found for this listener" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // GET one subscription by ID
    if (pathname.startsWith("/subscriptions/") && method === "GET" && !pathname.includes("/listener/")) {
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
          const data = JSON.parse(body);
          console.log("Received body:", data);

          const { ListenerID, DateStarted, DateEnded, IsActive, PlanID } = data;

          if (!ListenerID || !DateStarted || !PlanID) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required fields: ListenerID, DateStarted, PlanID" }));
            return;
          }

          console.log("Inserting into DB:", [ListenerID, DateStarted, DateEnded || null, IsActive ?? 1, PlanID]);

          try {
            const [result] = await db.query(
              "INSERT INTO Subscription (ListenerID, DateStarted, DateEnded, IsActive, PlanID) VALUES (?, ?, ?, ?, ?)",
              [ListenerID, DateStarted, DateEnded || null, IsActive ?? 1, PlanID]
            );

            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              SubscriptionID: result.insertId,
              ListenerID,
              DateStarted,
              DateEnded: DateEnded || null,
              IsActive: IsActive ?? 1,
              PlanID,
            }));
          } catch (dbErr) {
            console.error("Database error during INSERT:", dbErr);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Database insert failed", details: dbErr.message }));
          }
        } catch (err) {
          console.error("Error parsing or processing POST /subscriptions:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body", receivedBody: body }));
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
          const { ListenerID, DateStarted, DateEnded, IsActive, PlanID } = JSON.parse(body);

          const fields = [];
          const params = [];

          if (ListenerID !== undefined) { fields.push("ListenerID = ?"); params.push(ListenerID); }
          if (DateStarted !== undefined) { fields.push("DateStarted = ?"); params.push(DateStarted); }
          if (PlanID !== undefined) { fields.push("PlanID = ?"); params.push(PlanID); }

          // Set DateEnded automatically if IsActive is being set to 0
          if (IsActive === 0) {
            fields.push("DateEnded = ?");
            params.push(new Date().toISOString().slice(0, 19).replace('T', ' ')); // MySQL DATETIME format
          } else if (DateEnded !== undefined) {
            fields.push("DateEnded = ?");
            params.push(DateEnded);
          }

          if (IsActive !== undefined) { fields.push("IsActive = ?"); params.push(IsActive); }

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

          const [updatedRows] = await db.query(
            "SELECT * FROM Subscription WHERE SubscriptionID = ?",
            [subscriptionId]
          );

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(updatedRows[0]));
        } catch (err) {
          console.error("Error in PUT /subscriptions/:id:", err);
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