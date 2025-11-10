import db from "../db.js";
import { parse } from "url";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// create s3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function handleRecentUsersRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // cors & preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (pathname === "/users/recent" && method === "GET") {
      const sql = `
        (
          select 
            ai.AccountID, 
            ai.Username, 
            ai.AccountType, 
            ai.DateCreated, 
            l.ListenerID as SpecificID, 
            l.FirstName as DisplayName,
            m.url as canonicalUrl,
            m.bucket as bucket,
            m.s3_key as s3Key
          from AccountInfo ai
          join Listener l on ai.AccountID = l.AccountID
          left join Media m on l.image_media_id = m.MediaID
          where ai.IsDeleted = 0 and ai.AccountType = 'Listener'
        )
        union
        (
          select 
            ai.AccountID, 
            ai.Username, 
            ai.AccountType, 
            ai.DateCreated, 
            a.ArtistID as SpecificID, 
            a.ArtistName as DisplayName, 
            m.url as canonicalUrl,
            m.bucket as bucket,
            m.s3_key as s3Key
          from AccountInfo ai
          join Artist a on ai.AccountID = a.AccountID
          left join Media m on a.image_media_id = m.MediaID
          where ai.IsDeleted = 0 and ai.AccountType = 'Artist'
        )
        order by DateCreated desc 
        limit 10;
      `;

      const [rows] = await db.query(sql);

      // process rows for s3 signed urls
      const usersWithSignedUrls = await Promise.all(
        rows.map(async (user) => {
          let pfpUrl = null;
          if (user.bucket && user.s3Key) {
            try {
              pfpUrl = await getSignedUrl(
                s3,
                new GetObjectCommand({ Bucket: user.bucket, Key: user.s3Key }),
                { expiresIn: 3600 }
              );
            } catch (err) {
              console.error("s3 getobject error:", user.AccountID, err);
              pfpUrl = user.canonicalUrl || null;
            }
          }
          return {
            AccountID: user.AccountID,
            Username: user.Username,
            AccountType: user.AccountType,
            DateCreated: user.DateCreated,
            SpecificID: user.SpecificID,
            DisplayName: user.DisplayName,
            PFP_URL: pfpUrl
          };
        })
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(usersWithSignedUrls));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "route not found in recent users handler" }));

  } catch (err) {
    console.error("error in handleRecentUsersRoutes:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({ error: "internal server error" }));
  }
}
