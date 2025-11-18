import db from "../db.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const STREAM_MS_THRESHOLD = 30000; // 30 seconds

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

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const mProfile = pathname.match(/^\/artists\/(\d+)\/profile$/);
  const mAbout   = pathname.match(/^\/artists\/(\d+)\/about$/);
  const mTop     = pathname.match(/^\/artists\/(\d+)\/top-tracks$/);
  const mDiscog  = pathname.match(/^\/artists\/(\d+)\/discography$/);

  try {
    // GET /artists/:id/profile
    if (method === "GET" && mProfile) {
      const artistId = mProfile[1];
      const [[row]] = await db.query(
        `
        SELECT
          a.ArtistID, a.ArtistName, a.IsVerified, COALESCE(a.Bio,'') AS Bio,
          a.PFP, a.image_media_id,
          m.bucket AS mediaBucket, m.s3_key AS mediaKey, COALESCE(m.url, a.PFP) AS pfpUrl,
          COALESCE(songs.SongCount, 0) AS SongCount,
          COALESCE(albums.AlbumCount, 0) AS AlbumCount,
          COALESCE(follows.FollowerCount, 0) AS FollowerCount
        FROM Artist a
        LEFT JOIN Media m ON m.MediaID = a.image_media_id
        LEFT JOIN (
          SELECT sa.ArtistID, COUNT(DISTINCT sa.SongID) AS SongCount
          FROM Song_Artist sa
          JOIN Song s ON s.SongID = sa.SongID AND COALESCE(s.IsDeleted,0)=0
          WHERE COALESCE(sa.IsDeleted,0)=0
          GROUP BY sa.ArtistID
        ) songs ON songs.ArtistID = a.ArtistID
        LEFT JOIN (
          SELECT ArtistID, COUNT(*) AS AlbumCount FROM Album_Artist GROUP BY ArtistID
        ) albums ON albums.ArtistID = a.ArtistID
        LEFT JOIN (
          SELECT FollowingID, COUNT(*) AS FollowerCount FROM Follows WHERE FollowingType = 'Artist' GROUP BY FollowingID
        ) follows ON follows.FollowingID = a.ArtistID
        WHERE COALESCE(a.IsDeleted,0)=0 AND a.ArtistID = ?
        `,
        [artistId]
      );

      if (!row) return json(res, 404, { error: "Artist not found" });

      let pfpSignedUrl = null;
      if (row.mediaBucket && row.mediaKey) {
        try {
          pfpSignedUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: row.mediaBucket, Key: row.mediaKey }), { expiresIn: 3600 });
        } catch (e) {}
      }

      return json(res, 200, {
        ArtistID: row.ArtistID,
        ArtistName: row.ArtistName,
        IsVerified: row.IsVerified,
        Bio: row.Bio || "",
        PFP: row.PFP || null,
        pfpUrl: row.pfpUrl || row.PFP || null,
        pfpSignedUrl,
        image_media_id: row.image_media_id,
        SongCount: Number(row.SongCount) || 0,
        AlbumCount: Number(row.AlbumCount) || 0,
        FollowerCount: Number(row.FollowerCount) || 0,
      });
    }

    // GET /artists/:id/about
    if (method === "GET" && mAbout) {
      const artistId = mAbout[1];
      const [[row]] = await db.query(
        `SELECT a.ArtistID, a.ArtistName, COALESCE(a.Bio,'') AS Bio FROM Artist a WHERE a.ArtistID = ?`,
        [artistId]
      );
      if (!row) return json(res, 404, { error: "Artist not found" });
      return json(res, 200, { ArtistID: row.ArtistID, Bio: row.Bio });
    }

    // GET /artists/:id/top-tracks
    if (method === "GET" && mTop) {
      const artistId = Number(mTop[1]);
      const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit")) || 10));

      // Added LEFT JOIN Media to get bucket/key for signing
      const [rows] = await db.query(
        `
        SELECT
          s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate,
          s.cover_media_id AS CoverMediaID,
          m.bucket AS CoverBucket, m.s3_key AS CoverS3Key, m.url AS LegacyUrl,
          (SELECT COUNT(*) FROM Play p WHERE p.SongID = s.SongID AND p.MsPlayed >= ?) AS Streams
        FROM Song s
        JOIN Song_Artist sa ON sa.SongID = s.SongID
        LEFT JOIN Media m ON s.cover_media_id = m.MediaID
        WHERE s.IsDeleted = 0 AND sa.ArtistID = ? AND sa.IsDeleted = 0
        ORDER BY Streams DESC, s.SongID DESC
        LIMIT ?
        `,
        [STREAM_MS_THRESHOLD, artistId, limit]
      );

      // Generate signed URLs for cover images
      const tracksWithCovers = await Promise.all(rows.map(async (r) => {
        let coverUrl = r.LegacyUrl || null;
        if (r.CoverBucket && r.CoverS3Key) {
          try {
            coverUrl = await getSignedUrl(
              s3,
              new GetObjectCommand({ Bucket: r.CoverBucket, Key: r.CoverS3Key }),
              { expiresIn: 3600 }
            );
          } catch (e) { console.error(e); }
        }
        return {
          SongID: r.SongID,
          Title: r.Title,
          DurationSeconds: r.DurationSeconds,
          ReleaseDate: r.ReleaseDate,
          Streams: Number(r.Streams || 0),
          CoverMediaID: r.CoverMediaID,
          CoverURL: coverUrl // Now populated correctly
        };
      }));

      return json(res, 200, { ArtistID: artistId, tracks: tracksWithCovers });
    }

    // GET /artists/:id/discography
    if (method === "GET" && mDiscog) {
      const artistId = Number(mDiscog[1]);

      /* UPDATED QUERY:
         1. Fetches ALL active songs (Singles & Album tracks).
         2. Calculates 'Streams' using the Play table subquery.
         3. Selects 'cover_media_id' for image resolution.
      */
      const [songs] = await db.query(
        `
        SELECT
          s.SongID,
          s.Title,
          s.ReleaseDate,
          s.DurationSeconds,
          s.cover_media_id,
          (SELECT COUNT(*) FROM Play p WHERE p.SongID = s.SongID AND p.MsPlayed >= ?) AS Streams
        FROM Song s
        JOIN Song_Artist sa ON sa.SongID = s.SongID
        WHERE s.IsDeleted = 0 
          AND sa.ArtistID = ?
          AND sa.IsDeleted = 0
        ORDER BY s.ReleaseDate DESC, s.SongID DESC
        `,
        [STREAM_MS_THRESHOLD, artistId]
      );

      return json(res, 200, {
        ArtistID: artistId,
        singles: songs.map(s => ({
          SongID: s.SongID,
          Title: s.Title,
          ReleaseDate: s.ReleaseDate,
          DurationSeconds: s.DurationSeconds,
          cover_media_id: s.cover_media_id,
          Streams: Number(s.Streams || 0) // Now populated
        })),
        albums: [] 
      });
    }

    return json(res, 404, { error: "Route not found" });
  } catch (err) {
    console.error("artist_profile route error:", err);
    return json(res, 500, { error: "Server error" });
  }
}