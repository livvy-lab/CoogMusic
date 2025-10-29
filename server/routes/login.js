import "dotenv/config";
import db from "../db.js";
import bcrypt from "bcrypt";

function send(res, code, obj) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  });
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (!raw) return {};
  if (ct.startsWith("application/json")) { try { return JSON.parse(raw); } catch { return {}; } }
  if (ct.startsWith("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    return Object.fromEntries(params.entries());
  }
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function handleLogin(req, res) {
  if (req.method === "OPTIONS") { send(res, 204, {}); return; }
  if (req.method !== "POST") { send(res, 405, { success: false, message: "Method not allowed" }); return; }

  try {
    const body = await readBody(req);
    const username = (body.username ?? body.user ?? "").toString().trim();
    const password = (body.password ?? "").toString();

    if (!username || !password) {
      send(res, 400, { success: false, message: "Missing username or password" });
      return;
    }

    // Validate credentials
    const [acctRows] = await db.execute(
      "SELECT AccountID, Username, PasswordHash, IsDeleted FROM AccountInfo WHERE Username = ? LIMIT 1",
      [username]
    );
    if (acctRows.length === 0 || acctRows[0].IsDeleted) {
      send(res, 401, { success: false, message: "Invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, acctRows[0].PasswordHash);
    if (!ok) { send(res, 401, { success: false, message: "Invalid credentials" }); return; }

    const accountId = acctRows[0].AccountID;

    const [listenerRows] = await db.execute(
      "SELECT ListenerID, FirstName, LastName FROM Listener WHERE AccountID = ? AND IsDeleted = 0 LIMIT 1",
      [accountId]
    );

    const [artistRows] = await db.execute(
      "SELECT ArtistID FROM Artist WHERE AccountID = ? AND IsDeleted = 0 LIMIT 1",
      [accountId]
    );

    // ADMIN CHECK
    const [adminRows] = await db.execute(
      "SELECT AdminID FROM Administrator WHERE AccountID = ? LIMIT 1",
      [accountId]
    );

    const isAdmin = adminRows.length > 0;
    const isArtist = artistRows.length > 0;
    const isListener = listenerRows.length > 0;
    const accountType = isAdmin
      ? "admin"
      : isArtist
      ? "artist"
      : isListener
      ? "listener"
      : "unknown";

    const payload = {
      success: true,
      accountId,
      username: acctRows[0].Username,
      accountType,
      listenerId: isListener ? listenerRows[0].ListenerID : null,
      artistId: isArtist ? artistRows[0].ArtistID : null,
      name: isListener ? `${listenerRows[0].FirstName} ${listenerRows[0].LastName}`.trim() : null,
    };

    send(res, 200, payload);
  } catch (err) {
    console.error("Error during login:", err);
    send(res, 500, { success: false, message: "Login failed" });
  }
}