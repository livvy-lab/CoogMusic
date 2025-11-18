import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const [triggers] = await conn.query("SHOW TRIGGERS WHERE `Table` = 'Follows'");
console.log('\nTriggers on Follows table:');
triggers.forEach(t => console.log(`- ${t.Trigger} (${t.Timing} ${t.Event})`));

await conn.end();
