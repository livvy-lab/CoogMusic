import db from "./db.js";

const STREAM_MS_THRESHOLD = 30000;

async function compareSources() {
  try {
    const artistId = 18; // DAIRY
    
    console.log("\n=== COMPARING DATA SOURCES FOR DAIRY (ArtistID: 18) ===\n");
    
    // Method 1: Analytics endpoint (Listen_History)
    console.log("1. Analytics Endpoint (Listen_History table):");
    const [[analytics]] = await db.query(`
      SELECT COUNT(*) AS totalStreams 
      FROM Listen_History LH
      JOIN Song_Artist SA ON LH.SongID = SA.SongID
      WHERE SA.ArtistID = ?
    `, [artistId]);
    console.log(`   Total Streams: ${analytics.totalStreams}`);
    
    // Method 2: Play table with threshold
    console.log("\n2. Play Table (with 30s threshold):");
    const [[plays]] = await db.query(`
      SELECT COUNT(*) AS TotalStreams
      FROM Play p
      JOIN Song s ON s.SongID = p.SongID
      JOIN Song_Artist sa ON sa.SongID = s.SongID
      WHERE sa.ArtistID = ?
        AND p.IsDeleted = 0
        AND s.IsDeleted = 0
        AND COALESCE(sa.IsDeleted, 0) = 0
        AND p.MsPlayed >= ?
    `, [artistId, STREAM_MS_THRESHOLD]);
    console.log(`   Total Streams: ${plays.TotalStreams}`);
    
    // Method 3: Top tracks query (individual song)
    console.log("\n3. Top Tracks Query (Song ID: 18 'takeover'):");
    const [[topTrack]] = await db.query(`
      SELECT COUNT(*) AS Streams
      FROM Play p
      WHERE p.SongID = 18
        AND COALESCE(p.IsDeleted,0)=0
        AND COALESCE(p.MsPlayed,0) >= ?
    `, [STREAM_MS_THRESHOLD]);
    console.log(`   Streams: ${topTrack.Streams}`);
    
    // Check Listen_History for the specific song
    console.log("\n4. Listen_History for Song ID 18:");
    const [[listenHistory]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM Listen_History
      WHERE SongID = 18
    `);
    console.log(`   Total entries: ${listenHistory.total}`);
    
    console.log("\n=== DISCREPANCY ANALYSIS ===");
    if (analytics.totalStreams !== plays.TotalStreams) {
      console.log(`⚠️  Analytics (${analytics.totalStreams}) ≠ Play table (${plays.TotalStreams})`);
      console.log(`   Difference: ${Math.abs(analytics.totalStreams - plays.TotalStreams)}`);
    } else {
      console.log(`✅ Both methods match: ${analytics.totalStreams} streams`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

compareSources();
