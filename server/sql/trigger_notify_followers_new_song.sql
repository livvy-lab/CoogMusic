-- Notification System Setup
-- This creates the notification table and trigger for new song releases

-- Create Notification table
CREATE TABLE IF NOT EXISTS Notification (
    NotificationID INT AUTO_INCREMENT PRIMARY KEY,
    ListenerID INT NOT NULL,
    ArtistID INT NOT NULL,
    Type ENUM('NEW_SONG', 'NEW_ALBUM') NOT NULL,
    ContentID INT NOT NULL COMMENT 'SongID or AlbumID depending on Type',
    ContentTitle VARCHAR(255) NOT NULL,
    Message TEXT NOT NULL,
    IsRead TINYINT DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    ReadAt DATETIME DEFAULT NULL,
    IsDeleted TINYINT DEFAULT 0,
    FollowerID INT DEFAULT NULL,
    PRIMARY KEY (NotificationID),
    KEY ArtistID (ArtistID),
    KEY idx_listener_unread (ListenerID, IsRead, CreatedAt),
    KEY idx_listener_created (ListenerID, CreatedAt DESC),
    KEY idx_content (Type, ContentID),
    CONSTRAINT Notification_ibfk_1 FOREIGN KEY (ListenerID) REFERENCES Listener(ListenerID),
    CONSTRAINT Notification_ibfk_2 FOREIGN KEY (ArtistID) REFERENCES Artist(ArtistID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Drop trigger if exists (for re-running script)
DROP TRIGGER IF EXISTS notify_followers_on_song_release;

-- Create trigger to notify followers when an artist releases a song
DELIMITER $$

CREATE TRIGGER notify_followers_on_song_release
AFTER INSERT ON Song
FOR EACH ROW
BEGIN
     -- Only create notifications if the song is not deleted
     IF COALESCE(NEW.IsDeleted, 0) = 0 THEN
         -- Insert notifications for all listeners following this artist
         INSERT INTO Notification (ListenerID, ArtistID, Type, ContentID, ContentTitle, Message, IsRead, CreatedAt)
         SELECT 
             f.FollowerID,
             sa.ArtistID,
             'NEW_SONG',
             NEW.SongID,
             NEW.Title,
             CONCAT(a.ArtistName, ' released a new song: ', NEW.Title),
             0,
             NOW()
         FROM Song_Artist sa
         JOIN Artist a ON a.ArtistID = sa.ArtistID
         JOIN Follows f ON f.FollowingID = a.ArtistID 
             AND f.FollowingType = 'Artist'
             AND COALESCE(f.IsDeleted, 0) = 0
             AND f.FollowerType = 'Listener'
         WHERE sa.SongID = NEW.SongID
             AND COALESCE(sa.IsDeleted, 0) = 0
             AND COALESCE(a.IsDeleted, 0) = 0;
     END IF;
END$$

DELIMITER ;

-- Grant permissions (if needed)
-- GRANT INSERT ON coog_music.Notification TO 'your_user'@'%';
