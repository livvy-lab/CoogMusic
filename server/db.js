import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function connectDB() {
  try {
    console.log(
      "DB ENV:",
      process.env.DB_HOST,
      process.env.DB_USER,
      process.env.DB_NAME
    );

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });

    console.log("✅ Connected to MySQL");
    return connection;
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
}

const db = await connectDB();
export default db;
