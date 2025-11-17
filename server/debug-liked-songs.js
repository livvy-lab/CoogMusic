import db from "./db.js";

async function debugLikedSongs() {
  try {
    console.log("Debugging Liked Songs...\n");
    
    // Check all listeners with liked songs
    const [listeners] = await db.query(`
      SELECT DISTINCT ListenerID, 
        SUM(CASE WHEN IsLiked = 1 THEN 1 ELSE 0 END) as LikedCount,
        SUM(CASE WHEN IsLiked = 0 THEN 1 ELSE 0 END) as UnlikedCount
      FROM Liked_Song 
      GROUP BY ListenerID
      ORDER BY ListenerID
    `);
    
    console.log("Listeners with liked songs:");
    console.table(listeners);
    
    // For each listener, show their liked songs
    for (const listener of listeners) {
      if (listener.LikedCount > 0) {
        const [songs] = await db.query(`
          SELECT 
            ls.ListenerID,
            ls.SongID,
            s.Title,
            ls.IsLiked,
            ls.LikedDate
          FROM Liked_Song ls
          JOIN Song s ON ls.SongID = s.SongID
          WHERE ls.ListenerID = ? AND ls.IsLiked = 1
          ORDER BY ls.LikedDate DESC
        `, [listener.ListenerID]);
        
        console.log(`\nListenerID ${listener.ListenerID} - Liked Songs (${songs.length}):`);
        console.table(songs);
      }
    }
    
    // Test the exact query used by the API
    console.log("\n=== Testing API Query for ListenerID 6 ===");
    const [apiResult] = await db.query(`
      SELECT
        s.SongID,
        s.Title,
        s.DurationSeconds,
        s.ReleaseDate,
        s.cover_media_id,
        s.ArtistID,
        COALESCE(al.Title, 'Unknown Album') AS Album,
        GROUP_CONCAT(DISTINCT ar.ArtistName ORDER BY ar.ArtistName SEPARATOR ', ') AS ArtistName,
        ls.LikedDate
      FROM Liked_Song ls
      JOIN Song s ON ls.SongID = s.SongID
      LEFT JOIN Album_Track at ON s.SongID = at.SongID
      LEFT JOIN Album al ON at.AlbumID = al.AlbumID
      LEFT JOIN Song_Artist sa ON s.SongID = sa.SongID
      LEFT JOIN Artist ar ON sa.ArtistID = ar.ArtistID
      WHERE ls.ListenerID = ? AND ls.IsLiked = 1
      GROUP BY s.SongID, s.Title, s.DurationSeconds, s.ReleaseDate, s.cover_media_id, s.ArtistID, al.Title, ls.LikedDate
      ORDER BY ls.LikedDate DESC;
    `, [6]);
    
    console.log(`API Query Result for ListenerID 6: ${apiResult.length} songs`);
    console.table(apiResult);
    
    await db.end();
    console.log("\n✅ Debug complete");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

debugLikedSongs();
