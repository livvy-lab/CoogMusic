import db from "../db.js";
import { parse } from "url";

export async function handleListenerFavoriteArtist(req, res) {
  const { pathname, query } = parse(req.url, true);
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
    // Extract listenerID from path: /listeners/:id/favorite-artists
    const parts = pathname.split("/");
    const listenerId = parts[2];

    if (!listenerId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "ListenerID required in path" }));
      return;
    }

    if (method === "GET") {
      const [rows] = await db.query(
        `SELECT ListenerID, ArtistID, RankTiny AS Rank, DateAdded
         FROM Listener_Favorite_Artist
         WHERE ListenerID = ?
         ORDER BY RankTiny ASC`,
        [listenerId]
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    if (method === "PUT") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const items = JSON.parse(body || "[]");
        const clean = Array.isArray(items)
          ? items
              .map(x => ({ artistId: +x.artistId, rank: +x.rank }))
              .filter(x => x.artistId > 0 && [1,2,3].includes(x.rank))
          : [];

        if (clean.length > 3) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Maximum 3 favorites allowed" }));
          return;
        }

        const conn = await db.getConnection();
        try {
          await conn.beginTransaction();
          await conn.query(`DELETE FROM Listener_Favorite_Artist WHERE ListenerID = ?`, [listenerId]);
          if (clean.length) {
            const values = clean.map(x => [listenerId, x.artistId, x.rank]);
            await conn.query(
              `INSERT INTO Listener_Favorite_Artist (ListenerID, ArtistID, RankTiny) VALUES ?`,
              [values]
            );
          }
          await conn.commit();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Favorites replaced successfully" }));
        } catch (e) {
          await conn.rollback();
          console.error("Transaction failed:", e);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Database transaction failed" }));
        } finally {
          conn.release();
        }
      });
      return;
    }

    if (method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { artistId, rank } = JSON.parse(body || "{}");
        if (!artistId || ![1,2,3].includes(+rank)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "artistId and rank (1-3) required" }));
          return;
        }

        await db.query(
          `INSERT INTO Listener_Favorite_Artist (ListenerID, ArtistID, RankTiny)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE ArtistID = VALUES(ArtistID), DateAdded = CURRENT_TIMESTAMP`,
          [listenerId, artistId, rank]
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Favorite upserted successfully" }));
      });
      return;
    }

    if (method === "DELETE") {
      const rank = +query.rank;
      if (![1,2,3].includes(rank)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "rank query parameter (1-3) required" }));
        return;
      }

      const [result] = await db.query(
        `DELETE FROM Listener_Favorite_Artist WHERE ListenerID = ? AND RankTiny = ?`,
        [listenerId, rank]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Nothing to delete" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Favorite removed successfully" }));
      return;
    }

    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (err) {
    console.error("Error handling favorite artists route:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
