import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const c = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const [r] = await c.query(`
  SELECT a.ArtistID, a.ArtistName, l.ListenerID 
  FROM Artist a 
  LEFT JOIN Listener l ON a.AccountID = l.AccountID 
  WHERE COALESCE(a.IsDeleted, 0) = 0 
  LIMIT 5
`);

console.log('Artists with linked Listener accounts:');
r.forEach(x => console.log(`  Artist ${x.ArtistID} (${x.ArtistName}): ListenerID=${x.ListenerID || 'NONE'}`));

await c.end();
