import db from "../db.js";

export async function handleGenreRoutes(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;


  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");



  //const idMatch = url.pathname.match(/^\/genres\/(\d+)$/);

  try {
    // Return all genres
    if (method === "GET" && pathname === "/genres") {
      const [rows] = await db.query("SELECT * FROM Genre");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    /*// Return a single genre
    if (req.method === "GET" && idMatch) {
      const genreId = idMatch[1];
      const [rows] = await db.query("SELECT * FROM Genre WHERE GenreID = ?", [genreId]);
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Genre not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    // Add a new genre
    if (req.method === "POST" && url.pathname === "/genres") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { Name } = JSON.parse(body);
        if (!Name) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required field: Name" }));
          return;
        }

        const [result] = await db.query(
          "INSERT INTO Genre (Name) VALUES (?)",
          [Name]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          GenreID: result.insertId,
          Name
        }));
      });
      return;
    }

    // Update an existing genre by ID
    if (req.method === "PUT" && idMatch) {
      const genreId = idMatch[1];
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { Name } = JSON.parse(body);
        if (!Name) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required field: Name" }));
            return;
        }

        const [result] = await db.query(
          "UPDATE Genre SET Name = ? WHERE GenreID = ?",
          [Name, genreId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Genre not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          GenreID: genreId,
          Name,
          message: "Genre updated successfully"
        }));
      });
      return;
    }

    // Hard delete a genre
    if (req.method === "DELETE" && idMatch) {
      const genreId = idMatch[1];
      const [result] = await db.query(
        "DELETE FROM Genre WHERE GenreID = ?",
        [genreId]
      );

      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Genre not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Genre deleted successfully" }));
      return;
    }*/

    // Fallback for unsupported routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Genre endpoint not found" }));

  } catch (err) {
    // Handle unique constraint violation for genre name
    if (err.code === 'ER_DUP_ENTRY') {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "A genre with this name already exists." }));
        return;
    }
    console.error("Genre route error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
