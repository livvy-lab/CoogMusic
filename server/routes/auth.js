import "dotenv/config";
import db from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { parse } from "url";

const SECRET_KEY = process.env.SECRET_KEY;

export async function handleAuthRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === "/auth/register" && method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { username, password } = JSON.parse(body);

        if (!username || !password) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "Missing username or password" })
          );
        }

        const passwordRequirements =
          /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRequirements.test(password)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              error:
                "Password must be at least 8 characters long, include one uppercase letter, and one special character.",
            })
          );
        }

        const [existingUsers] = await db.query(
          "SELECT * FROM Listeners WHERE Username = ?",
          [username]
        );

        if (existingUsers.length > 0) {
          res.writeHead(409, { "Content-Type": "application/json" }); // 409 Conflict
          return res.end(JSON.stringify({ error: "Username already exists" }));
        }

        const hashed = await bcrypt.hash(password, 10);

        await db.query(
          "INSERT INTO Listener (Username, Password, DateCreated, IsDeleted) VALUES (?, ?, NOW(), 0)",
          [username, hashed]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "User registered successfully" }));
      } catch (err) {
        console.error("Error registering user:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "User registration failed" }));
      }
    });
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Auth route not found" }));
}
