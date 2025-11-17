-- Premium Ad Constraint Trigger
-- This trigger prevents ad view records from being inserted for premium users
-- Ensures that premium users cannot have ads recorded at the database level

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS PreventAdViewForPremium;

-- Create trigger to prevent ad views for premium users
DELIMITER $$
CREATE TRIGGER PreventAdViewForPremium
BEFORE INSERT ON Ad_View
FOR EACH ROW
BEGIN
    DECLARE subscription_count INT DEFAULT 0;
    
    -- Check if listener has an active premium subscription
    -- Uses the same logic as the /premium/check endpoint
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
END$$
DELIMITER ;
