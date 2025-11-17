-- Follower Notification System Setup
-- This adds follower notification support to the existing notification system
-- NOTE: Due to FK constraint, only LISTENERS can receive notifications (not Artists)
-- So this notifies Listeners when they are followed by Artists or other Listeners

-- Step 1: Add NEW_FOLLOWER to the Type enum
ALTER TABLE Notification 
MODIFY COLUMN Type ENUM('NEW_SONG', 'NEW_ALBUM', 'NEW_FOLLOWER') NOT NULL;

-- Step 2: Make ContentID nullable since follower notifications don't have content
ALTER TABLE Notification 
MODIFY COLUMN ContentID INT NULL;

-- Step 3: Make ContentTitle nullable for the same reason
ALTER TABLE Notification 
MODIFY COLUMN ContentTitle VARCHAR(255) NULL;

-- Step 4: Drop existing triggers if they exist
DROP TRIGGER IF EXISTS notify_artist_on_new_follower;
DROP TRIGGER IF EXISTS notify_on_new_follower;
DROP TRIGGER IF EXISTS remove_notification_on_unfollow;

-- Step 5: Create trigger to notify listener when someone follows them
DELIMITER $$

CREATE TRIGGER notify_on_new_follower
AFTER INSERT ON Follows
FOR EACH ROW
BEGIN
    -- Only create notification if:
    -- 1. The follow is not deleted
    -- 2. The person being followed is a Listener (due to FK constraint on Notification.ListenerID)
    -- 3. The follower is either an Artist or Listener
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
            NEW.FollowingID,  -- The listener being followed receives the notification
            COALESCE(
                -- Try to find an ArtistID linked to the follower's account
                (SELECT ArtistID FROM Artist WHERE AccountID = 
                    (SELECT AccountID FROM Listener WHERE ListenerID = NEW.FollowerID) LIMIT 1),
                1  -- Default to ArtistID 1 if follower is an Artist
            ),
            'NEW_FOLLOWER',
            NULL,  -- No content for follower notifications
            NULL,  -- No content title
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
            NEW.FollowerID  -- Store the follower ID for later deletion
        FROM DUAL
        WHERE NEW.FollowingID IS NOT NULL;
    END IF;
END$$

DELIMITER ;

-- Step 6: Create trigger to remove notification when someone unfollows
DELIMITER $$

CREATE TRIGGER remove_notification_on_unfollow
AFTER UPDATE ON Follows
FOR EACH ROW
BEGIN
    -- If the follow is marked as deleted (unfollowed)
    IF NEW.IsDeleted = 1 
       AND COALESCE(OLD.IsDeleted, 0) = 0
       AND NEW.FollowingType = 'Listener' THEN
        
        -- Soft delete the follower notification
        UPDATE Notification
        SET IsDeleted = 1
        WHERE Type = 'NEW_FOLLOWER'
            AND ListenerID = NEW.FollowingID
            AND FollowerID = NEW.FollowerID
            AND COALESCE(IsDeleted, 0) = 0;
    END IF;
END$$

DELIMITER ;

-- Verification queries
SELECT 'Follower notification triggers created successfully' AS Status;

-- Show the triggers
SHOW TRIGGERS WHERE `Trigger` IN ('notify_on_new_follower', 'remove_notification_on_unfollow');
