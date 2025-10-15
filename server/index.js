import cors from "cors"
import express from "express"
import pool from "./db.js"

const app = express();
app.use(cors());
app.use(express.json());

app.get('/users', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM users');
  res.json(rows);
});

app.listen(3001, () => console.log('Server running on port 3001'));

