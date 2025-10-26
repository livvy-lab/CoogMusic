import "dotenv/config";
import db from "../db.js";
import bcrypt from "bcrypt";

export async function handleAuthRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === "/auth/register" && method === "POST") {
    try {
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

      if (!first || !last || !major || !username || !password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required fields" }));
        return;
      }

      const pwOk = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/.test(password);
      if (!pwOk) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Password must be ≥8 chars, include one uppercase and one special character." }));
        return;
      }

      const [existing] = await db.execute(
        "SELECT 1 FROM AccountInfo WHERE Username = ? LIMIT 1",
        [username]
      );
      if (existing.length > 0) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Username already exists" }));
        return;
      }

      const hash = await bcrypt.hash(password, 10);
      const [result] = await db.execute(
        "INSERT INTO AccountInfo (Username, PasswordHash, DateCreated, IsDeleted) VALUES (?, ?, NOW(), 0)",
        [username, hash]
      );
      const accountId = result.insertId;

      await db.execute(
        "INSERT INTO Listener (AccountID, FirstName, LastName, Major, Minor, DateCreated, IsDeleted) VALUES (?, ?, ?, ?, ?, NOW(), 0)",
        [accountId, first, last, major, minor]
      );

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "User registered successfully", accountId }));
      return;
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User registration failed" }));
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Auth route not found" }));
}
