import db from "../db.js";
import { parse } from "url";

export async function handleAdminUserRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Content-Type", "application/json");

  try {
    // GET ALL USERS (Listeners + Artists, including Deleted)
    if (pathname === "/admin/users" && method === "GET") {
      /* UPDATED QUERY:
         1. Removed "WHERE a.IsDeleted = 0" so we see everyone.
         2. Selected "a.IsDeleted" to track account status.
         3. Joined "Subscription" to check for active premium status.
      */
      const sql = `
        SELECT 
          a.AccountID, 
          a.Username, 
          a.AccountType, 
          a.DateCreated,
          a.IsDeleted,
          l.ListenerID, 
          CONCAT(l.FirstName, ' ', l.LastName) as ListenerName,
          ar.ArtistID, 
          ar.ArtistName, 
          ar.IsVerified,
          -- Check if a Listener has ANY active, non-deleted subscription
          (SELECT COUNT(*) FROM Subscription s 
           WHERE s.ListenerID = l.ListenerID 
           AND s.IsActive = 1 
           AND s.IsDeleted = 0) as HasActiveSub
        FROM AccountInfo a
        LEFT JOIN Listener l ON a.AccountID = l.AccountID
        LEFT JOIN Artist ar ON a.AccountID = ar.AccountID
        WHERE a.AccountType IN ('Listener', 'Artist')
        ORDER BY a.IsDeleted ASC, a.DateCreated DESC
      `;

      const [rows] = await db.query(sql);
      res.writeHead(200);
      res.end(JSON.stringify(rows));
      return;
    }

    // DELETE USER (Soft Delete)
    if (pathname.startsWith("/admin/users/") && method === "DELETE") {
      const accountId = pathname.split("/")[3];
      
      if (!accountId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Account ID required" }));
        return;
      }

      // Soft delete Account, Listener, and Artist tables
      await db.query("UPDATE AccountInfo SET IsDeleted = 1 WHERE AccountID = ?", [accountId]);
      await db.query("UPDATE Listener SET IsDeleted = 1 WHERE AccountID = ?", [accountId]);
      await db.query("UPDATE Artist SET IsDeleted = 1 WHERE AccountID = ?", [accountId]);

      res.writeHead(200);
      res.end(JSON.stringify({ message: "User deactivated successfully" }));
      return;
    }

    // VERIFY ARTIST
    if (pathname.startsWith("/admin/artists/") && pathname.endsWith("/verify") && method === "PUT") {
      const parts = pathname.split("/");
      const artistId = parts[3];

      if (!artistId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Artist ID required" }));
        return;
      }

      await db.query("UPDATE Artist SET IsVerified = 1 WHERE ArtistID = ?", [artistId]);

      res.writeHead(200);
      res.end(JSON.stringify({ message: "Artist verified successfully" }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Route not found" }));

  } catch (err) {
    console.error("Admin User Route Error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Server error processing user request" }));
  }
}