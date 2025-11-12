-- Premium Subscription System Setup
-- This script creates triggers and procedures for managing premium subscriptions

-- =====================================================
-- 1. Stored Procedure: Check and Update Expired Subscriptions
-- =====================================================
-- This runs monthly to deactivate expired subscriptions

DELIMITER $$

DROP PROCEDURE IF EXISTS CheckExpiredSubscriptions$$

CREATE PROCEDURE CheckExpiredSubscriptions()
BEGIN
    -- Deactivate subscriptions where DateEnded has passed
    UPDATE Subscription
    SET IsActive = 0
    WHERE IsActive = 1
      AND DateEnded IS NOT NULL
      AND DateEnded < CURDATE()
      AND COALESCE(IsDeleted, 0) = 0;
    
    -- Log how many were deactivated
    SELECT ROW_COUNT() AS ExpiredSubscriptionsDeactivated;
END$$

DELIMITER ;

-- =====================================================
-- 2. Event: Run Monthly Subscription Check
-- =====================================================
-- This event runs automatically on the 1st of each month

-- Enable event scheduler (must be run by admin)
SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS MonthlySubscriptionCheck;

CREATE EVENT MonthlySubscriptionCheck
ON SCHEDULE EVERY 1 MONTH
STARTS CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01'), ' 00:00:00')
DO
CALL CheckExpiredSubscriptions();

-- =====================================================
-- 3. Helper Function: Check if Listener has Active Premium
-- =====================================================

DELIMITER $$

DROP FUNCTION IF EXISTS HasActivePremium$$

CREATE FUNCTION HasActivePremium(listener_id INT)
RETURNS TINYINT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE has_premium TINYINT DEFAULT 0;
    
    SELECT COUNT(*) INTO has_premium
    FROM Subscription
    WHERE ListenerID = listener_id
      AND IsActive = 1
      AND COALESCE(IsDeleted, 0) = 0
      AND (DateEnded IS NULL OR DateEnded >= CURDATE());
    
    RETURN IF(has_premium > 0, 1, 0);
END$$

DELIMITER ;

-- =====================================================
-- 4. Trigger: Validate Subscription on Insert/Update
-- =====================================================

DELIMITER $$

DROP TRIGGER IF EXISTS BeforeSubscriptionInsert$$

CREATE TRIGGER BeforeSubscriptionInsert
BEFORE INSERT ON Subscription
FOR EACH ROW
BEGIN
    -- Set DateStarted to current date if not provided
    IF NEW.DateStarted IS NULL THEN
        SET NEW.DateStarted = CURDATE();
    END IF;
    
    -- If DateEnded is not set or in future, mark as active
    IF NEW.DateEnded IS NULL OR NEW.DateEnded >= CURDATE() THEN
        SET NEW.IsActive = 1;
    ELSE
        SET NEW.IsActive = 0;
    END IF;
    
    -- Ensure IsDeleted defaults to 0
    IF NEW.IsDeleted IS NULL THEN
        SET NEW.IsDeleted = 0;
    END IF;
END$$

DROP TRIGGER IF EXISTS BeforeSubscriptionUpdate$$

CREATE TRIGGER BeforeSubscriptionUpdate
BEFORE UPDATE ON Subscription
FOR EACH ROW
BEGIN
    -- Auto-deactivate if DateEnded has passed
    IF NEW.DateEnded IS NOT NULL AND NEW.DateEnded < CURDATE() THEN
        SET NEW.IsActive = 0;
    END IF;
    
    -- Auto-activate if DateEnded is extended to future
    IF (NEW.DateEnded IS NULL OR NEW.DateEnded >= CURDATE()) AND NEW.IsDeleted = 0 THEN
        SET NEW.IsActive = 1;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- 5. Create View: Active Premium Listeners
-- =====================================================

CREATE OR REPLACE VIEW ActivePremiumListeners AS
SELECT 
    l.ListenerID,
    l.FirstName,
    l.LastName,
    s.SubscriptionID,
    s.DateStarted,
    s.DateEnded,
    CASE 
        WHEN s.DateEnded IS NULL THEN 'Lifetime'
        ELSE DATEDIFF(s.DateEnded, CURDATE())
    END AS DaysRemaining
FROM Listener l
JOIN Subscription s ON s.ListenerID = l.ListenerID
WHERE s.IsActive = 1
  AND COALESCE(s.IsDeleted, 0) = 0
  AND COALESCE(l.IsDeleted, 0) = 0
  AND (s.DateEnded IS NULL OR s.DateEnded >= CURDATE());

-- =====================================================
-- Test the setup
-- =====================================================

-- Test the function
SELECT 
    ListenerID,
    FirstName,
    LastName,
    HasActivePremium(ListenerID) AS IsPremium
FROM Listener
WHERE IsDeleted = 0
LIMIT 5;

-- Show active premium listeners
SELECT * FROM ActivePremiumListeners;

-- Show subscription status
SELECT 
    SubscriptionID,
    ListenerID,
    DateStarted,
    DateEnded,
    IsActive,
    CASE 
        WHEN DateEnded IS NULL THEN 'No expiration'
        WHEN DateEnded < CURDATE() THEN CONCAT('Expired ', DATEDIFF(CURDATE(), DateEnded), ' days ago')
        ELSE CONCAT('Expires in ', DATEDIFF(DateEnded, CURDATE()), ' days')
    END AS Status
FROM Subscription
WHERE IsDeleted = 0
ORDER BY IsActive DESC, DateEnded DESC;
