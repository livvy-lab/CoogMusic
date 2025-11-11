import db from "./db.js";

async function testSearch() {
  try {
    const searchTerm = "Beyonce";
    const like = `%${searchTerm}%`;
    
    console.log(`Searching for: "${searchTerm}"\n`);
    
    // Test the exact query from search.js
    console.log("Testing Artist search query...");
    const [artists] = await db.query(
      `SELECT a.ArtistID AS id, a.ArtistName AS title, 'artist' AS type,
              a.PFP AS legacyPfp, m.bucket, m.s3_key, a.IsDeleted
       FROM Artist a
       LEFT JOIN Media m ON m.MediaID = a.image_media_id
       WHERE (a.IsDeleted IS NULL OR a.IsDeleted = 0) AND a.ArtistName LIKE ?
       LIMIT 15`,
      [like]
    );
    
    console.log("Artists found:", artists.length);
    console.log(JSON.stringify(artists, null, 2));
    
    // Also check without IsDeleted filter
    console.log("\n\nWithout IsDeleted filter:");
    const [allArtists] = await db.query(
      `SELECT a.ArtistID AS id, a.ArtistName AS title, a.IsDeleted
       FROM Artist a
       WHERE a.ArtistName LIKE ?`,
      [like]
    );
    console.log("All artists matching:", allArtists.length);
    console.log(JSON.stringify(allArtists, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testSearch();
