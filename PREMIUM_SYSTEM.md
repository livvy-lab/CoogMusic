# Premium Subscription System

## Overview
The premium subscription system allows listeners to pay for ad-free music listening. The system automatically checks subscription status monthly and deactivates expired subscriptions.

## Features
- ✅ **Ad-Free Listening**: Premium users don't see any advertisements
- ✅ **Automatic Monthly Checks**: Database triggers check subscription status monthly
- ✅ **Flexible Durations**: Support for monthly subscriptions or lifetime access
- ✅ **Auto-Expiration**: Subscriptions automatically deactivate when expired
- ✅ **Real-time Status**: Frontend checks premium status on page load

## Database Setup

### 1. Run the SQL Setup Script
Execute the SQL script to create triggers, procedures, and events:

```bash
cd server
mysql -h coogmusic.closg48w6b4j.us-east-2.rds.amazonaws.com -u admin -p coog_music < sql/premium_subscription_setup.sql
```

Or run it through Node:
```bash
node -e "import fs from 'fs'; import db from './db.js'; const sql = fs.readFileSync('./sql/premium_subscription_setup.sql', 'utf8'); const statements = sql.split(';').filter(s => s.trim()); for (const stmt of statements) { if (stmt.trim()) await db.query(stmt); } console.log('Setup complete'); process.exit(0);"
```

### 2. Database Components Created

#### Stored Procedure: `CheckExpiredSubscriptions()`
- Runs automatically on the 1st of each month
- Deactivates subscriptions where `DateEnded < CURDATE()`
- Returns count of expired subscriptions

#### Function: `HasActivePremium(listenerId)`
- Returns 1 if listener has active premium, 0 otherwise
- Can be used in SQL queries: `SELECT HasActivePremium(6) AS IsPremium`

#### Triggers:
- `BeforeSubscriptionInsert`: Auto-sets `IsActive` based on `DateEnded`
- `BeforeSubscriptionUpdate`: Auto-deactivates if `DateEnded` has passed

#### Event:
- `MonthlySubscriptionCheck`: Runs `CheckExpiredSubscriptions()` monthly

#### View:
- `ActivePremiumListeners`: Shows all currently active premium subscribers

## Backend API

### Endpoints

#### Check Premium Status
```http
GET /premium/check/:listenerId
```
Returns:
```json
{
  "listenerId": 6,
  "isPremium": true,
  "hasActiveSubscription": true,
  "subscription": {
    "subscriptionId": 1,
    "dateStarted": "2025-11-12",
    "dateEnded": "2026-11-12",
    "daysRemaining": 365,
    "isLifetime": false
  }
}
```

#### Subscribe to Premium
```http
POST /premium/subscribe
Content-Type: application/json

{
  "listenerId": 6,
  "durationMonths": 12
}
```
- `durationMonths`: Number of months (e.g., 1, 12) or `null` for lifetime
- Returns subscription details

#### Cancel Subscription
```http
PUT /premium/cancel/:subscriptionId
```
- Sets `IsActive = 0` and `DateEnded = CURDATE()`

#### Get Subscription History
```http
GET /premium/status/:listenerId
```
- Returns all subscriptions (active and expired) for a listener

## Frontend Usage

### Using the Premium Hook

```jsx
import { usePremium } from '../hooks/usePremium';

function MyComponent() {
  const user = getUser();
  const { isPremium, loading, subscription } = usePremium(user.listenerId);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isPremium ? (
        <p>✨ Premium User - Ad Free!</p>
      ) : (
        <p>Upgrade to Premium</p>
      )}
      
      {subscription && (
        <div>
          <p>Days Remaining: {subscription.daysRemaining}</p>
          {subscription.isLifetime && <p>Lifetime Access</p>}
        </div>
      )}
    </div>
  );
}
```

### Subscribe a User

```jsx
import { subscribeToPremium } from '../hooks/usePremium';

async function handleSubscribe() {
  try {
    const result = await subscribeToPremium(listenerId, 12); // 12 months
    console.log('Subscribed:', result);
    // Refetch premium status
  } catch (err) {
    console.error('Failed to subscribe:', err);
  }
}
```

### AdDisplay Integration

The `AdDisplay` component automatically checks premium status:

```jsx
<AdDisplay listenerId={user.listenerId} isSubscribed={false} />
```

- If user has active premium → No ads shown
- If user does not have premium → Ads displayed
- Premium status checked on component mount

## Testing

### Manual Testing

1. **Create a test subscription:**
```sql
INSERT INTO Subscription (ListenerID, DateStarted, DateEnded, IsActive, IsDeleted)
VALUES (6, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 1, 0);
```

2. **Check premium status:**
```bash
curl http://localhost:3001/premium/check/6
```

3. **Test via frontend:**
- Login as listener with ID 6
- Verify no ads appear
- Check browser console for premium status logs

### Automated Testing

```bash
# Check function works
cd server
node -e "import db from './db.js'; const [[r]] = await db.query('SELECT HasActivePremium(6) AS premium'); console.log('Is Premium:', r.premium); process.exit(0);"

# List active premium users
node -e "import db from './db.js'; const [users] = await db.query('SELECT * FROM ActivePremiumListeners'); console.log(JSON.stringify(users, null, 2)); process.exit(0);"

# Test expiration
node -e "import db from './db.js'; await db.query('CALL CheckExpiredSubscriptions()'); console.log('Checked expired subscriptions'); process.exit(0);"
```

## Subscription Plans (Suggested)

You can implement different plans:

```javascript
const PLANS = {
  MONTHLY: { months: 1, price: 9.99 },
  YEARLY: { months: 12, price: 99.99 },
  LIFETIME: { months: null, price: 299.99 }
};
```

## Security Considerations

1. **Payment Integration**: This system handles subscription logic only. Integrate with payment providers (Stripe, PayPal) for actual payments
2. **Validation**: Backend validates all subscription changes
3. **Auto-Expiration**: Prevents users from keeping premium after expiration
4. **Monthly Checks**: Database event ensures subscriptions stay accurate

## Future Enhancements

- [ ] Grace period (3-7 days after expiration)
- [ ] Email notifications before expiration
- [ ] Subscription renewal reminders
- [ ] Trial periods (7-day free trial)
- [ ] Family plans (multiple listeners)
- [ ] Payment integration (Stripe/PayPal)
- [ ] Admin dashboard for subscription management
- [ ] Analytics (revenue, churn rate, etc.)

## Troubleshooting

### Event Scheduler Not Running
```sql
-- Check if enabled
SHOW VARIABLES LIKE 'event_scheduler';

-- Enable it
SET GLOBAL event_scheduler = ON;

-- Check events
SHOW EVENTS;
```

### Subscriptions Not Auto-Expiring
```sql
-- Manually run the check
CALL CheckExpiredSubscriptions();

-- Verify trigger exists
SHOW TRIGGERS LIKE 'Subscription';
```

### Premium Status Not Updating
- Clear browser cache/localStorage
- Refetch premium status: `refetch()` from hook
- Check database: `SELECT * FROM Subscription WHERE ListenerID = ?`
