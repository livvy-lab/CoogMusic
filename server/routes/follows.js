import db from "../db.js";
import { parse } from "url";

async function getUserByIdAndType(id, type) {
  try {
    if (type === "Listener") {
      const [rows] = await db.query(
        `SELECT
           L.ListenerID as id,
           CONCAT(L.FirstName, ' ', L.LastName) as name,
           AI.Username as username,
           L.PFP as avatarUrl,
           'Listener' as type
         FROM Listener L
         JOIN AccountInfo AI ON L.AccountID = AI.AccountID
         WHERE L.ListenerID = ?`,
        [id]
      );
      return rows[0];
    } else if (type === "Artist") {
      const [rows] = await db.query(
        `SELECT
           A.ArtistID as id,
           A.ArtistName as name,
           AI.Username as username,
           A.PFP as avatarUrl,
           'Artist' as type
         FROM Artist A
         JOIN AccountInfo AI ON A.AccountID = AI.AccountID
         WHERE A.ArtistID = ?`,
        [id]
      );
      return rows[0];
    }
  } catch (error) {
    console.error("Error in getUserByIdAndType:", error);
    return null;
  }
  return null;
}

export async function handleFollowsRoutes(req, res) {
  const url = parse(req.url, true);

  try {
    // Check follow relationship
    if (req.method === "GET" && url.pathname === "/follows/relationship") {
      const { followerId, followerType, followingId, followingType } = url.query;

      if (!followerId || !followerType || !followingId || !followingType) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required parameters" }));
        return;
      }

      const [rows] = await db.query(
        "SELECT 1 FROM Follows WHERE FollowerID = ? AND FollowerType = ? AND FollowingID = ? AND FollowingType = ?",
        [followerId, followerType, followingId, followingType]
      );
      const isFollowing = rows.length > 0;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ isFollowing }));
      return;
    }

    // Get follow list
    if (req.method === "GET" && url.pathname === "/follows") {
      const { userId, userType, tab } = url.query;

      // Followers tab: who FOLLOWS the given user
      if (userId && userType && tab === "followers") {
        const [rows] = await db.query(
          "SELECT FollowerID, FollowerType FROM Follows WHERE FollowingID = ? AND FollowingType = ?",
          [userId, userType]
        );
        const users = await Promise.all(
          rows.map(row => getUserByIdAndType(row.FollowerID, row.FollowerType))
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(users.filter(Boolean)));
        return;
      }

      // Following tab: who is this user FOLLOWING
      if (userId && userType && tab === "following") {
        const [rows] = await db.query(
          "SELECT FollowingID, FollowingType FROM Follows WHERE FollowerID = ? AND FollowerType = ?",
          [userId, userType]
        );
        const users = await Promise.all(
          rows.map(row => getUserByIdAndType(row.FollowingID, row.FollowingType))
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(users.filter(Boolean)));
        return;
      }

      // Fallback: all follows
      const [rows] = await db.query("SELECT * FROM Follows");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // Create follow relationship
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

    // Delete follow relationship
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