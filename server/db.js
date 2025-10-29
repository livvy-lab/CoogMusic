import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log(
  "DB ENV:",
  process.env.DB_HOST,
  process.env.DB_USER,
  process.env.DB_NAME
);

// Use a connection pool instead of a single connection
// Pool automatically handles reconnections and manages multiple connections
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test the pool connection
try {
  const connection = await pool.getConnection();
  console.log("✅ Connected to MySQL (pool)");
  connection.release();
} catch (err) {
  console.error("❌ Database connection failed:", err.message);
}

export default pool;
