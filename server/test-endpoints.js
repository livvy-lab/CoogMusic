import db from "./db.js";

async function testEndpoints() {
  try {
    console.log("Testing artist streams endpoint...");
    const [[streamRow]] = await db.query(
      `SELECT COUNT(*) AS TotalStreams
         FROM Play p
         JOIN Song s ON s.SongID = p.SongID
         JOIN Song_Artist sa ON sa.SongID = s.SongID
        WHERE sa.ArtistID = ?
          AND p.IsDeleted = 0
          AND s.IsDeleted = 0
          AND COALESCE(sa.IsDeleted, 0) = 0
          AND p.MsPlayed >= 0`,
      [1]
    );
    console.log("✅ Total Streams for Artist 1:", streamRow.TotalStreams);

    console.log("\nTesting monthly listeners endpoint...");
    const [[monthlyRow]] = await db.query(
      `SELECT COUNT(DISTINCT p.ListenerID) AS MonthlyListeners
         FROM Play p
         JOIN Song s ON s.SongID = p.SongID
         JOIN Song_Artist sa ON sa.SongID = s.SongID
        WHERE sa.ArtistID = ?
          AND p.IsDeleted = 0
          AND s.IsDeleted = 0
          AND COALESCE(sa.IsDeleted, 0) = 0
          AND p.MsPlayed >= 0
          AND YEAR(p.PlayedAt) = YEAR(CURDATE())
          AND MONTH(p.PlayedAt) = MONTH(CURDATE())`,
      [1]
    );
    console.log("✅ Monthly Listeners for Artist 1:", monthlyRow.MonthlyListeners);

    console.log("\nTesting follower count endpoint...");
    const [[followerRow]] = await db.query(
      "SELECT COUNT(*) AS FollowerCount FROM Follows WHERE FollowingID = ? AND FollowingType = 'Artist'",
      [1]
    );
    console.log("✅ Followers for Artist 1:", followerRow.FollowerCount);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testEndpoints();
