import db from "./db.js";

async function checkTriggers() {
  try {
    console.log("Checking Song table triggers...\n");
    
    const [triggers] = await db.query("SHOW TRIGGERS WHERE `Table` = 'Song'");
    
    if (triggers.length === 0) {
      console.log("No triggers found on Song table");
    } else {
      console.log("Triggers on Song table:");
      triggers.forEach(t => {
        console.log(`\n  Name: ${t.Trigger}`);
        console.log(`  Event: ${t.Event}`);
        console.log(`  Timing: ${t.Timing}`);
        console.log(`  Statement: ${t.Statement.substring(0, 200)}...`);
      });
    }
    
    // Check Song_Artist table structure
    console.log("\n\nChecking Song_Artist table structure...\n");
    const [cols] = await db.query("DESCRIBE Song_Artist");
    console.log("Song_Artist columns:");
    cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
    
    // Check if Song table has ArtistID
    console.log("\n\nChecking Song table structure...\n");
    const [songCols] = await db.query("DESCRIBE Song");
    console.log("Song table columns:");
    songCols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkTriggers();
