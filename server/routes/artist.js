// server/routes/artist.js
import db from "../db.js";
import { parse } from "url";

const STREAM_MS_THRESHOLD = 0; // Use 30000 (30s) for real production streaming thresholds

export async function handleArtistRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  // ─────────────────────────────────────────────
  // CORS Setup
  // ─────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // ─────────────────────────────────────────────
    // GET /artists → list all
    // ─────────────────────────────────────────────
    if (pathname === "/artists" && method === "GET") {
      const [rows] = await db.query(
        `SELECT
           a.ArtistID,
           a.ArtistName,
           a.DateCreated,
           COALESCE(m.url, a.PFP) AS PFP,
           a.Bio,
           a.IsDeleted,
           a.AccountID,
           a.image_media_id
         FROM Artist a
         LEFT JOIN Media m ON m.MediaID = a.image_media_id
         WHERE COALESCE(a.IsDeleted,0)=0`
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    // ─────────────────────────────────────────────
    // GET /artists/:id → basic artist
    // ─────────────────────────────────────────────
    if (/^\/artists\/\d+\/?$/.test(pathname) && method === "GET") {
      const artistId = Number(pathname.split("/")[2]);
      const [[row]] = await db.query(
        `SELECT
           a.ArtistID,
           a.ArtistName,
           a.DateCreated,
           COALESCE(m.url, a.PFP) AS PFP,
           a.Bio,
           a.IsDeleted,
           a.AccountID,
           a.image_media_id
         FROM Artist a
         LEFT JOIN Media m ON m.MediaID = a.image_media_id
         WHERE a.ArtistID = ? AND COALESCE(a.IsDeleted,0)=0`,
        [artistId]
      );
      if (!row) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Artist not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(row));
      return;
    }

    // ─────────────────────────────────────────────
    // GET /artists/:id/about → artist bio only
    // ─────────────────────────────────────────────
    if (/^\/artists\/\d+\/about$/.test(pathname) && method === "GET") {
      const artistId = Number(pathname.split("/")[2]);
      const [[artist]] = await db.query(
        `SELECT ArtistID, ArtistName, Bio
           FROM Artist
          WHERE ArtistID = ? AND COALESCE(IsDeleted,0)=0`,
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

    // ─────────────────────────────────────────────
    // GET /artists/:id/profile → full artist payload
    // ─────────────────────────────────────────────
    if (/^\/artists\/\d+\/profile$/.test(pathname) && method === "GET") {
      const artistId = Number(pathname.split("/")[2]);

      const [[artist]] = await db.query(
        `SELECT
           a.ArtistID,
           a.ArtistName,
           COALESCE(m.url, a.PFP) AS PFP,
           COALESCE(a.Bio,'') AS Bio
         FROM Artist a
         LEFT JOIN Media m ON m.MediaID = a.image_media_id
         WHERE a.ArtistID = ? AND COALESCE(a.IsDeleted,0)=0`,
        [artistId]
      );
      if (!artist) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Artist not found" }));
        return;
      }

      const [[songCountRow]] = await db.query(
        `SELECT COUNT(DISTINCT s.SongID) AS SongCount
           FROM Song s
           JOIN Song_Artist sa
             ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
          WHERE COALESCE(s.IsDeleted,0)=0
            AND sa.ArtistID = ?`,
        [artistId]
      );

      const [topTracks] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.DurationSeconds,
          s.ReleaseDate,
          COALESCE(COUNT(p.PlayID),0) AS Streams
        FROM Song s
        JOIN Song_Artist sa
          ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
        LEFT JOIN Play p
          ON p.SongID = s.SongID
         AND p.IsDeleted = 0
         AND p.MsPlayed >= ?
        WHERE COALESCE(s.IsDeleted,0)=0
          AND sa.ArtistID = ?
        GROUP BY s.SongID
        ORDER BY Streams DESC, s.SongID DESC
        LIMIT 10
        `,
        [STREAM_MS_THRESHOLD, artistId]
      );

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
      res.end(
        JSON.stringify({
          artist: {
            artistId: artist.ArtistID,
            artistName: artist.ArtistName,
            pfp: artist.PFP || null,
            bio: artist.Bio || "",
            songCount: Number(songCountRow?.SongCount || 0),
          },
          topTracks,
          discography: { albums, singles },
        })
      );
      return;
    }

    // ─────────────────────────────────────────────
    // POST /artists → create new artist
    // ─────────────────────────────────────────────
    if (pathname === "/artists" && method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        const { AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id } =
          JSON.parse(body || "{}");
        const [result] = await db.query(
          `INSERT INTO Artist (AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id ?? null]
        );
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ArtistID: result.insertId,
            AccountID,
            ArtistName,
            DateCreated,
            PFP,
            Bio,
            image_media_id,
            IsDeleted: 0,
          })
        );
      });
      return;
    }

    // ─────────────────────────────────────────────
    // PUT /artists/:id → update artist
    // ─────────────────────────────────────────────
    if (/^\/artists\/\d+\/?$/.test(pathname) && method === "PUT") {
      const artistId = Number(pathname.split("/")[2]);
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        const { AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id } =
          JSON.parse(body || "{}");
        const [result] = await db.query(
          `UPDATE Artist
              SET AccountID = ?,
                  ArtistName = ?,
                  DateCreated = ?,
                  PFP = ?,
                  Bio = ?,
                  image_media_id = ?
            WHERE ArtistID = ? AND COALESCE(IsDeleted,0)=0`,
          [AccountID, ArtistName, DateCreated, PFP, Bio, image_media_id ?? null, artistId]
        );
        if (!result.affectedRows) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Artist not found" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ArtistID: artistId,
            AccountID,
            ArtistName,
            DateCreated,
            PFP,
            Bio,
            image_media_id,
            message: "Artist updated successfully",
          })
        );
      });
      return;
    }

    // ─────────────────────────────────────────────
    // DELETE /artists/:id → soft delete
    // ─────────────────────────────────────────────
    if (/^\/artists\/\d+\/?$/.test(pathname) && method === "DELETE") {
      const artistId = Number(pathname.split("/")[2]);
      const [result] = await db.query(
        `UPDATE Artist SET IsDeleted = 1 WHERE ArtistID = ?`,
        [artistId]
      );
      if (!result.affectedRows) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Artist not found or already deleted" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Artist soft deleted successfully" }));
      return;
    }

    // ─────────────────────────────────────────────
    // Fallback 404
    // ─────────────────────────────────────────────
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("Error handling artist route:", err?.sqlMessage || err?.message || err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
