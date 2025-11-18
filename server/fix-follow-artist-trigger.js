import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

console.log('Dropping old trigger...');
await conn.query('DROP TRIGGER IF EXISTS AfterFollowInsert_NotifyArtist');

console.log('Creating fixed trigger...');
await conn.query(`
  CREATE TRIGGER AfterFollowInsert_NotifyArtist
  AFTER INSERT ON Follows
  FOR EACH ROW
  BEGIN
    DECLARE followerName VARCHAR(255);
    DECLARE recentNotification INT;
    DECLARE artistListenerID INT DEFAULT NULL;

    -- Only notify if following an artist
    IF NEW.FollowingType = 'Artist' THEN

      -- Get follower name based on follower type
      IF NEW.FollowerType = 'Listener' THEN
        SELECT CONCAT(FirstName, ' ', LastName) INTO followerName
        FROM Listener
        WHERE ListenerID = NEW.FollowerID;
      ELSEIF NEW.FollowerType = 'Artist' THEN
        SELECT ArtistName INTO followerName
        FROM Artist
        WHERE ArtistID = NEW.FollowerID;
      END IF;

      -- Try to find if this artist has a listener account
      -- (Artists can have both Artist and Listener accounts linked via AccountID)
      SELECT ListenerID INTO artistListenerID
      FROM Listener
      WHERE AccountID = (
        SELECT AccountID FROM Artist WHERE ArtistID = NEW.FollowingID LIMIT 1
      )
      LIMIT 1;

      -- Only create notification if artist has a listener account
      -- (Due to FK constraint, we can't notify artists without listener accounts)
      IF artistListenerID IS NOT NULL THEN
        
        -- Check if there's a duplicate notification in the last 10 minutes
        SELECT COUNT(*) INTO recentNotification
        FROM Notification
        WHERE ListenerID = artistListenerID
          AND Type = 'NEW_FOLLOWER'
          AND FollowerID = NEW.FollowerID
          AND CreatedAt > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
          AND COALESCE(IsDeleted, 0) = 0;

        -- Only create notification if no recent duplicate exists
        IF recentNotification = 0 THEN
          INSERT INTO Notification (
            ListenerID,
            Type,
            ArtistID,
            FollowerID,
            Message,
            IsRead,
            CreatedAt
          ) VALUES (
            artistListenerID,  -- Artist's linked listener account
            'NEW_FOLLOWER',
            NEW.FollowingID,   -- The artist being followed
            NEW.FollowerID,    -- The follower
            CONCAT('You have a new follower: ', COALESCE(followerName, 'Someone')),
            0,
            NOW()
          );
        END IF;
      END IF;
    END IF;
  END
`);

console.log('✅ Fixed trigger created successfully');

// Verify
const [triggers] = await conn.query("SHOW TRIGGERS WHERE `Table` = 'Follows'");
console.log('\nCurrent triggers on Follows:');
triggers.forEach(t => console.log(`- ${t.Trigger} (${t.Timing} ${t.Event})`));

await conn.end();
