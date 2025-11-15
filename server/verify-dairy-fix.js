import db from "./db.js";

const STREAM_MS_THRESHOLD = 30000;

async function verifyDairyFix() {
  try {
    const artistId = 18; // DAIRY
    
    console.log("\n=== VERIFICATION: DAIRY ARTIST STREAMS ===\n");
    
    // Test the analytics endpoint query (what dashboard uses)
    console.log("1. Analytics Endpoint Query (Dashboard Total Streams):");
    const [[analytics]] = await db.query(`
      SELECT COUNT(*) AS totalStreams 
      FROM Play P
      JOIN Song S ON P.SongID = S.SongID
      JOIN Song_Artist SA ON S.SongID = SA.SongID
      WHERE SA.ArtistID = ?
        AND COALESCE(P.IsDeleted, 0) = 0
        AND COALESCE(S.IsDeleted, 0) = 0
        AND COALESCE(SA.IsDeleted, 0) = 0
        AND P.MsPlayed >= ?
        AND (NULL IS NULL OR DATE(P.PlayedAt) >= NULL) 
        AND (NULL IS NULL OR DATE(P.PlayedAt) <= NULL);
    `, [artistId, STREAM_MS_THRESHOLD]);
    console.log(`   Total Streams: ${analytics.totalStreams}`);
    
    // Test the top-tracks endpoint query (what shows individual song)
    console.log("\n2. Top Tracks Query (Individual Song Display):");
    const [[topTrack]] = await db.query(`
      SELECT COUNT(*) AS Streams
      FROM Play p
      WHERE p.SongID = 18
        AND COALESCE(p.IsDeleted,0)=0
        AND COALESCE(p.MsPlayed,0) >= ?
    `, [STREAM_MS_THRESHOLD]);
    console.log(`   Song 'takeover' Streams: ${topTrack.Streams}`);
    
    console.log("\n=== RESULT ===");
    if (analytics.totalStreams === topTrack.Streams) {
      console.log(`✅ SUCCESS! Both queries match: ${analytics.totalStreams} streams`);
    } else {
      console.log(`❌ MISMATCH: Analytics shows ${analytics.totalStreams}, Top Tracks shows ${topTrack.Streams}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

verifyDairyFix();
