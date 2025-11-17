// Setup script to create the premium ad constraint trigger
import db from "./db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupPremiumAdConstraint() {
  try {
    console.log("=== Setting up Premium Ad Constraint Trigger ===\n");

    // Read the SQL file
    const sqlFile = path.join(__dirname, "sql", "premium_ad_constraint.sql");
    const sql = fs.readFileSync(sqlFile, "utf8");

    // Execute the DROP statement first
    console.log("Dropping existing trigger (if any)...");
    try {
      await db.query("DROP TRIGGER IF EXISTS PreventAdViewForPremium");
      console.log("✅ Old trigger dropped (if existed)\n");
    } catch (err) {
      console.log(`⚠️  Could not drop trigger: ${err.message}\n`);
    }

    // Create the trigger directly without parsing file
    console.log("Creating trigger...");
    const createTriggerSQL = `
CREATE TRIGGER PreventAdViewForPremium
BEFORE INSERT ON Ad_View
FOR EACH ROW
BEGIN
    DECLARE subscription_count INT DEFAULT 0;
    
    -- Check if listener has an active premium subscription
    SELECT COUNT(*) INTO subscription_count
    FROM Subscription
    WHERE ListenerID = NEW.ListenerID
      AND IsActive = 1
      AND COALESCE(IsDeleted, 0) = 0
      AND (DateEnded IS NULL OR DateEnded >= CURDATE());
    
    -- If user has active premium subscription, prevent ad view from being recorded
    IF subscription_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Premium users cannot view ads - ad view record blocked';
    END IF;
END`;
    
    await db.query(createTriggerSQL);
    console.log("✅ Trigger created successfully\n");

    console.log("\n=== Testing the Trigger ===\n");

    // Test 1: Check if trigger exists
    const [triggers] = await db.query(
      "SHOW TRIGGERS WHERE `Trigger` = 'PreventAdViewForPremium'"
    );

    if (triggers.length > 0) {
      console.log("✅ Trigger 'PreventAdViewForPremium' exists");
      console.log(`   Table: ${triggers[0].Table}`);
      console.log(`   Event: ${triggers[0].Event}`);
      console.log(`   Timing: ${triggers[0].Timing}`);
    } else {
      console.log("❌ Trigger was not created");
      process.exit(1);
    }

    // Test 2: Find a premium user
    const [[premiumUser]] = await db.query(`
      SELECT 
        l.ListenerID,
        l.FirstName,
        l.LastName,
        (SELECT COUNT(*) FROM Subscription s 
         WHERE s.ListenerID = l.ListenerID 
           AND s.IsActive = 1 
           AND COALESCE(s.IsDeleted, 0) = 0
           AND (s.DateEnded IS NULL OR s.DateEnded >= CURDATE())) as IsPremium
      FROM Listener l
      WHERE COALESCE(l.IsDeleted, 0) = 0
      HAVING IsPremium > 0
      LIMIT 1
    `);

    if (premiumUser) {
      console.log(`\n✅ Found premium user: ${premiumUser.FirstName} ${premiumUser.LastName} (ID: ${premiumUser.ListenerID})`);
      
      // Test 3: Try to insert an ad view for premium user (should fail)
      console.log("\n--- Testing Trigger: Attempting to insert ad view for premium user ---");
      
      // Get an ad ID
      const [[ad]] = await db.query(`
        SELECT AdID FROM Advertisement 
        WHERE COALESCE(IsDeleted, 0) = 0 
        LIMIT 1
      `);

      if (ad) {
        try {
          await db.query(
            `INSERT INTO Ad_View (AdID, ListenerID, DateViewed) 
             VALUES (?, ?, NOW())`,
            [ad.AdID, premiumUser.ListenerID]
          );
          console.log("❌ ERROR: Ad view was recorded for premium user (trigger didn't work!)");
        } catch (err) {
          if (err.message.includes("Premium users cannot view ads")) {
            console.log("✅ SUCCESS: Trigger blocked ad view for premium user");
            console.log(`   Error message: "${err.message}"`);
          } else {
            console.log(`⚠️  Unexpected error: ${err.message}`);
          }
        }
      } else {
        console.log("⚠️  No advertisements found to test with");
      }
    } else {
      console.log("\n⚠️  No premium users found to test with");
      console.log("   Create a premium subscription to test the trigger");
    }

    // Test 4: Try with non-premium user (should succeed)
    const [[nonPremiumUser]] = await db.query(`
      SELECT 
        l.ListenerID,
        l.FirstName,
        l.LastName,
        (SELECT COUNT(*) FROM Subscription s 
         WHERE s.ListenerID = l.ListenerID 
           AND s.IsActive = 1 
           AND COALESCE(s.IsDeleted, 0) = 0
           AND (s.DateEnded IS NULL OR s.DateEnded >= CURDATE())) as IsPremium
      FROM Listener l
      WHERE COALESCE(l.IsDeleted, 0) = 0
      HAVING IsPremium = 0
      LIMIT 1
    `);

    if (nonPremiumUser) {
      console.log(`\n--- Testing Trigger: Attempting to insert ad view for non-premium user ---`);
      console.log(`   Non-premium user: ${nonPremiumUser.FirstName} ${nonPremiumUser.LastName} (ID: ${nonPremiumUser.ListenerID})`);
      
      const [[ad]] = await db.query(`
        SELECT AdID FROM Advertisement 
        WHERE COALESCE(IsDeleted, 0) = 0 
        LIMIT 1
      `);

      if (ad) {
        try {
          const [result] = await db.query(
            `INSERT INTO Ad_View (AdID, ListenerID, DateViewed) 
             VALUES (?, ?, NOW())`,
            [ad.AdID, nonPremiumUser.ListenerID]
          );
          console.log("✅ SUCCESS: Ad view recorded for non-premium user (as expected)");
          
          // Clean up test record
          await db.query(
            `DELETE FROM Ad_View WHERE AdID = ? AND ListenerID = ? ORDER BY DateViewed DESC LIMIT 1`,
            [ad.AdID, nonPremiumUser.ListenerID]
          );
          console.log("   (Test record cleaned up)");
        } catch (err) {
          console.log(`❌ ERROR: Failed to record ad view for non-premium user: ${err.message}`);
        }
      }
    }

    console.log("\n=== Setup Complete ===");
    console.log("\nThe trigger is now active and will:");
    console.log("  ✅ Block ad view records for premium users");
    console.log("  ✅ Allow ad view records for non-premium users");
    console.log("  ✅ Provide a clear error message when blocked");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up premium ad constraint:", error);
    process.exit(1);
  }
}

setupPremiumAdConstraint();
