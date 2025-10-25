import "dotenv/config";
import db from "../db.js";
import bcrypt from "bcrypt";

export async function handleLogin(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    let body = "";
    for await (const chunk of req) body += chunk;
    let parsed = {};
    try { parsed = JSON.parse(body || "{}"); } catch {}
    const username = (parsed.username ?? parsed.user)?.trim();
    const password = parsed.password ?? "";
    if (!username || !password) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Missing username or password" }));
      return;
    }

    const [rows] = await db.execute(
      "SELECT AccountID, Username, PasswordHash, IsDeleted FROM AccountInfo WHERE Username = ? LIMIT 1",
      [username]
    );
    if (rows.length === 0 || rows[0].IsDeleted) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Invalid credentials" }));
      return;
    }

    const ok = await bcrypt.compare(password, rows[0].PasswordHash);
    if (!ok) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Invalid credentials" }));
      return;
    }

    const accountId = rows[0].AccountID;
    const [listenerRows] = await db.execute(
      "SELECT ListenerID, FirstName, LastName FROM Listener WHERE AccountID = ? AND IsDeleted = 0 LIMIT 1",
      [accountId]
    );

    const payload = {
      success: true,
      accountId,
      username: rows[0].Username,
      accountType: listenerRows.length ? "listener" : "unknown",
      listenerId: listenerRows.length ? listenerRows[0].ListenerID : null,
      name: listenerRows.length ? `${listenerRows[0].FirstName} ${listenerRows[0].LastName}`.trim() : null
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  } catch (err) {
    console.error("Error during login:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Login failed" }));
  }
}
