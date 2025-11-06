import db from "../db.js";
import { parse } from "url";

export async function handleAchievements(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  
  const match = pathname.match(/\/listener\/(\d+)/); 
  const listenerId = match ? match[1] : null;
  
  if (!listenerId) { 
    console.error(`[DEBUG] Achievement Handler: ID check failed! Pathname was: ${pathname}`);
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid or missing listener ID" }));
    return;
  }

  try {
    const [badges] = await db.query(
      `
      SELECT
          a.AchievementID,    -- Added this for a stable React key
          a.Name,
          a.Description,
          a.IconURL,
          la.DateEarned,
          la.DisplayOnProfile  -- <-- This is the new, crucial field
      FROM Listener_Achievement la
      JOIN Achievement a ON la.AchievementID = a.AchievementID
      WHERE la.ListenerID = ?;
      `,
      [listenerId]
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(badges));

  } catch (e) {
    console.error("Error fetching achievements:", e);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}