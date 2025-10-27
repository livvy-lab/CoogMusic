// server/routes/auth.js
import "dotenv/config";
import db from "../db.js";
import bcrypt from "bcrypt";

export async function handleAuthRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  /* =========================================================
     🎧 1) LISTENER REGISTRATION
  ========================================================= */
  if (pathname === "/auth/register" && method === "POST") {
    try {
      // read JSON body
      let body = "";
      for await (const chunk of req) body += chunk;

      let parsed;
      try {
        parsed = JSON.parse(body || "{}");
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      const first = parsed.first?.trim();
      const last = parsed.last?.trim();
      const major = parsed.major?.trim();
      const minor = parsed.minor?.trim() || null;
      const username = (parsed.username ?? parsed.user)?.trim();
      const password = parsed.password ?? "";
      const image_media_id = parsed.image_media_id ?? null;

      if (!first || !last || !major || !username || !password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required fields" }));
        return;
      }

      // password policy
      const pwOk = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/.test(password);
      if (!pwOk) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Password must be ≥8 chars, include one uppercase and one special character.",
          })
        );
        return;
      }

      // username must be unique
      const [existing] = await db.execute(
        "SELECT 1 FROM AccountInfo WHERE Username = ? LIMIT 1",
        [username]
      );
      if (existing.length > 0) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Username already exists" }));
        return;
      }

      // create AccountInfo (Listener)
      const hash = await bcrypt.hash(password, 10);
      const [accIns] = await db.execute(
        "INSERT INTO AccountInfo (Username, PasswordHash, AccountType, DateCreated, IsDeleted) VALUES (?, ?, 'Listener', NOW(), 0)",
        [username, hash]
      );
      const accountId = accIns.insertId;

      // create Listener row
      const [lisIns] = await db.execute(
        `INSERT INTO Listener
           (AccountID, FirstName, LastName, Major, Minor, DateCreated, IsDeleted, image_media_id)
         VALUES (?, ?, ?, ?, ?, NOW(), 0, ?)`,
        [accountId, first, last, major, minor, image_media_id]
      );
      const listenerId = lisIns.insertId;

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: "Listener registered successfully",
          listenerId,
          accountType: "listener",
        })
      );
      return;
    } catch (err) {
      console.error("Error registering listener:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Listener registration failed" }));
      return;
    }
  }

  /* =========================================================
     🎨 2) ARTIST REGISTRATION
  ========================================================= */
  if (pathname === "/auth/register/artist" && method === "POST") {
    try {
      // read JSON body
      let body = "";
      for await (const chunk of req) body += chunk;

      let parsed;
      try {
        parsed = JSON.parse(body || "{}");
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      const first = parsed.first?.trim();            // ArtistName
      const bio = parsed.bio?.trim() || null;
      const username = (parsed.username ?? parsed.user)?.trim();
      const password = parsed.password ?? "";
      const image_media_id = parsed.image_media_id ?? null;

      if (!first || !username || !password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required fields" }));
        return;
      }

      // password policy
      const pwOk = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/.test(password);
      if (!pwOk) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Password must be ≥8 chars, include one uppercase and one special character.",
          })
        );
        return;
      }

      // username unique
      const [existing] = await db.execute(
        "SELECT 1 FROM AccountInfo WHERE Username = ? LIMIT 1",
        [username]
      );
      if (existing.length > 0) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Username already exists" }));
        return;
      }

      // create AccountInfo (Artist)
      const hash = await bcrypt.hash(password, 10);
      const [accIns] = await db.execute(
        "INSERT INTO AccountInfo (Username, PasswordHash, AccountType, DateCreated, IsDeleted) VALUES (?, ?, 'Artist', NOW(), 0)",
        [username, hash]
      );
      const accountId = accIns.insertId;

      // create Artist row
      const [artIns] = await db.execute(
        `INSERT INTO Artist
           (AccountID, ArtistName, Bio, DateCreated, IsDeleted, image_media_id)
         VALUES (?, ?, ?, NOW(), 0, ?)`,
        [accountId, first, bio, image_media_id]
      );
      const artistId = artIns.insertId;

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: "Artist registered successfully",
          ArtistID: artistId,   // keep capitalized for compatibility with your login handling
          artistId,             // also include lowercase if you want
          accountType: "artist",
        })
      );
      return;
    } catch (err) {
      console.error("Error registering artist:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Artist registration failed" }));
      return;
    }
  }

  // Fallback
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Auth route not found" }));
}
