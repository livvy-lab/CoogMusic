import db from "../db.js";
import { parse } from "url";

export async function handleAdminUserRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Content-Type", "application/json");

  try {
    if (pathname === "/admin/users" && method === "GET") {
      const sql = `
        SELECT 
          a.AccountID, 
          a.Username, 
          a.AccountType, 
          a.DateCreated,
          a.IsDeleted,
          MAX(l.ListenerID) as ListenerID, 
          MAX(CONCAT(l.FirstName, ' ', l.LastName)) as ListenerName,
          MAX(ar.ArtistID) as ArtistID, 
          MAX(ar.ArtistName) as ArtistName, 
          MAX(ar.IsVerified) as IsVerified,
          
          -- Check if a Listener has ANY active, non-deleted subscription
          (SELECT COUNT(*) FROM Subscription s 
           WHERE s.ListenerID = MAX(l.ListenerID) 
           AND s.IsActive = 1 
           AND s.IsDeleted = 0) as HasActiveSub

        FROM AccountInfo a
        LEFT JOIN Listener l ON a.AccountID = l.AccountID
        LEFT JOIN Artist ar ON a.AccountID = ar.AccountID
        WHERE a.AccountType IN ('Listener', 'Artist')
        GROUP BY a.AccountID
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