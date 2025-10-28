// server/routes/artist.js
import db from "../db.js";

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export async function handleArtistRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    // ------------------------------------------------------------
    // GET /artists  (list)
    // ------------------------------------------------------------
    if (method === "GET" && pathname === "/artists") {
      const [rows] = await db.query(
        `
        SELECT
          a.ArtistID,
          a.ArtistName,
          a.DateCreated,
          a.Bio,
          a.AccountID,
          a.image_media_id,
          COALESCE(m.url, a.PFP) AS pfpUrl
        FROM Artist a
        LEFT JOIN Media m ON m.MediaID = a.image_media_id
        WHERE COALESCE(a.IsDeleted,0) = 0
        ORDER BY a.ArtistID ASC
        `
      );

      // keep legacy PFP for compatibility with older UI
      return json(res, 200, rows.map(r => ({ ...r, PFP: r.pfpUrl || null })));
    }

    // ------------------------------------------------------------
    // GET /artists/:id  (basic info)
    // ------------------------------------------------------------
    const mGet = pathname.match(/^\/artists\/(\d+)\/?$/);
    if (method === "GET" && mGet) {
      const artistId = Number(mGet[1]);

      const [[row]] = await db.query(
        `
        SELECT
          a.ArtistID,
          a.ArtistName,
          a.DateCreated,
          a.Bio,
          a.AccountID,
          a.image_media_id,
          COALESCE(m.url, a.PFP) AS pfpUrl
        FROM Artist a
        LEFT JOIN Media m ON m.MediaID = a.image_media_id
        WHERE a.ArtistID = ? AND COALESCE(a.IsDeleted,0) = 0
        `,
        [artistId]
      );

      if (!row) return json(res, 404, { error: "Artist not found" });
      return json(res, 200, { ...row, PFP: row.pfpUrl || null });
    }

    // ------------------------------------------------------------
    // POST /artists  (create)
    // Body: { AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id }
    // PFP is optional legacy; image_media_id preferred
    // ------------------------------------------------------------
    if (method === "POST" && pathname === "/artists") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", async () => {
        const {
          AccountID = null,
          ArtistName = "",
          DateCreated = null,
          PFP = null,
          Bio = null,
          image_media_id = null,
        } = JSON.parse(body || "{}");

        const [r] = await db.query(
          `
          INSERT INTO Artist (AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id]
        );

        return json(res, 201, {
          ArtistID: r.insertId,
          AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id, IsDeleted: 0,
        });
      });
      return;
    }

    // ------------------------------------------------------------
    // PUT /artists/:id  (update)
    // Body: { AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id }
    // ------------------------------------------------------------
    const mPut = pathname.match(/^\/artists\/(\d+)\/?$/);
    if (method === "PUT" && mPut) {
      const artistId = Number(mPut[1]);

      let body = "";
      req.on("data", c => body += c);
      req.on("end", async () => {
        const {
          AccountID = null,
          ArtistName = "",
          DateCreated = null,
          PFP = null,
          Bio = null,
          image_media_id = null,
        } = JSON.parse(body || "{}");

        const [r] = await db.query(
          `
          UPDATE Artist
             SET AccountID = ?,
                 ArtistName = ?,
                 DateCreated = ?,
                 PFP = ?,
                 Bio = ?,
                 image_media_id = ?
           WHERE ArtistID = ? AND COALESCE(IsDeleted,0) = 0
          `,
          [AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id, artistId]
        );

        if (!r.affectedRows) return json(res, 404, { error: "Artist not found" });

        return json(res, 200, {
          ArtistID: artistId,
          AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id,
          message: "Artist updated successfully",
        });
      });
      return;
    }

    // ------------------------------------------------------------
    // DELETE /artists/:id  (soft delete)
    // ------------------------------------------------------------
    const mDel = pathname.match(/^\/artists\/(\d+)\/?$/);
    if (method === "DELETE" && mDel) {
      const artistId = Number(mDel[1]);

      const [r] = await db.query(
        `UPDATE Artist SET IsDeleted = 1 WHERE ArtistID = ? AND COALESCE(IsDeleted,0) = 0`,
        [artistId]
      );

      if (!r.affectedRows) return json(res, 404, { error: "Artist not found or already deleted" });
      return json(res, 200, { message: "Artist soft deleted successfully" });
    }

    // Not found here → other handlers may cover (profile/about/etc.)
    return json(res, 404, { error: "Route not found" });
  } catch (err) {
    console.error("artist route error:", err?.sqlMessage || err?.message || err);
    return json(res, 500, { error: "Server error" });
  }
}
