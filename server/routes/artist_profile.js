// server/routes/artist_profile.js
import db from "../db.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const STREAM_MS_THRESHOLD = 30000; // 30 seconds (30,000 ms) - industry standard

// S3 client (env vars must be set)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export async function handleArtistProfileRoutes(req, res) {
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // MATCHERS
  const mProfile = pathname.match(/^\/artists\/(\d+)\/profile$/);
  const mAbout   = pathname.match(/^\/artists\/(\d+)\/about$/);
  const mTop     = pathname.match(/^\/artists\/(\d+)\/top-tracks$/);
  const mDiscog  = pathname.match(/^\/artists\/(\d+)\/discography$/);

  try {
    // ------------------------------------------------------------
    // GET /artists/:id/profile
    // ------------------------------------------------------------
    if (method === "GET" && mProfile) {
      const artistId = mProfile[1];

      // Pull artist + media join + counts
      const [[row]] = await db.query(
        `
        SELECT
          a.ArtistID,
          a.ArtistName,
          COALESCE(a.Bio,'') AS Bio,
          a.PFP,                         -- legacy/fallback URL
          a.image_media_id,
          m.bucket AS mediaBucket,
          m.s3_key AS mediaKey,
          COALESCE(m.url, a.PFP) AS pfpUrl, -- canonical public URL if stored
          COALESCE(songs.SongCount, 0)       AS SongCount,
          COALESCE(follows.FollowerCount, 0) AS FollowerCount
        FROM Artist a
        LEFT JOIN Media m
          ON m.MediaID = a.image_media_id
        LEFT JOIN (
          SELECT sa.ArtistID, COUNT(DISTINCT sa.SongID) AS SongCount
          FROM Song_Artist sa
          JOIN Song s ON s.SongID = sa.SongID AND COALESCE(s.IsDeleted,0)=0
          WHERE COALESCE(sa.IsDeleted,0)=0
          GROUP BY sa.ArtistID
        ) songs ON songs.ArtistID = a.ArtistID
        LEFT JOIN (
          SELECT FollowingID, COUNT(*) AS FollowerCount
          FROM Follows
          WHERE FollowingType = 'Artist'
          GROUP BY FollowingID
        ) follows ON follows.FollowingID = a.ArtistID
        WHERE COALESCE(a.IsDeleted,0)=0 AND a.ArtistID = ?
        `,
        [artistId]
      );

      if (!row) return json(res, 404, { error: "Artist not found" });

      // If we have a bucket/key, issue a short-lived signed URL (works with private buckets)
      let pfpSignedUrl = null;
      if (row.mediaBucket && row.mediaKey) {
        pfpSignedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: row.mediaBucket, Key: row.mediaKey }),
          { expiresIn: 3600 } // 1 hour
        );
      }

      return json(res, 200, {
        ArtistID: row.ArtistID,
        ArtistName: row.ArtistName,
        Bio: row.Bio || "",
        // keep all three for maximum front-end compatibility
        PFP: row.PFP || null,               // legacy field
        pfpUrl: row.pfpUrl || row.PFP || null,
        pfpSignedUrl,                       // preferred when present
        image_media_id: row.image_media_id,
        SongCount: Number(row.SongCount) || 0,
        FollowerCount: Number(row.FollowerCount) || 0,
        // nested shape some components use
        artist: {
          artistId: row.ArtistID,
          artistName: row.ArtistName,
          bio: row.Bio || "",
          songCount: Number(row.SongCount) || 0,
          imageMediaId: row.image_media_id,
          pfp: row.pfpUrl || row.PFP || null,
          pfpSignedUrl,
        },
      });
    }

    // ------------------------------------------------------------
    // GET /artists/:id/about
    // ------------------------------------------------------------
    if (method === "GET" && mAbout) {
      const artistId = mAbout[1];

      const [[row]] = await db.query(
        `
        SELECT
          a.ArtistID,
          a.ArtistName,
          COALESCE(a.Bio,'') AS Bio,
          COALESCE(m.url, a.PFP) AS pfpUrl
        FROM Artist a
        LEFT JOIN Media m ON m.MediaID = a.image_media_id
        WHERE COALESCE(a.IsDeleted,0)=0 AND a.ArtistID = ?
        `,
        [artistId]
      );

      if (!row) return json(res, 404, { error: "Artist not found" });

      return json(res, 200, {
        ArtistID: row.ArtistID,
        ArtistName: row.ArtistName,
        Bio: row.Bio,
        HasBio: row.Bio.trim().length > 0,
        PFP: row.pfpUrl || null,
        pfpUrl: row.pfpUrl || null,
      });
    }

    // ------------------------------------------------------------
    // GET /artists/:id/top-tracks?limit=10
    // ------------------------------------------------------------
    if (method === "GET" && mTop) {
      const artistId = Number(mTop[1]);
      const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit")) || 10));

      const [rows] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.DurationSeconds,
          s.ReleaseDate,
          m.url AS CoverURL,
          m.bucket AS CoverBucket,
          m.s3_key AS CoverS3Key,
          (
            SELECT COUNT(*)
            FROM Play p
            WHERE p.SongID = s.SongID
              AND COALESCE(p.IsDeleted,0)=0
              AND COALESCE(p.MsPlayed,0) >= ?
          ) AS Streams
        FROM Song s
        JOIN Song_Artist sa
          ON sa.SongID = s.SongID AND COALESCE(sa.IsDeleted,0)=0
        LEFT JOIN Media m ON m.MediaID = s.cover_media_id
        WHERE COALESCE(s.IsDeleted,0)=0
          AND sa.ArtistID = ?
        ORDER BY Streams DESC, s.SongID DESC
        LIMIT ?
        `,
        [STREAM_MS_THRESHOLD, artistId, limit]
      );

      // Generate signed URLs for cover images
      const tracksWithCovers = await Promise.all(
        rows.map(async (r) => {
          let coverUrl = null;
          if (r.CoverBucket && r.CoverS3Key) {
            try {
              coverUrl = await getSignedUrl(
                s3,
                new GetObjectCommand({ Bucket: r.CoverBucket, Key: r.CoverS3Key }),
                { expiresIn: 3600 }
              );
            } catch (err) {
              console.error("Error generating signed URL for cover:", err);
              coverUrl = r.CoverURL || null;
            }
          } else {
            coverUrl = r.CoverURL || null;
          }

          return {
            SongID: r.SongID,
            Title: r.Title,
            DurationSeconds: r.DurationSeconds,
            ReleaseDate: r.ReleaseDate,
            StreamCount: Number(r.Streams || 0),
            CoverURL: coverUrl,
          };
        })
      );

      return json(res, 200, {
        ArtistID: artistId,
        limit,
        tracks: tracksWithCovers,
      });
    }

    // ------------------------------------------------------------
    // GET /artists/:id/discography   (NO aa.IsDeleted references)
    // ------------------------------------------------------------
    if (method === "GET" && mDiscog) {
      const artistId = Number(mDiscog[1]);

      // Albums the artist is on:
      // - either explicitly via Album_Artist
      // - or implicitly because a track on the album has Song_Artist mapping
      const [albums] = await db.query(
        `
        SELECT
          al.AlbumID,
          al.Title,
          al.ReleaseDate,
          COUNT(DISTINCT at2.SongID) AS TrackCount
        FROM Album al
        LEFT JOIN Album_Track at2
          ON at2.AlbumID = al.AlbumID
        WHERE COALESCE(al.IsDeleted,0)=0
          AND (
            EXISTS (
              SELECT 1
              FROM Album_Artist aa
              WHERE aa.AlbumID = al.AlbumID
                AND aa.ArtistID = ?
            )
            OR EXISTS (
              SELECT 1
              FROM Album_Track at3
              JOIN Song_Artist sa3
                ON sa3.SongID = at3.SongID
               AND COALESCE(sa3.IsDeleted,0)=0
              WHERE at3.AlbumID = al.AlbumID
                AND sa3.ArtistID = ?
            )
          )
        GROUP BY al.AlbumID, al.Title, al.ReleaseDate
        ORDER BY (al.ReleaseDate IS NULL) ASC, al.ReleaseDate DESC, al.AlbumID DESC
        `,
        [artistId, artistId]
      );

      // Singles = artist songs not on any album
      const [singles] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.ReleaseDate,
          s.DurationSeconds
        FROM Song s
        JOIN Song_Artist sa
          ON sa.SongID = s.SongID
         AND sa.ArtistID = ?
         AND COALESCE(sa.IsDeleted,0)=0
        LEFT JOIN Album_Track atx
          ON atx.SongID = s.SongID
        WHERE COALESCE(s.IsDeleted,0)=0
          AND atx.SongID IS NULL
        GROUP BY s.SongID, s.Title, s.ReleaseDate, s.DurationSeconds
        ORDER BY (s.ReleaseDate IS NULL) ASC, s.ReleaseDate DESC, s.SongID DESC
        `,
        [artistId]
      );

      return json(res, 200, {
        ArtistID: artistId,
        albums: albums.map(a => ({
          AlbumID: a.AlbumID,
          Title: a.Title,
          ReleaseDate: a.ReleaseDate,
          TrackCount: Number(a.TrackCount) || 0,
        })),
        singles: singles.map(s => ({
          SongID: s.SongID,
          Title: s.Title,
          ReleaseDate: s.ReleaseDate,
          DurationSeconds: s.DurationSeconds,
        })),
      });
    }

    // no match
    return json(res, 404, { error: "Route not found" });
  } catch (err) {
    console.error("artist_profile route error:", err);
    return json(res, 500, { error: "Server error" });
  }
}
