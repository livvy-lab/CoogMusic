import db from "./db.js";

async function checkBeyonce() {
  try {
    console.log("Searching for Beyoncé in Artist table...\n");
    
    const [artists] = await db.query(
      "SELECT ArtistID, ArtistName, AccountID FROM Artist WHERE ArtistName LIKE '%Beyonce%' OR ArtistName LIKE '%Beyoncé%'"
    );
    console.log("Artists found:", JSON.stringify(artists, null, 2));
    
    if (artists.length > 0) {
      console.log("\nChecking AccountInfo for these artists...");
      for (const artist of artists) {
        const [accounts] = await db.query(
          "SELECT AccountID, Username FROM AccountInfo WHERE AccountID = ?",
          [artist.AccountID]
        );
        console.log(`Account for ${artist.ArtistName} (ID ${artist.ArtistID}):`, accounts[0]);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkBeyonce();
