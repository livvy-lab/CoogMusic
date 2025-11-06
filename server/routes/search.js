import db from "../db.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function notDeleted(column = "IsDeleted") {
  return `(${column} IS NULL OR ${column} = 0)`;
}

async function resolveProfilePicture(bucket, s3_key, legacyUrl) {
  if (bucket && s3_key) {
    try {
      const signed = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: s3_key }),
        { expiresIn: 3600 }
      );
      return signed;
    } catch (err) {
      console.error("Error generating signed URL:", err);
      return legacyUrl || null;
    }
  }
  return legacyUrl || null;
}

export async function handleSearchRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = url;
  if (!(req.method === "GET" && pathname === "/search")) return;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const q = (searchParams.get("q") || "").trim();
  const empty = { songs: [], artists: [], listeners: [], albums: [], playlists: [] };

  if (!q) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ query: "", groups: empty }));
    return;
  }

  const like = `%${q}%`;

  try {
    const [songs] = await db.query(
      `SELECT s.SongID AS id, s.Title AS title, 'song' AS type
       FROM Song s
       WHERE ${notDeleted("s.IsDeleted")} AND s.Title LIKE ?
       LIMIT 25`,
      [like]
    );

    const [artists] = await db.query(
      `SELECT a.ArtistID AS id, a.ArtistName AS title, 'artist' AS type,
              a.PFP AS legacyPfp, m.bucket, m.s3_key
       FROM Artist a
       LEFT JOIN Media m ON m.MediaID = a.image_media_id
       WHERE ${notDeleted("a.IsDeleted")} AND a.ArtistName LIKE ?
       LIMIT 15`,
      [like]
    );

    // Resolve profile pictures for artists
    const artistsWithPfp = await Promise.all(
      artists.map(async (artist) => ({
        id: artist.id,
        title: artist.title,
        type: artist.type,
        pfpUrl: await resolveProfilePicture(artist.bucket, artist.s3_key, artist.legacyPfp)
      }))
    );

    const [listeners] = await db.query(
      `SELECT l.ListenerID AS id,
              TRIM(CONCAT_WS(' ', NULLIF(l.FirstName,''), NULLIF(l.LastName,''))) AS title,
              'listener' AS type,
              l.PFP AS legacyPfp, m.bucket, m.s3_key
       FROM Listener l
       LEFT JOIN Media m ON m.MediaID = l.image_media_id
       WHERE (${notDeleted("l.IsDeleted")})
         AND (
           COALESCE(l.FirstName,'') LIKE ?
           OR COALESCE(l.LastName,'') LIKE ?
           OR TRIM(CONCAT_WS(' ', COALESCE(l.FirstName,''), COALESCE(l.LastName,''))) LIKE ?
         )
       LIMIT 15`,
      [like, like, like]
    );

    // Resolve profile pictures for listeners
    const listenersWithPfp = await Promise.all(
      listeners.map(async (listener) => ({
        id: listener.id,
        title: listener.title,
        type: listener.type,
        pfpUrl: await resolveProfilePicture(listener.bucket, listener.s3_key, listener.legacyPfp)
      }))
    );

    const [albums] = await db.query(
      `SELECT al.AlbumID AS id, al.Title AS title, 'album' AS type
       FROM Album al
       WHERE ${notDeleted("al.IsDeleted")} AND al.Title LIKE ?
       LIMIT 15`,
      [like]
    );

    const [playlists] = await db.query(
      `SELECT p.PlaylistID AS id, p.Name AS title, 'playlist' AS type
       FROM Playlist p
       WHERE ${notDeleted("p.IsDeleted")} AND p.Name LIKE ?
       LIMIT 15`,
      [like]
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ query: q, groups: { songs, artists: artistsWithPfp, listeners: listenersWithPfp, albums, playlists } }));
  } catch (e) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ query: q, groups: empty }));
  }
}
