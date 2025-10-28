// server/routes/artist.js
import db from "../db.js";

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const STREAM_MS_THRESHOLD = 0; // Use 30000 (30s) for real production streaming thresholds

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
      if (!artist) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Artist not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ Bio: artist.Bio || "" }));
      return;
    }

    // ─────────────────────────────────────────────
    // GET /artists/:id/top-tracks?limit=10 → most streamed songs
    // ─────────────────────────────────────────────
    if (/^\/artists\/\d+\/top-tracks$/.test(pathname) && method === "GET") {
      const artistId = Number(pathname.split("/")[2]);
      const url = new URL(req.url, `http://${req.headers.host}`);
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 10, 1), 50);

      const [tracks] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.DurationSeconds,
          s.ReleaseDate,
          COALESCE(COUNT(p.PlayID),0) AS Streams
        FROM Song s
        JOIN Song_Artist sa
          ON sa.SongID = s.SongID
         AND COALESCE(sa.IsDeleted,0)=0
         AND sa.ArtistID = ?
        LEFT JOIN Play p
          ON p.SongID = s.SongID
         AND p.IsDeleted = 0
         AND p.MsPlayed >= ?
        WHERE COALESCE(s.IsDeleted,0)=0
        GROUP BY s.SongID
        ORDER BY Streams DESC, s.SongID DESC
        LIMIT ?
        `,
        [artistId, STREAM_MS_THRESHOLD, limit]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tracks }));
      return;
    }

    // ─────────────────────────────────────────────
    // GET /artists/:id/discography → albums + singles
    // ─────────────────────────────────────────────
    if (/^\/artists\/\d+\/discography$/.test(pathname) && method === "GET") {
      const artistId = Number(pathname.split("/")[2]);

      // Albums
      const [albums] = await db.query(
        `
        SELECT
          al.AlbumID,
          al.Title AS AlbumTitle,
          al.ReleaseDate,
          COUNT(DISTINCT at.SongID) AS TrackCount
        FROM Album al
        LEFT JOIN Album_Artist aa
          ON aa.AlbumID = al.AlbumID AND COALESCE(aa.IsDeleted,0)=0
        LEFT JOIN Album_Track at
          ON at.AlbumID = al.AlbumID
        WHERE COALESCE(al.IsDeleted,0)=0
          AND (
            aa.ArtistID = ?
            OR EXISTS (
              SELECT 1
                FROM Album_Track at2
                JOIN Song_Artist sa2
                  ON sa2.SongID = at2.SongID AND COALESCE(sa2.IsDeleted,0)=0
               WHERE at2.AlbumID = al.AlbumID
                 AND sa2.ArtistID = ?
            )
          )
        GROUP BY al.AlbumID
        ORDER BY (al.ReleaseDate IS NULL) ASC, al.ReleaseDate DESC, al.AlbumID DESC
        `,
        [artistId, artistId]
      );

      // Singles
      const [singles] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.ReleaseDate,
          COALESCE(COUNT(p.PlayID),0) AS Streams
        FROM Song s
        JOIN Song_Artist sa
          ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
        LEFT JOIN Album_Track at ON at.SongID = s.SongID
        LEFT JOIN Play p
          ON p.SongID = s.SongID
         AND p.IsDeleted = 0
         AND p.MsPlayed >= ?
        WHERE COALESCE(s.IsDeleted,0)=0
          AND sa.ArtistID = ?
          AND at.SongID IS NULL
        GROUP BY s.SongID
        ORDER BY (s.ReleaseDate IS NULL) ASC, s.ReleaseDate DESC, s.SongID DESC
        `,
        [STREAM_MS_THRESHOLD, artistId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ albums, singles }));
      return;
    }

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
