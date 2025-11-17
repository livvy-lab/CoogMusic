import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true
};

async function setupFollowerNotifications() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully');

    // Execute SQL statements one at a time
    console.log('\n=== Step 1: Altering Notification table ===');
    
    // Add NEW_FOLLOWER to enum
    await connection.query(`
      ALTER TABLE Notification 
      MODIFY COLUMN Type ENUM('NEW_SONG', 'NEW_ALBUM', 'NEW_FOLLOWER') NOT NULL
    `);
    console.log('✅ Added NEW_FOLLOWER to Type enum');
    
    // Make ContentID nullable
    await connection.query(`
      ALTER TABLE Notification 
      MODIFY COLUMN ContentID INT NULL
    `);
    console.log('✅ Made ContentID nullable');
    
    // Make ContentTitle nullable
    await connection.query(`
      ALTER TABLE Notification 
      MODIFY COLUMN ContentTitle VARCHAR(255) NULL
    `);
    console.log('✅ Made ContentTitle nullable');
    
    console.log('\n=== Step 2: Creating triggers ===');
    
    // Drop existing triggers
    await connection.query('DROP TRIGGER IF EXISTS notify_artist_on_new_follower');
    await connection.query('DROP TRIGGER IF EXISTS notify_on_new_follower');
    await connection.query('DROP TRIGGER IF EXISTS remove_notification_on_unfollow');
    console.log('✅ Dropped old triggers if they existed');
    
    // Create follow notification trigger - only for Listeners being followed
    // (Artists can't receive notifications due to ListenerID FK constraint)
    await connection.query(`
      CREATE TRIGGER notify_on_new_follower
      AFTER INSERT ON Follows
      FOR EACH ROW
      BEGIN
          IF COALESCE(NEW.IsDeleted, 0) = 0 
             AND NEW.FollowingType = 'Listener' THEN
              
              INSERT INTO Notification (
                  ListenerID,
                  ArtistID, 
                  Type,
                  ContentID,
                  ContentTitle,
                  Message,
                  IsRead,
                  CreatedAt,
                  FollowerID
              )
              SELECT 
                  NEW.FollowingID,
                  COALESCE(
                      (SELECT ArtistID FROM Artist WHERE AccountID = 
                          (SELECT AccountID FROM Listener WHERE ListenerID = NEW.FollowerID) LIMIT 1),
                      1
                  ),
                  'NEW_FOLLOWER',
                  NULL,
                  NULL,
                  CASE 
                      WHEN NEW.FollowerType = 'Listener' THEN 
                          CONCAT(
                              (SELECT CONCAT(FirstName, ' ', LastName) FROM Listener WHERE ListenerID = NEW.FollowerID),
                              ' started following you'
                          )
                      WHEN NEW.FollowerType = 'Artist' THEN 
                          CONCAT(
                              (SELECT ArtistName FROM Artist WHERE ArtistID = NEW.FollowerID),
                              ' started following you'
                          )
                  END,
                  0,
                  NOW(),
                  NEW.FollowerID
              FROM DUAL
              WHERE NEW.FollowingID IS NOT NULL;
          END IF;
      END
    `);
    console.log('✅ Created notify_on_new_follower trigger (Listeners get notified when followed by Artists or Listeners)');
    
    // Create unfollow notification trigger
    await connection.query(`
      CREATE TRIGGER remove_notification_on_unfollow
      AFTER UPDATE ON Follows
      FOR EACH ROW
      BEGIN
          IF NEW.IsDeleted = 1 
             AND COALESCE(OLD.IsDeleted, 0) = 0
             AND NEW.FollowingType = 'Listener' THEN
              
              UPDATE Notification
              SET IsDeleted = 1
              WHERE Type = 'NEW_FOLLOWER'
                  AND ListenerID = NEW.FollowingID
                  AND FollowerID = NEW.FollowerID
                  AND COALESCE(IsDeleted, 0) = 0;
          END IF;
      END
    `);
    console.log('✅ Created remove_notification_on_unfollow trigger');
    console.log('\nSetup completed successfully');

    // Verify the triggers were created
    console.log('\n=== Verifying Triggers ===');
    const [triggers] = await connection.query(`
      SHOW TRIGGERS WHERE \`Trigger\` IN ('notify_artist_on_new_follower', 'remove_notification_on_unfollow')
    `);
    
    console.log('\nCreated triggers:');
    triggers.forEach(trigger => {
      console.log(`- ${trigger.Trigger} on ${trigger.Table} (${trigger.Event} ${trigger.Timing})`);
    });

    // Test the setup
    console.log('\n=== Running Tests ===');
    await testFollowerNotifications(connection);

  } catch (error) {
    console.error('Error setting up follower notifications:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

async function testFollowerNotifications(connection) {
  try {
    // Find a test listener and artist
    const [listeners] = await connection.query(`
      SELECT ListenerID, FirstName, LastName 
      FROM Listener 
      WHERE COALESCE(IsDeleted, 0) = 0 
      LIMIT 1
    `);
    
    const [artists] = await connection.query(`
      SELECT ArtistID, ArtistName 
      FROM Artist 
      WHERE COALESCE(IsDeleted, 0) = 0 
      LIMIT 1
    `);
    
    if (listeners.length === 0 || artists.length === 0) {
      console.log('⚠️  Not enough test data (need at least 1 listener and 1 artist)');
      return;
    }
    
    const listener = listeners[0];
    const artist = artists[0];
    
    console.log(`\nTest 1: Artist ${artist.ArtistName} (ID: ${artist.ArtistID}) follows Listener ${listener.FirstName} ${listener.LastName} (ID: ${listener.ListenerID})`);
    
    // Clean up any existing test follows
    await connection.query(`
      DELETE FROM Follows 
      WHERE FollowerID = ? AND FollowerType = 'Artist' 
        AND FollowingID = ? AND FollowingType = 'Listener'
    `, [artist.ArtistID, listener.ListenerID]);
    
    // Create a follow - Artist follows Listener
    await connection.query(`
      INSERT INTO Follows (FollowerID, FollowerType, FollowingID, FollowingType, FollowDate, IsDeleted)
      VALUES (?, 'Artist', ?, 'Listener', NOW(), 0)
    `, [artist.ArtistID, listener.ListenerID]);
    
    // Check if notification was created
    const [notifications] = await connection.query(`
      SELECT * FROM Notification
      WHERE Type = 'NEW_FOLLOWER'
        AND ListenerID = ?
        AND FollowerID = ?
        AND COALESCE(IsDeleted, 0) = 0
    `, [listener.ListenerID, artist.ArtistID]);
    
    if (notifications.length > 0) {
      console.log('✅ Follower notification created successfully');
      console.log(`   Message: "${notifications[0].Message}"`);
    } else {
      console.log('❌ Follower notification was NOT created');
    }
    
    // Test 2: Unfollow
    console.log(`\nTest 2: Artist ${artist.ArtistName} unfollows Listener ${listener.FirstName}`);
    
    await connection.query(`
      UPDATE Follows 
      SET IsDeleted = 1
      WHERE FollowerID = ? AND FollowerType = 'Artist' 
        AND FollowingID = ? AND FollowingType = 'Listener'
    `, [artist.ArtistID, listener.ListenerID]);
    
    // Check if notification was deleted
    const [deletedNotifications] = await connection.query(`
      SELECT * FROM Notification
      WHERE Type = 'NEW_FOLLOWER'
        AND ListenerID = ?
        AND FollowerID = ?
        AND COALESCE(IsDeleted, 0) = 0
    `, [listener.ListenerID, artist.ArtistID]);
    
    if (deletedNotifications.length === 0) {
      console.log('✅ Follower notification removed successfully on unfollow');
    } else {
      console.log('❌ Follower notification was NOT removed');
    }
    
    // Clean up test data
    await connection.query(`
      DELETE FROM Follows 
      WHERE FollowerID = ? AND FollowerType = 'Artist' 
        AND FollowingID = ? AND FollowingType = 'Listener'
    `, [artist.ArtistID, listener.ListenerID]);
    
    await connection.query(`
      DELETE FROM Notification
      WHERE Type = 'NEW_FOLLOWER'
        AND ListenerID = ?
        AND FollowerID = ?
    `, [listener.ListenerID, artist.ArtistID]);
    
    console.log('\n✨ Test data cleaned up');
    
  } catch (error) {
    console.error('Error testing follower notifications:', error);
  }
}

setupFollowerNotifications().catch(console.error);
