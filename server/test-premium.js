// server/test-premium.js
// Test script for premium subscription system

import db from "./db.js";

async function testPremiumSystem() {
  try {
    console.log("=== Premium Subscription Test ===\n");

    // 1. Get a test listener
    const [listeners] = await db.query(
      "SELECT ListenerID, FirstName, LastName FROM Listener WHERE IsDeleted = 0 LIMIT 3"
    );
    
    if (listeners.length === 0) {
      console.log("❌ No listeners found in database");
      process.exit(1);
    }

    console.log("Available listeners:");
    listeners.forEach(l => {
      console.log(`  - ID ${l.ListenerID}: ${l.FirstName} ${l.LastName}`);
    });

    const testListenerId = listeners[0].ListenerID;
    console.log(`\n📝 Using Listener ID ${testListenerId} for testing\n`);

    // 2. Check current premium status
    console.log("--- Checking Current Status ---");
    const [[currentStatus]] = await db.query(
      `SELECT 
        COUNT(*) as HasPremium,
        MAX(DateEnded) as LatestExpiration
      FROM Subscription
      WHERE ListenerID = ?
        AND IsActive = 1
        AND COALESCE(IsDeleted, 0) = 0
        AND (DateEnded IS NULL OR DateEnded >= CURDATE())`,
      [testListenerId]
    );

    console.log(`Current Premium Status: ${currentStatus.HasPremium > 0 ? '✅ Active' : '❌ Not Active'}`);
    if (currentStatus.LatestExpiration) {
      console.log(`Latest Expiration: ${currentStatus.LatestExpiration}`);
    }

    // 3. Create a test subscription (1 month)
    console.log("\n--- Creating Test Subscription (1 month) ---");
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const [insertResult] = await db.query(
      `INSERT INTO Subscription (ListenerID, DateStarted, DateEnded, IsActive, IsDeleted)
       VALUES (?, CURDATE(), ?, 1, 0)`,
      [testListenerId, endDate.toISOString().split('T')[0]]
    );

    console.log(`✅ Created Subscription ID: ${insertResult.insertId}`);
    console.log(`   Start Date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   End Date: ${endDate.toISOString().split('T')[0]}`);

    // 4. Verify premium status
    console.log("\n--- Verifying Premium Status ---");
    const [[verifyStatus]] = await db.query(
      `SELECT 
        s.SubscriptionID,
        s.DateStarted,
        s.DateEnded,
        s.IsActive,
        DATEDIFF(s.DateEnded, CURDATE()) AS DaysRemaining
      FROM Subscription s
      WHERE s.ListenerID = ?
        AND s.IsActive = 1
        AND COALESCE(s.IsDeleted, 0) = 0
      ORDER BY s.DateStarted DESC
      LIMIT 1`,
      [testListenerId]
    );

    if (verifyStatus) {
      console.log("✅ Premium Subscription Active!");
      console.log(`   Subscription ID: ${verifyStatus.SubscriptionID}`);
      console.log(`   Days Remaining: ${verifyStatus.DaysRemaining}`);
      console.log(`   Expires: ${verifyStatus.DateEnded}`);
    }

    // 5. Test the API endpoint (simulate)
    console.log("\n--- API Check Simulation ---");
    console.log(`To test the API, run:`);
    console.log(`  curl http://localhost:3001/premium/check/${testListenerId}`);
    console.log(`Or in browser:`);
    console.log(`  http://localhost:3001/premium/check/${testListenerId}`);

    // 6. Show what to check in frontend
    console.log("\n--- Frontend Testing ---");
    console.log(`1. Login as listener with ID ${testListenerId}`);
    console.log(`2. Open browser console`);
    console.log(`3. Look for premium status check logs`);
    console.log(`4. Verify AdDisplay component doesn't render`);

    // 7. Create an expired subscription for comparison
    console.log("\n--- Creating Expired Subscription Example ---");
    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() - 1);

    // Use a different listener if available
    const expiredListenerId = listeners.length > 1 ? listeners[1].ListenerID : testListenerId;
    
    await db.query(
      `INSERT INTO Subscription (ListenerID, DateStarted, DateEnded, IsActive, IsDeleted)
       VALUES (?, DATE_SUB(CURDATE(), INTERVAL 2 MONTH), DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 0, 0)`,
      [expiredListenerId]
    );

    console.log(`✅ Created expired subscription for Listener ${expiredListenerId} (for comparison)`);

    // 8. Summary
    console.log("\n=== Test Summary ===");
    console.log(`✅ Active Premium: Listener ${testListenerId}`);
    console.log(`❌ Expired Premium: Listener ${expiredListenerId}`);
    console.log(`\nTest complete! You can now:`);
    console.log(`1. Start your backend: cd server && node index.js`);
    console.log(`2. Start your frontend: cd client && npm run dev`);
    console.log(`3. Login as listener ${testListenerId} and verify no ads show`);
    console.log(`4. Login as listener ${expiredListenerId} and verify ads DO show`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testPremiumSystem();
