import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Find a test listener and artist
const [listeners] = await conn.query('SELECT ListenerID, FirstName, LastName FROM Listener WHERE COALESCE(IsDeleted, 0) = 0 LIMIT 1');
const [artists] = await conn.query('SELECT ArtistID, ArtistName FROM Artist WHERE COALESCE(IsDeleted, 0) = 0 AND ArtistID != 1 LIMIT 1');

if (listeners.length === 0 || artists.length === 0) {
  console.log('⚠️  Need test data');
  await conn.end();
  process.exit(0);
}

const listener = listeners[0];
const artist = artists[0];

console.log(`\nTest: Listener ${listener.FirstName} ${listener.LastName} (ID: ${listener.ListenerID}) follows Artist ${artist.ArtistName} (ID: ${artist.ArtistID})`);

// Clean up any existing follow
await conn.query(
  'DELETE FROM Follows WHERE FollowerID = ? AND FollowerType = "Listener" AND FollowingID = ? AND FollowingType = "Artist"',
  [listener.ListenerID, artist.ArtistID]
);

// Clean up any existing notifications
await conn.query(
  'DELETE FROM Notification WHERE Type = "NEW_FOLLOWER" AND FollowerID = ? AND ArtistID = ?',
  [listener.ListenerID, artist.ArtistID]
);

try {
  // Create the follow
  await conn.query(
    'INSERT INTO Follows (FollowerID, FollowerType, FollowingID, FollowingType, FollowDate) VALUES (?, "Listener", ?, "Artist", NOW())',
    [listener.ListenerID, artist.ArtistID]
  );
  
  console.log('✅ Follow created successfully (no crash!)');
  
  // Check if notifications were created
  const [notifications] = await conn.query(
    'SELECT * FROM Notification WHERE Type = "NEW_FOLLOWER" AND FollowerID = ? AND ArtistID = ? AND COALESCE(IsDeleted, 0) = 0',
    [listener.ListenerID, artist.ArtistID]
  );
  
  console.log(`\n📬 Notifications created: ${notifications.length}`);
  notifications.forEach(n => {
    console.log(`   - ListenerID: ${n.ListenerID}, Message: "${n.Message}"`);
  });
  
  // Clean up
  await conn.query(
    'DELETE FROM Follows WHERE FollowerID = ? AND FollowerType = "Listener" AND FollowingID = ? AND FollowingType = "Artist"',
    [listener.ListenerID, artist.ArtistID]
  );
  await conn.query(
    'DELETE FROM Notification WHERE Type = "NEW_FOLLOWER" AND FollowerID = ? AND ArtistID = ?',
    [listener.ListenerID, artist.ArtistID]
  );
  
  console.log('\n✨ Test completed and cleaned up');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

await conn.end();
