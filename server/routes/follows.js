import db from "../db.js";
import { parse } from "url";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

async function getUserByIdAndType(id, type) {
  try {
    let row = null;
    if (type === "Listener") {
      const [rows] = await db.query(
        `SELECT
           L.ListenerID as id,
           CONCAT(L.FirstName, ' ', L.LastName) as name,
           AI.Username as username,
           M.MediaID as mediaId,
           M.url as canonicalUrl,
           M.bucket as bucket,
           M.s3_key as s3Key,
           'Listener' as type
         FROM Listener L
         JOIN AccountInfo AI ON L.AccountID = AI.AccountID
         LEFT JOIN Media M ON L.image_media_id = M.MediaID
         WHERE L.ListenerID = ?`,
        [id]
      );
      row = rows[0];
    } else if (type === "Artist") {
      const [rows] = await db.query(
        `SELECT
           A.ArtistID as id,
           A.ArtistName as name,
           AI.Username as username,
           M.MediaID as mediaId,
           M.url as canonicalUrl,
           M.bucket as bucket,
           M.s3_key as s3Key,
           'Artist' as type
         FROM Artist A
         JOIN AccountInfo AI ON A.AccountID = AI.AccountID
         LEFT JOIN Media M ON A.image_media_id = M.MediaID
         WHERE A.ArtistID = ?`,
        [id]
      );
      row = rows[0];
    }
    if (!row) return null;

    let avatarUrl = "";
    if (row.mediaId && row.bucket && row.s3Key) {
      try {
        avatarUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: row.bucket, Key: row.s3Key }),
          { expiresIn: 3600 }
        );
      } catch (err) {
        avatarUrl = row.canonicalUrl || "";
      }
    }

    return {
      id: row.id,
      name: row.name,
      username: row.username,
      avatarUrl,
      type: row.type,
    };
  } catch (error) {
    console.error("Error in getUserByIdAndType:", error);
    return null;
  }
}

export async function handleFollowsRoutes(req, res) {
  const url = parse(req.url, true);

  // Set CORS headers for all requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
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

    if (req.method === "GET" && url.pathname === "/follows/artist-followers") {
      const { artistId } = url.query;
      if (!artistId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "artistId is required" }));
        return;
      }
      const [[row]] = await db.query(
        "SELECT COUNT(*) AS FollowerCount FROM Follows WHERE FollowingID = ? AND FollowingType = 'Artist'",
        [artistId]
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ artistId, followerCount: Number(row?.FollowerCount || 0) }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/follows") {
      const { userId, userType, tab } = url.query;
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
      const [rows] = await db.query("SELECT * FROM Follows");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

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
        if (FollowerID === FollowingID && FollowerType === FollowingType) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "A user cannot follow themselves." }));
          return;
        }
        const followDate = new Date().toISOString().slice(0, 10);
        try {
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
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "This follow relationship already exists." }));
            return;
          }
          throw err;
        }
      });
      return;
    }

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
