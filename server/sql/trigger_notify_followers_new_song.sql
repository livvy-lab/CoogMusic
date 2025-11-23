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

-- Drop triggers if they exist (for re-running script)
DROP TRIGGER IF EXISTS notify_followers_on_song_release;
DROP TRIGGER IF EXISTS notify_followers_on_song_artist_insert;
DROP TRIGGER IF EXISTS remove_song_notifications_on_delete;

-- Trigger 1: Notify followers when song is linked to artist
-- NOTE: Trigger is on Song_Artist instead of Song because the artist relationship
-- must exist before we can notify followers
DELIMITER $$

CREATE TRIGGER notify_followers_on_song_artist_insert
AFTER INSERT ON Song_Artist
FOR EACH ROW
BEGIN
    -- Only create notifications if the song_artist relationship is not deleted
    IF COALESCE(NEW.IsDeleted, 0) = 0 THEN
        -- Insert notifications for all listeners following this artist
        INSERT INTO Notification (ListenerID, ArtistID, Type, ContentID, ContentTitle, Message, IsRead, CreatedAt)
        SELECT 
            f.FollowerID,
            NEW.ArtistID,
            'NEW_SONG',
            s.SongID,
            s.Title,
            CONCAT(a.ArtistName, ' released a new song: ', s.Title),
            0,
            NOW()
        FROM Song s
        JOIN Artist a ON a.ArtistID = NEW.ArtistID
        JOIN Follows f ON f.FollowingID = a.ArtistID 
            AND f.FollowingType = 'Artist'
            AND COALESCE(f.IsDeleted, 0) = 0
            AND f.FollowerType = 'Listener'
        WHERE s.SongID = NEW.SongID
            AND COALESCE(s.IsDeleted, 0) = 0
            AND COALESCE(a.IsDeleted, 0) = 0;
    END IF;
END$$

DELIMITER ;

-- Trigger 2: Remove notifications when song is deleted
DELIMITER $$

CREATE TRIGGER remove_song_notifications_on_delete
AFTER UPDATE ON Song
FOR EACH ROW
BEGIN
    -- If the song is being soft-deleted
    IF NEW.IsDeleted = 1 AND COALESCE(OLD.IsDeleted, 0) = 0 THEN
        -- Soft delete all NEW_SONG notifications for this song
        UPDATE Notification
        SET IsDeleted = 1
        WHERE Type = 'NEW_SONG'
            AND ContentID = NEW.SongID
            AND COALESCE(IsDeleted, 0) = 0;
    END IF;
END$$

DELIMITER ;

-- Grant permissions (if needed)
-- GRANT INSERT ON coog_music.Notification TO 'your_user'@'%';
