import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

(async ()=>{
  try{
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });
    const [rows] = await pool.query('SELECT SongID, Title FROM Song LIMIT 20');
    console.log('SONGS:', rows);
    pool.end();
  }catch(e){ console.error('ERR', e); }
})();
