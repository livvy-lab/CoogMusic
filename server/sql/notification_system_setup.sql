-- Notification System Setup
-- This creates the notification table and trigger for new song releases

-- Create Notification table
CREATE TABLE IF NOT EXISTS Notification (
    NotificationID INT AUTO_INCREMENT PRIMARY KEY,
    ListenerID INT NOT NULL,
    ArtistID INT,
    SongID INT,
    NotificationType VARCHAR(50) NOT NULL,
    Message TEXT NOT NULL,
    IsRead TINYINT(1) DEFAULT 0,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    IsDeleted TINYINT(1) DEFAULT 0,
    FOREIGN KEY (ListenerID) REFERENCES Listener(ListenerID) ON DELETE CASCADE,
    FOREIGN KEY (ArtistID) REFERENCES Artist(ArtistID) ON DELETE SET NULL,
    FOREIGN KEY (SongID) REFERENCES Song(SongID) ON DELETE SET NULL,
    INDEX idx_listener_read (ListenerID, IsRead, CreatedAt),
    INDEX idx_created (CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drop trigger if exists (for re-running script)
DROP TRIGGER IF EXISTS notify_followers_on_song_release;

-- Create trigger to notify followers when an artist releases a song
DELIMITER $$

CREATE TRIGGER notify_followers_on_song_release
AFTER INSERT ON Song
FOR EACH ROW
BEGIN
    -- Only create notifications if the song is not deleted and has an artist
    IF COALESCE(NEW.IsDeleted, 0) = 0 AND NEW.ArtistID IS NOT NULL THEN
        -- Insert notifications for all listeners following this artist
        INSERT INTO Notification (ListenerID, ArtistID, Type, ContentID, ContentTitle, Message, IsRead, CreatedAt)
        SELECT 
            f.FollowerID,
            NEW.ArtistID,
            'NEW_SONG_RELEASE',
            NEW.SongID,
            NEW.Title,
            CONCAT(a.ArtistName, ' released a new song: ', NEW.Title),
            0,
            NOW()
        FROM Artist a
        JOIN Follows f ON f.FollowingID = a.ArtistID 
            AND f.FollowingType = 'Artist'
            AND COALESCE(f.IsDeleted, 0) = 0
            AND f.FollowerType = 'Listener'
        WHERE a.ArtistID = NEW.ArtistID
            AND COALESCE(a.IsDeleted, 0) = 0;
    END IF;
END$$

DELIMITER ;

-- Grant permissions (if needed)
-- GRANT INSERT ON coog_music.Notification TO 'your_user'@'%';
