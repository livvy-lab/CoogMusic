import db from "./db.js";

async function checkLikedSongs() {
  try {
    console.log("Checking Liked_Song table...\n");
    
    // Check all records in Liked_Song
    const [allRecords] = await db.query(`
      SELECT ListenerID, SongID, IsLiked, LikedDate 
      FROM Liked_Song 
      ORDER BY LikedDate DESC 
      LIMIT 20
    `);
    
    console.log(`Total recent records in Liked_Song: ${allRecords.length}`);
    console.table(allRecords);
    
    // Check records by IsLiked status
    const [liked] = await db.query(`
      SELECT COUNT(*) as count 
      FROM Liked_Song 
      WHERE IsLiked = 1
    `);
    
    const [notLiked] = await db.query(`
      SELECT COUNT(*) as count 
      FROM Liked_Song 
      WHERE IsLiked = 0
    `);
    
    console.log(`\nRecords with IsLiked = 1: ${liked[0].count}`);
    console.log(`Records with IsLiked = 0: ${notLiked[0].count}`);
    
    // Check for a specific listener (e.g., ListenerID 6)
    const [listenerLiked] = await db.query(`
      SELECT s.SongID, s.Title, ls.IsLiked, ls.LikedDate
      FROM Liked_Song ls
      JOIN Song s ON ls.SongID = s.SongID
      WHERE ls.ListenerID = 6
      ORDER BY ls.LikedDate DESC
      LIMIT 10
    `);
    
    console.log(`\nLiked songs for ListenerID 6:`);
    console.table(listenerLiked);
    
    await db.end();
    console.log("\n✅ Check complete");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

checkLikedSongs();
