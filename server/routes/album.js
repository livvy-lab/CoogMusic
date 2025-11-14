import db from "../db.js";
import { parse } from "url";

export async function handleAlbumRoutes(req, res) {
  const url = parse(req.url, true);
  const idMatch = url.pathname.match(/^\/albums\/(\d+)$/);
  const artistSinglesMatch = url.pathname.match(/^\/artists\/(\d+)\/songs\/singles$/);

  try {
    if (req.method === "GET" && artistSinglesMatch) {
      const artistId = artistSinglesMatch[1];
      const [songs] = await db.query(
        `SELECT DISTINCT s.SongID, s.Title
         FROM Song s
         LEFT JOIN Album_Track at ON s.SongID = at.SongID
         WHERE s.ArtistID = ?
           AND s.IsDeleted = 0
           AND at.AlbumID IS NULL
         ORDER BY s.ReleaseDate DESC, s.Title`,
        [artistId]
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(songs));
      return;
    }

    if (req.method === "GET" && url.pathname === "/albums") {
      const [rows] = await db.query("SELECT * FROM Album WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }

    if (req.method === "GET" && idMatch) {
      const albumId = idMatch[1];
      const [rows] = await db.query(
        "SELECT * FROM Album WHERE AlbumID = ? AND IsDeleted = 0",
        [albumId]
      );
      if (rows.length === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Album not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows[0]));
      return;
    }

    if (req.method === "POST" && url.pathname === "/albums") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        let data;
        try {
          data = JSON.parse(body);
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
          return;
        }

        const {
          title,
          releaseDate,
          artistId,
          coverMediaId = null,
          genres = [],
          tracks = []
        } = data;

        if (!title || !releaseDate || !artistId || !tracks || tracks.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields: title, releaseDate, artistId, and at least one track." }));
          return;
        }

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
          const [albumRes] = await connection.query(
            "INSERT INTO Album (Title, ReleaseDate, cover_media_id, IsDeleted) VALUES (?, ?, ?, 0)",
            [title, releaseDate, coverMediaId]
          );
          const albumId = albumRes.insertId;
          await connection.query(
            "INSERT INTO Album_Artist (AlbumID, ArtistID) VALUES (?, ?)",
            [albumId, artistId]
          );
          if (Array.isArray(genres) && genres.length > 0) {
            const genreValues = genres.map(genreId => [albumId, Number(genreId)]);
            await connection.query(
              "INSERT INTO Album_Genre (AlbumID, GenreID) VALUES ?",
              [genreValues]
            );
          }
          if (Array.isArray(tracks) && tracks.length > 0) {
            const trackValues = tracks.map(track => [
              albumId,
              Number(track.songId),
              Number(track.trackNumber)
            ]);
            await connection.query(
              "INSERT INTO Album_Track (AlbumID, SongID, TrackNumber) VALUES ?",
              [trackValues]
            );
          }

          await connection.commit();
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            albumId,
            ...data
          }));

        } catch (err) {
          await connection.rollback();
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            error: err.message || "Failed to create album",
            sqlError: err.sqlMessage
          }));
        } finally {
          connection.release();
        }
      });
      return;
    }

    if (req.method === "PUT" && idMatch) {
      const albumId = idMatch[1];
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        const { Title, ReleaseDate, cover_media_id } = JSON.parse(body);
        const [result] = await db.query(
          "UPDATE Album SET Title = ?, ReleaseDate = ?, cover_media_id = ? WHERE AlbumID = ? AND IsDeleted = 0",
          [Title, ReleaseDate, cover_media_id, albumId]
        );

        if (result.affectedRows === 0) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Album not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          AlbumId: albumId,
          Title,
          ReleaseDate,
          cover_media_id,
          message: "Album updated successfully"
        }));
      });
      return;
    }

    if (req.method === "DELETE" && idMatch) {
      const albumId = idMatch[1];
      const [result] = await db.query(
        "UPDATE Album SET IsDeleted = 1 WHERE AlbumID = ?",
        [albumId]
      );
      if (result.affectedRows === 0) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Album not found or already deleted" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Album soft deleted successfully" }));
      return;
    }

    // Default 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Album endpoint not found" }));

  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}