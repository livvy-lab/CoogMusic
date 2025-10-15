import mysql from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config();

const db = (async function (){
  const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  });
  return db;
})()

console.log("✅ Connected to MySQL");

export default await db;
