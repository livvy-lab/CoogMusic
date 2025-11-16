import db from "../db.js";
import { parse } from "url";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});
const S3_BUCKET = process.env.S3_BUCKET_NAME || "coog-music";

export async function handleLikedSongRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (/^\/listeners\/\d+\/liked_songs$/.test(pathname) && method === "GET") {
      const listenerId = Number(pathname.split("/")[2]);
      console.log(`🎵 [LIKED_SONG] GET request for listenerId: ${listenerId}`);

      const [rows] = await db.query(`
        SELECT
          s.SongID,
          s.Title,
          s.DurationSeconds,
          s.ReleaseDate,
          s.cover_media_id,
          s.ArtistID,
          COALESCE(al.Title, 'Unknown Album') AS Album,
          GROUP_CONCAT(DISTINCT ar.ArtistName ORDER BY ar.ArtistName SEPARATOR ', ') AS ArtistName,
          ls.LikedDate
        FROM Liked_Song ls
        JOIN Song s ON ls.SongID = s.SongID
        LEFT JOIN Album_Track at ON s.SongID = at.SongID
        LEFT JOIN Album al ON at.AlbumID = al.AlbumID
        LEFT JOIN Song_Artist sa ON s.SongID = sa.SongID
        LEFT JOIN Artist ar ON sa.ArtistID = ar.ArtistID
        WHERE ls.ListenerID = ? AND ls.IsLiked = 1
        GROUP BY s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate, s.cover_media_id, s.ArtistID, al.Title, ls.LikedDate
        ORDER BY ls.LikedDate DESC;
      `, [listenerId]);

      console.log(`✅ [LIKED_SONG] Query returned ${rows.length} rows`);

      if (!S3_BUCKET) {
        console.error("S3_BUCKET_NAME environment variable is not set.");
      }

      const signedRows = await Promise.all(
        rows.map(async (row) => {
          if (row.cover_media_id) {
            try {
              const [mediaRows] = await db.query(
                `SELECT s3_key, bucket FROM Media WHERE MediaID = ?`,
                [row.cover_media_id]
              );
              
              if (mediaRows.length > 0) {
                const media = mediaRows[0];
                const command = new GetObjectCommand({
                  Bucket: media.bucket || S3_BUCKET,
                  Key: media.s3_key,
                });
                row.CoverURL = await getSignedUrl(s3, command, { expiresIn: 3600 });
              } else {
                row.CoverURL = null;
              }
            } catch (err) {
              console.error("Error generating signed URL for key:", row.cover_media_id, err);
              row.CoverURL = null;
            }
          } else {
            row.CoverURL = null;
          }
          return row;
        })
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(signedRows));
      return;
    }

    if (/^\/listeners\/\d+\/liked_songs\/toggle$/.test(pathname) && method === "POST") {
      const listenerId = Number(pathname.split("/")[2]);
      console.log(`🎵 [LIKED_SONG] Toggle request - ListenerID: ${listenerId}, Path: ${pathname}`);
      let body = "";

      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { songId } = JSON.parse(body || "{}");
          console.log(`🎵 [LIKED_SONG] SongID: ${songId}`);
          if (!songId) {
            console.log("❌ [LIKED_SONG] Missing songId in request body");
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing songId" }));
            return;
          }

          console.log(`🔍 [LIKED_SONG] Checking if record exists: ListenerID=${listenerId}, SongID=${songId}`);
          const [exists] = await db.query(
            "SELECT IsLiked FROM Liked_Song WHERE ListenerID = ? AND SongID = ?",
            [listenerId, songId]
          );
          console.log(`🔍 [LIKED_SONG] Exists check result:`, exists);

          if (exists.length > 0) {
            const currentIsLiked = exists[0].IsLiked;
            const newIsLiked = currentIsLiked === 1 ? 0 : 1;
            console.log(`🔄 [LIKED_SONG] Toggling IsLiked from ${currentIsLiked} to ${newIsLiked}`);
            try {
              const result = await db.query(
                "UPDATE Liked_Song SET IsLiked = ?, LikedDate = CURDATE() WHERE ListenerID = ? AND SongID = ?",
                [newIsLiked, listenerId, songId]
              );
              console.log(`✅ [LIKED_SONG] Successfully toggled IsLiked to ${newIsLiked}, affected rows:`, result[0]?.affectedRows);
            } catch (updateErr) {
              console.error(`❌ [LIKED_SONG] UPDATE error:`, updateErr);
              throw updateErr;
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ liked: newIsLiked === 1 }));
          } else {
            console.log(`➕ [LIKED_SONG] Inserting new record - ListenerID=${listenerId}, SongID=${songId}, IsLiked=1`);
            try {
              const result = await db.query(
                "INSERT INTO Liked_Song (ListenerID, SongID, LikedDate, IsLiked) VALUES (?, ?, CURDATE(), 1)",
                [listenerId, songId]
              );
              console.log(`✅ [LIKED_SONG] Successfully inserted record with IsLiked=1, insertId:`, result[0]?.insertId);
            } catch (insertErr) {
              console.error(`❌ [LIKED_SONG] INSERT error:`, insertErr);
              throw insertErr;
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ liked: true }));
          }
        } catch (err) {
          console.error("❌ [LIKED_SONG] Error toggling liked song:", err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));
  } catch (err) {
    console.error("❌ Error in handleLikedSongRoutes:", err.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}