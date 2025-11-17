import db from "./db.js";

async function addTestLikes() {
  try {
    const listenerId = 6; // Default test listener
    const songIds = [10, 15, 16, 17, 18]; // Sample song IDs to like
    
    console.log(`Adding test liked songs for ListenerID ${listenerId}...\n`);
    
    for (const songId of songIds) {
      // Check if record exists
      const [exists] = await db.query(
        "SELECT * FROM Liked_Song WHERE ListenerID = ? AND SongID = ?",
        [listenerId, songId]
      );
      
      if (exists.length > 0) {
        // Update to liked
        await db.query(
          "UPDATE Liked_Song SET IsLiked = 1, LikedDate = CURDATE() WHERE ListenerID = ? AND SongID = ?",
          [listenerId, songId]
        );
        console.log(`✅ Updated SongID ${songId} to liked`);
      } else {
        // Insert new liked record
        await db.query(
          "INSERT INTO Liked_Song (ListenerID, SongID, LikedDate, IsLiked) VALUES (?, ?, CURDATE(), 1)",
          [listenerId, songId]
        );
        console.log(`✅ Inserted new liked record for SongID ${songId}`);
      }
    }
    
    // Verify
    const [results] = await db.query(`
      SELECT s.SongID, s.Title, ls.IsLiked, ls.LikedDate
      FROM Liked_Song ls
      JOIN Song s ON ls.SongID = s.SongID
      WHERE ls.ListenerID = ? AND ls.IsLiked = 1
      ORDER BY ls.LikedDate DESC
    `, [listenerId]);
    
    console.log(`\n✅ Total liked songs for ListenerID ${listenerId}: ${results.length}`);
    console.table(results);
    
    await db.end();
    console.log("\n✅ Test likes added successfully");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

addTestLikes();
