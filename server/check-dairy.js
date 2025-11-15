import db from "./db.js";

const STREAM_MS_THRESHOLD = 30000;

async function checkDairy() {
  try {
    // Find DAIRY artist
    const [[artist]] = await db.query(
      'SELECT ArtistID, ArtistName FROM Artist WHERE ArtistName LIKE "%DAIRY%"'
    );
    
    if (!artist) {
      console.log("DAIRY artist not found");
      process.exit(0);
    }
    
    console.log("\n=== ARTIST INFO ===");
    console.log(`Artist: ${artist.ArtistName} (ID: ${artist.ArtistID})`);
    
    // Get songs for this artist
    console.log("\n=== SONGS ===");
    const [songs] = await db.query(
      `SELECT s.SongID, s.Title
       FROM Song s
       JOIN Song_Artist sa ON s.SongID = sa.SongID
       WHERE sa.ArtistID = ?
         AND s.IsDeleted = 0
         AND COALESCE(sa.IsDeleted, 0) = 0`,
      [artist.ArtistID]
    );
    
    console.log(`Found ${songs.length} song(s):`);
    songs.forEach(song => console.log(`  - ${song.Title} (ID: ${song.SongID})`));
    
    // Get total streams using analytics endpoint query
    console.log("\n=== TOTAL STREAMS (Analytics Endpoint) ===");
    const [[analyticsRow]] = await db.query(
      `SELECT COUNT(*) AS TotalStreams
       FROM Play p
       JOIN Song s ON s.SongID = p.SongID
       JOIN Song_Artist sa ON sa.SongID = s.SongID
       WHERE sa.ArtistID = ?
         AND p.IsDeleted = 0
         AND s.IsDeleted = 0
         AND COALESCE(sa.IsDeleted, 0) = 0
         AND p.MsPlayed >= ?`,
      [artist.ArtistID, STREAM_MS_THRESHOLD]
    );
    console.log(`Total Streams (from analytics): ${analyticsRow.TotalStreams}`);
    
    // Get streams per song
    console.log("\n=== STREAMS PER SONG ===");
    for (const song of songs) {
      const [[songStreams]] = await db.query(
        `SELECT COUNT(*) AS Streams
         FROM Play
         WHERE SongID = ?
           AND IsDeleted = 0
           AND MsPlayed >= ?`,
        [song.SongID, STREAM_MS_THRESHOLD]
      );
      console.log(`  ${song.Title}: ${songStreams.Streams} streams`);
    }
    
    // Check all plays for these songs (including under threshold)
    console.log("\n=== ALL PLAYS (including under 30s) ===");
    for (const song of songs) {
      const [[allPlays]] = await db.query(
        `SELECT 
           COUNT(*) AS TotalPlays,
           SUM(CASE WHEN MsPlayed >= ? THEN 1 ELSE 0 END) AS ValidStreams,
           SUM(CASE WHEN MsPlayed < ? THEN 1 ELSE 0 END) AS UnderThreshold
         FROM Play
         WHERE SongID = ?
           AND IsDeleted = 0`,
        [STREAM_MS_THRESHOLD, STREAM_MS_THRESHOLD, song.SongID]
      );
      console.log(`  ${song.Title}:`);
      console.log(`    Total Plays: ${allPlays.TotalPlays}`);
      console.log(`    Valid Streams (≥30s): ${allPlays.ValidStreams}`);
      console.log(`    Under Threshold (<30s): ${allPlays.UnderThreshold}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDairy();
