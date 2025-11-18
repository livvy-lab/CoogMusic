import db from "../db.js";
import { parse } from "url";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
const BUCKET = process.env.AWS_BUCKET_NAME;


// Helper function to generate signed URL from canonical S3 URL
async function getSignedAdUrl(canonicalUrl) {
  if (!canonicalUrl || !canonicalUrl.startsWith('https://')) {
    return canonicalUrl; // Return as-is if not an S3 URL
  }
  
  try {
    // Extract S3 key from canonical URL
    // Format: https://bucket.s3.region.amazonaws.com/key
    const urlParts = new URL(canonicalUrl);
    const key = urlParts.pathname.substring(1); // Remove leading slash
    
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 3600 } // 1 hour
    );
    
    return signedUrl;
  } catch (err) {
    console.error('Error generating signed URL:', err);
    return canonicalUrl; // Fallback to canonical URL
  }
}


export async function handleAdRoutes(req, res) {
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
    // GET random advertisement for display
    if (pathname === "/advertisements/random" && method === "GET") {
      const type = query?.type ? String(query.type).toLowerCase() : null; // 'banner', 'audio', or null for any

      let sql = "SELECT * FROM Advertisement WHERE IsDeleted = 0";
      const params = [];

      if (type && (type === 'banner' || type === 'audio')) {
        sql += " AND AdType = ?";
        params.push(type);
      }

      sql += " ORDER BY RAND() LIMIT 1";

      const [rows] = await db.query(sql, params);
      
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No advertisements available" }));
        return;
      }

      const ad = rows[0];
      
      // Generate signed URL if it's an S3 file
      if (ad.AdFile) {
        ad.AdFileUrl = await getSignedAdUrl(ad.AdFile);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(ad));
      return;
    }

    // GET active advertisements (for player - audio only by default)
    if (pathname === "/advertisements/active" && method === "GET") {
      const type = query?.type ? String(query.type).toLowerCase() : 'audio'; // Default to audio

      let sql = "SELECT AdID, AdName, AdFile, AdType, ArtistID FROM Advertisement WHERE IsDeleted = 0";
      const params = [];

      if (type && (type === 'banner' || type === 'audio')) {
        sql += " AND AdType = ?";
        params.push(type);
      }

      sql += " ORDER BY AdID DESC LIMIT 50";

      const [rows] = await db.query(sql, params);

      const withUrls = await Promise.all(
        rows.map(async (ad) => {
          const adCopy = { ...ad };
          if (adCopy.AdFile) {
            adCopy.AdFileUrl = await getSignedAdUrl(adCopy.AdFile);
          }
          return adCopy;
        })
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ advertisements: withUrls }));
      return;
    }

    // GET all advertisements with optional filtering by type or artistId
    if (pathname === "/advertisements" && method === "GET") {
      const artistId = query?.artistId ? Number(query.artistId) : null;
      const type = query?.type ? String(query.type).toLowerCase() : null; // 'banner' or 'audio'

      let sql = "SELECT * FROM Advertisement WHERE IsDeleted = 0";
      const params = [];

      if (Number.isFinite(artistId) && artistId > 0) {
        sql += " AND ArtistID = ?";
        params.push(artistId);
      }

      if (type && (type === 'banner' || type === 'audio')) {
        sql += " AND AdType = ?";
        params.push(type);
      }

      sql += " ORDER BY AdID DESC";

      const [rows] = await db.query(sql, params);

      const withUrls = await Promise.all(
        rows.map(async (ad) => {
          const adCopy = { ...ad };
          if (adCopy.AdFile) {
            adCopy.AdFileUrl = await getSignedAdUrl(adCopy.AdFile);
          }
          return adCopy;
        })
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(withUrls));
      return;
    }

    // GET advertisements by artist
    if (pathname.startsWith("/advertisements/artist/") && method === "GET") {
      const artistId = Number(pathname.split("/")[3]);
      
      if (!Number.isFinite(artistId) || artistId <= 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid artist ID" }));
        return;
      }

      const type = query?.type ? String(query.type).toLowerCase() : null; // Optional type filter

      let sql = "SELECT * FROM Advertisement WHERE IsDeleted = 0 AND ArtistID = ?";
      const params = [artistId];

      if (type && (type === 'banner' || type === 'audio')) {
        sql += " AND AdType = ?";
        params.push(type);
      }

      sql += " ORDER BY AdID DESC";

      const [rows] = await db.query(sql, params);

      const withUrls = await Promise.all(
        rows.map(async (ad) => {
          const adCopy = { ...ad };
          if (adCopy.AdFile) {
            adCopy.AdFileUrl = await getSignedAdUrl(adCopy.AdFile);
          }
          return adCopy;
        })
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(withUrls));
      return;
    }

    // GET one advertisement by ID
    if (pathname.startsWith("/advertisements/") && method === "GET") {
      const adId = pathname.split("/")[2];
      
      if (!adId || adId === "random" || adId === "active" || adId === "artist") {
        // Skip if it's a special route already handled
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Route not found" }));
        return;
      }

      const [rows] = await db.query(
        "SELECT * FROM Advertisement WHERE AdID = ? AND IsDeleted = 0",
        [adId]
      );

      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Advertisement not found" }));
        return;
      }

      const ad = rows[0];
      if (ad.AdFile) {
        ad.AdFileUrl = await getSignedAdUrl(ad.AdFile);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(ad));
      return;
    }

    // POST (Add new advertisement)
    if (pathname === "/advertisements" && method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { AdName, AdType, AdFile, ArtistID } = JSON.parse(body);

          if (!AdName || !AdFile) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "AdName and AdFile are required" }));
            return;
          }

          const adType = AdType || 'banner'; // Default to banner if not specified

          // Validate AdType
          if (adType !== 'banner' && adType !== 'audio') {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "AdType must be 'banner' or 'audio'" }));
            return;
          }

          let sql = "INSERT INTO Advertisement (AdName, AdFile, AdType, IsDeleted";
          let placeholders = ") VALUES (?, ?, ?, 0";
          const params = [AdName, AdFile, adType];

          if (Number.isFinite(Number(ArtistID)) && Number(ArtistID) > 0) {
            sql += ", ArtistID";
            placeholders += ", ?";
            params.push(Number(ArtistID));
          }

          sql += placeholders + ")";
          const [result] = await db.query(sql, params);

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              adId: result.insertId,
              AdName,
              AdType: adType,
              AdFile,
              ArtistID: Number.isFinite(Number(ArtistID)) ? Number(ArtistID) : null,
              message: "Advertisement created successfully"
            })
          );
        } catch (err) {
          console.error("Error parsing POST body:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid request body" }));
        }
      });
      return;
    }

    // PUT (Update advertisement)
    if (pathname.startsWith("/advertisements/") && method === "PUT") {
      const adId = pathname.split("/")[2];
      
      if (!adId || adId === "random" || adId === "active" || adId === "artist") {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Cannot update this resource" }));
        return;
      }

      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        try {
          const { AdName, AdType, AdFile } = JSON.parse(body);

          // Build dynamic update query
          const updates = [];
          const params = [];

          if (AdName !== undefined) {
            updates.push("AdName = ?");
            params.push(AdName);
          }
          if (AdFile !== undefined) {
            updates.push("AdFile = ?");
            params.push(AdFile);
          }
          if (AdType !== undefined) {
            if (AdType !== 'banner' && AdType !== 'audio') {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "AdType must be 'banner' or 'audio'" }));
              return;
            }
            updates.push("AdType = ?");
            params.push(AdType);
          }

          if (updates.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "No fields to update" }));
            return;
          }

          params.push(adId);

          const sql = `UPDATE Advertisement SET ${updates.join(", ")} WHERE AdID = ? AND IsDeleted = 0`;
          const [result] = await db.query(sql, params);

          if (result.affectedRows === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Advertisement not found" }));
            return;
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              adId,
              AdName,
              AdType,
              AdFile,
              message: "Advertisement updated successfully"
            })
          );
        } catch (err) {
          console.error("Error parsing PUT body:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid request body" }));
        }
      });
      return;
    }

    // DELETE (Soft delete advertisement)
    if (pathname.startsWith("/advertisements/") && method === "DELETE") {
      const adId = pathname.split("/")[2];

      if (!adId || adId === "random" || adId === "active" || adId === "artist") {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Cannot delete this resource" }));
        return;
      }

      const [result] = await db.query(
        "UPDATE Advertisement SET IsDeleted = 1 WHERE AdID = ? AND IsDeleted = 0",
        [adId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Advertisement not found or already deleted" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Advertisement soft deleted successfully" }));
      return;
    }

    // 404 Not Found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found" }));

  } catch (err) {
    console.error("Error handling advertisement routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error", details: err.message }));
  }
}
