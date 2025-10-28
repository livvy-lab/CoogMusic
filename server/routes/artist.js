import db from "../db.js";

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export async function handleArtistRoutes(req, res) {
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  try {
    if (method === "GET" && pathname === "/artists") {
      const [rows] = await db.query(
        `
        SELECT
          a.ArtistID, a.ArtistName, a.DateCreated, a.Bio, a.AccountID, a.image_media_id,
          COALESCE(m.url, a.PFP) AS pfpUrl
        FROM Artist a
        LEFT JOIN Media m ON m.MediaID = a.image_media_id
        WHERE COALESCE(a.IsDeleted,0) = 0
        ORDER BY a.ArtistID ASC
        `
      );
      return json(res, 200, rows.map((r) => ({ ...r, PFP: r.pfpUrl || null })));
    }

    const mAlbums = pathname.match(/^\/artists\/(\d+)\/albums\/?$/);
    if (method === "GET" && mAlbums) {
      const artistId = Number(mAlbums[1]);
      const [rows] = await db.query(
        `
        SELECT 
          al.AlbumID, al.Title, al.ReleaseDate, al.cover_media_id,
          COUNT(DISTINCT at.SongID) AS TrackCount
        FROM Album al
        JOIN Album_Artist aa ON aa.AlbumID = al.AlbumID
        LEFT JOIN Album_Track at ON at.AlbumID = al.AlbumID
        WHERE COALESCE(al.IsDeleted,0) = 0
          AND aa.ArtistID = ?
        GROUP BY al.AlbumID, al.Title, al.ReleaseDate, al.cover_media_id
        ORDER BY (al.ReleaseDate IS NULL) ASC, al.ReleaseDate DESC, al.AlbumID DESC
        `,
        [artistId]
      );
      return json(res, 200, rows);
    }

    const mSongs = pathname.match(/^\/artists\/(\d+)\/songs\/?$/);
    if (method === "GET" && mSongs) {
      const artistId = Number(mSongs[1]);

      const [rows] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.DurationSeconds,
          s.ReleaseDate,
          s.cover_media_id,
          a.ArtistID,
          a.ArtistName,
          al.AlbumID,
          COALESCE(al.Title, 'Single') AS AlbumName
          -- We no longer calculate streamCount or likeCount here
          -- The frontend will get this from the analytics endpoint
        FROM Song s
        JOIN Song_Artist sa ON s.SongID = sa.SongID AND COALESCE(sa.IsDeleted, 0) = 0
        JOIN Artist a ON sa.ArtistID = a.ArtistID AND COALESCE(a.IsDeleted, 0) = 0
        LEFT JOIN Album_Track at ON s.SongID = at.SongID
        LEFT JOIN Album al ON at.AlbumID = al.AlbumID AND COALESCE(al.IsDeleted, 0) = 0
        WHERE sa.ArtistID = ?
          AND COALESCE(s.IsDeleted, 0) = 0
        GROUP BY s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate, s.cover_media_id, a.ArtistID, a.ArtistName, al.AlbumID, al.Title
        ORDER BY (s.ReleaseDate IS NULL) ASC, s.ReleaseDate DESC, s.SongID DESC
        `,
        [artistId]
      );
      return json(res, 200, rows);
    }

    const mGet = pathname.match(/^\/artists\/(\d+)\/?$/);
    if (method === "GET" && mGet) {
      const artistId = Number(mGet[1]);
      const [[row]] = await db.query(
        `
        SELECT
          a.ArtistID, a.ArtistName, a.DateCreated, a.Bio, a.AccountID, a.image_media_id,
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

    if (method === "POST" && pathname === "/artists") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        try {
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
            AccountID,
            ArtistName,
            DateCreated,
            PFP,
            Bio,
            image_media_id,
            IsDeleted: 0,
          });
        } catch (err) {
          console.error("POST /artists error:", err);
          return json(res, 400, { error: "Invalid request" });
        }
      });
      return;
    }

    const mPut = pathname.match(/^\/artists\/(\d+)\/?$/);
    if (method === "PUT" && mPut) {
      const artistId = Number(mPut[1]);
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        try {
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
               SET AccountID = ?, ArtistName = ?, DateCreated = ?,
                   PFP = ?, Bio = ?, image_media_id = ?
             WHERE ArtistID = ? AND COALESCE(IsDeleted,0) = 0
            `,
            [
              AccountID,
              ArtistName,
              DateCreated,
              PFP,
              Bio,
              image_media_id,
              artistId,
            ]
          );
          if (!r.affectedRows)
            return json(res, 404, { error: "Artist not found" });

          return json(res, 200, {
            ArtistID: artistId,
            AccountID,
            ArtistName,
            DateCreated,
            PFP,
            Bio,
            image_media_id,
            message: "Artist updated successfully",
          });
        } catch (err) {
          console.error("PUT /artists/:id error:", err);
          return json(res, 400, { error: "Invalid request" });
        }
      });
      return;
    }

    const mDel = pathname.match(/^\/artists\/(\d+)\/?$/);
    if (method === "DELETE" && mDel) {
      const artistId = Number(mDel[1]);
      const [r] = await db.query(
        `UPDATE Artist SET IsDeleted = 1 WHERE ArtistID = ? AND COALESCE(IsDeleted,0) = 0`,
        [artistId]
      );
      if (!r.affectedRows)
        return json(res, 404, { error: "Artist not found or already deleted" });
      return json(res, 200, { message: "Artist soft deleted successfully" });
    }

    // fallback if no other route in this file matches
    return json(res, 404, { error: "Route not found in artist.js" });
    
  } catch (err) {
    console.error(
      "artist route error:",
      err?.sqlMessage || err?.message || err
    );
    return json(res, 500, { error: "Server error" });
  }
}
