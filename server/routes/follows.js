import db from "../db.js";
import { parse } from "url";

export async function handleFollowsRoutes(req, res) {
  const url = parse(req.url, true);

  try {
    // Return all follow relationships
    if (req.method === "GET" && url.pathname === "/follows") {
      const [rows] = await db.query("SELECT * FROM Follows");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // Create a new follow relationship
    if (req.method === "POST" && url.pathname === "/follows") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { FollowerID, FollowerType, FollowingID, FollowingType } = JSON.parse(body);

        if (!FollowerID || !FollowerType || !FollowingID || !FollowingType) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields" }));
          return;
        }

        const followDate = new Date().toISOString().slice(0, 10);

        const [result] = await db.query(
          "INSERT INTO Follows (FollowerID, FollowerType, FollowingID, FollowingType, FollowDate) VALUES (?, ?, ?, ?, ?)",
          [FollowerID, FollowerType, FollowingID, FollowingType, followDate]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          message: "Follow relationship created successfully",
          FollowerID,
          FollowerType,
          FollowingID,
          FollowingType,
          FollowDate: followDate
        }));
      });
      return;
    }

    // Remove a follow relationship
    if (req.method === "DELETE" && url.pathname === "/follows") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { FollowerID, FollowerType, FollowingID, FollowingType } = JSON.parse(body);

        if (!FollowerID || !FollowerType || !FollowingID || !FollowingType) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields in body to identify follow relationship" }));
          return;
        }

        const [result] = await db.query(
          "DELETE FROM Follows WHERE FollowerID = ? AND FollowerType = ? AND FollowingID = ? AND FollowingType = ?",
          [FollowerID, FollowerType, FollowingID, FollowingType]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Follow relationship not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Follow relationship deleted successfully" }));
      });
      return;
    }

    // Fallback for unsupported routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Follows endpoint not found" }));

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "This follow relationship already exists." }));
        return;
    }
    console.error("Follows route error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}