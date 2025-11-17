import db from "../db.js";
import { parse } from "url";


export async function handleAlbumRoutes(req, res) {
  const url = parse(req.url, true);
  const idMatch = url.pathname.match(/^\/albums\/(\d+)$/);
  const tracksMatch = url.pathname.match(/^\/albums\/(\d+)\/tracks$/);
  const artistSinglesMatch = url.pathname.match(/^\/artists\/(\d+)\/songs\/singles$/);


  try {
    if (req.method === "GET" && artistSinglesMatch) {
      const artistId = artistSinglesMatch[1];
      const [songs] = await db.query(
        `SELECT DISTINCT s.SongID, s.Title
         FROM Song s
         INNER JOIN Song_Artist sa ON s.SongID = sa.SongID
         LEFT JOIN Album_Track at ON s.SongID = at.SongID
         WHERE sa.ArtistID = ?
           AND sa.IsDeleted = 0
           AND s.IsDeleted = 0
           AND at.AlbumID IS NULL
         ORDER BY s.ReleaseDate DESC, s.Title`,
        [artistId]
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(songs));
      return;
    }


    if (req.method === "GET" && tracksMatch) {
      const albumId = tracksMatch[1];
      
      const [tracks] = await db.query(
        `SELECT 
          s.SongID, 
          s.Title,
          CAST(s.DurationSeconds AS SIGNED) AS DurationSeconds,
          s.cover_media_id,
          at.TrackNumber,
          a.ArtistName,
          a.ArtistID
         FROM Album_Track at
         INNER JOIN Song s ON at.SongID = s.SongID
         LEFT JOIN Song_Artist sa ON s.SongID = sa.SongID 
           AND sa.Role = 'Primary' 
           AND COALESCE(sa.IsDeleted, 0) = 0
         LEFT JOIN Artist a ON sa.ArtistID = a.ArtistID 
           AND COALESCE(a.IsDeleted, 0) = 0
         WHERE at.AlbumID = ? 
           AND s.IsDeleted = 0
         ORDER BY at.TrackNumber ASC`,
        [albumId]
      );

      console.log(`📀 Album ${albumId} tracks fetched:`, tracks);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(tracks));
      return;
    }


    // --- All albums
    if (req.method === "GET" && url.pathname === "/albums") {
      const [rows] = await db.query("SELECT * FROM Album WHERE IsDeleted = 0");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
      return;
    }


    if (req.method === "GET" && idMatch) {
      const albumId = idMatch[1];
      const [rows] = await db.query(
        `SELECT 
          a.*,
          ar.ArtistName,
          ar.ArtistID
         FROM Album a
         LEFT JOIN Album_Artist aa ON a.AlbumID = aa.AlbumID
         LEFT JOIN Artist ar ON aa.ArtistID = ar.ArtistID AND COALESCE(ar.IsDeleted, 0) = 0
         WHERE a.AlbumID = ? AND a.IsDeleted = 0`,
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


    // --- Create new album
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
          description = "",
          coverMediaId = null,
          genres = [],
          tracks = []
        } = data;

        console.log("Creating album with data:", { title, releaseDate, artistId, description, coverMediaId });

        if (!title || !releaseDate || !artistId || !tracks || tracks.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required fields: title, releaseDate, artistId, and at least one track." }));
          return;
        }


        const connection = await db.getConnection();
        await connection.beginTransaction();


        try {
          const [albumRes] = await connection.query(
            "INSERT INTO Album (Title, ReleaseDate, cover_media_id, Description, IsDeleted) VALUES (?, ?, ?, ?, 0)",
            [title, releaseDate, coverMediaId, description || null]
          );
          const albumId = albumRes.insertId;
          
          console.log("Album created with ID:", albumId, "Description:", description);
          
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
          console.error("Album creation error:", err);
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


    // --- PATCH album (partial update: cover, title, description, etc.)
    if (req.method === "PATCH" && idMatch) {
      const albumId = idMatch[1];
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        let updateData;
        try {
          updateData = JSON.parse(body);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }
        
        const allowed = ["Title", "ReleaseDate", "cover_media_id", "Description"];
        const setParts = [];
        const vals = [];
        
        for (const key of allowed) {
          if (key in updateData) {
            setParts.push(`${key} = ?`);
            vals.push(updateData[key]);
          }
        }
        
        if (!setParts.length) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "No fields to patch" }));
          return;
        }
        
        vals.push(albumId);
        
        try {
          const [result] = await db.query(
            `UPDATE Album SET ${setParts.join(', ')} WHERE AlbumID = ? AND IsDeleted = 0`,
            vals
          );
          
          if (result.affectedRows === 0) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Album not found" }));
            return;
          }
          
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ 
            AlbumID: albumId, 
            ...updateData, 
            message: "Album updated successfully" 
          }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ 
            error: "Failed to update album",
            sqlError: err.sqlMessage 
          }));
        }
      });
      return;
    }


    // --- PUT album (full update) ---
    if (req.method === "PUT" && idMatch) {
      const albumId = idMatch[1];
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const { Title, ReleaseDate, cover_media_id, Description } = JSON.parse(body);
          const [result] = await db.query(
            "UPDATE Album SET Title = ?, ReleaseDate = ?, cover_media_id = ?, Description = ? WHERE AlbumID = ? AND IsDeleted = 0",
            [Title, ReleaseDate, cover_media_id, Description || null, albumId]
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
            Description,
            message: "Album updated successfully"
          }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
        }
      });
      return;
    }


    // --- PUT album tracks (replaces all tracks)
    if (req.method === "PUT" && tracksMatch) {
      const albumId = tracksMatch[1];
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

        const { trackSongIds = [] } = data; 
        
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
          // 1. Delete all existing tracks for this album
          await connection.query("DELETE FROM Album_Track WHERE AlbumID = ?", [albumId]);

          // 2. Insert new tracks if any
          if (Array.isArray(trackSongIds) && trackSongIds.length > 0) {
            const trackValues = trackSongIds.map((songId, index) => [
              albumId,
              Number(songId),
              index + 1
            ]);
            
            await connection.query(
              "INSERT INTO Album_Track (AlbumID, SongID, TrackNumber) VALUES ?",
              [trackValues]
            );
          }

          await connection.commit();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Album tracks updated successfully" }));

        } catch (err) {
          await connection.rollback();
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            error: err.message || "Failed to update tracks",
            sqlError: err.sqlMessage
          }));
        } finally {
          connection.release();
        }
      });
      return;
    }


    // --- Delete album (soft delete)
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


    // --- Default 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Album endpoint not found" }));


  } catch (err) {
    console.error("Error handling album routes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
