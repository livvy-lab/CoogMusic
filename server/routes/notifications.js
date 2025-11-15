import db from "../db.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

export async function handleNotificationRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    // GET /notifications/:listenerId - Get last 10 notifications
    const matchGet = pathname.match(/^\/notifications\/(\d+)$/);
    if (method === "GET" && matchGet) {
      const listenerId = Number(matchGet[1]);
      
      const [rows] = await db.query(
        `SELECT 
          n.NotificationID,
          n.ListenerID,
          n.ArtistID,
          n.ContentID AS SongID,
          n.Type AS NotificationType,
          n.ContentTitle AS SongTitle,
          n.Message,
          n.IsRead,
          n.CreatedAt,
          a.ArtistName,
          m.bucket AS ArtistImageBucket,
          m.s3_key AS ArtistImageS3Key,
          m.url AS ArtistImageUrl
        FROM Notification n
        LEFT JOIN Artist a ON n.ArtistID = a.ArtistID
        LEFT JOIN Media m ON a.image_media_id = m.MediaID
        WHERE n.ListenerID = ?
          AND COALESCE(n.IsDeleted, 0) = 0
        ORDER BY n.CreatedAt DESC
        LIMIT 10`,
        [listenerId]
      );

      // Generate signed URLs for artist images
      const notifications = await Promise.all(
        rows.map(async (row) => {
          let artistImageUrl = null;
          if (row.ArtistImageBucket && row.ArtistImageS3Key) {
            try {
              artistImageUrl = await getSignedUrl(
                s3,
                new GetObjectCommand({
                  Bucket: row.ArtistImageBucket,
                  Key: row.ArtistImageS3Key
                }),
                { expiresIn: 3600 }
              );
            } catch (err) {
              artistImageUrl = row.ArtistImageUrl || null;
            }
          }

          return {
            notificationId: row.NotificationID,
            listenerId: row.ListenerID,
            artistId: row.ArtistID,
            songId: row.SongID,
            type: row.NotificationType,
            message: row.Message,
            isRead: Boolean(row.IsRead),
            createdAt: row.CreatedAt,
            artistName: row.ArtistName,
            songTitle: row.SongTitle,
            artistImageUrl
          };
        })
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(notifications));
      return;
    }

    // GET /notifications/:listenerId/unread-count - Get count of unread notifications
    const matchCount = pathname.match(/^\/notifications\/(\d+)\/unread-count$/);
    if (method === "GET" && matchCount) {
      const listenerId = Number(matchCount[1]);
      
      const [[row]] = await db.query(
        `SELECT COUNT(*) AS unreadCount
        FROM Notification
        WHERE ListenerID = ?
          AND IsRead = 0
          AND COALESCE(IsDeleted, 0) = 0`,
        [listenerId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ unreadCount: row?.unreadCount || 0 }));
      return;
    }

    // PUT /notifications/mark-read - Mark notifications as read
    if (method === "PUT" && pathname === "/notifications/mark-read") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { listenerId, notificationIds } = JSON.parse(body);

          if (!listenerId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "listenerId is required" }));
            return;
          }

          // If specific notification IDs provided, mark those as read
          // Otherwise mark all as read for the listener
          if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
            const placeholders = notificationIds.map(() => "?").join(",");
            await db.query(
              `UPDATE Notification 
              SET IsRead = 1 
              WHERE ListenerID = ? 
                AND NotificationID IN (${placeholders})
                AND COALESCE(IsDeleted, 0) = 0`,
              [listenerId, ...notificationIds]
            );
          } else {
            // Mark all as read
            await db.query(
              `UPDATE Notification 
              SET IsRead = 1 
              WHERE ListenerID = ? 
                AND IsRead = 0
                AND COALESCE(IsDeleted, 0) = 0`,
              [listenerId]
            );
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          console.error("Error marking notifications as read:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to mark notifications as read" }));
        }
      });
      return;
    }

    // No matching route
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Notification endpoint not found" }));
  } catch (err) {
    console.error("Notification route error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
