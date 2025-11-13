// Test component to verify premium subscription works
// Add this to any page temporarily to test

import React from 'react';
import { usePremium } from '../hooks/usePremium';
import { getUser } from '../lib/userStorage';

export default function PremiumTestBanner() {
  const user = getUser();
  const { isPremium, loading, subscription, error } = usePremium(user?.listenerId);

  if (!user) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: isPremium ? '#4CAF50' : '#f44336',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
      zIndex: 10000,
      maxWidth: '300px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
        {loading ? '🔄 Checking...' : isPremium ? '✅ Premium Active' : '❌ No Premium'}
      </h3>
      
      {error && (
        <p style={{ margin: '5px 0', fontSize: '12px' }}>Error: {error}</p>
      )}
      
      {!loading && isPremium && subscription && (
        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
          <p style={{ margin: '5px 0' }}>
            Listener ID: {user.listenerId}
          </p>
          <p style={{ margin: '5px 0' }}>
            {subscription.isLifetime ? (
              '🌟 Lifetime Access'
            ) : (
              `⏰ ${subscription.daysRemaining} days left`
            )}
          </p>
          <p style={{ margin: '5px 0', fontSize: '11px', opacity: 0.9 }}>
            Expires: {subscription.dateEnded || 'Never'}
          </p>
        </div>
      )}
      
      {!loading && !isPremium && (
        <p style={{ fontSize: '12px', margin: '5px 0' }}>
          Listener ID: {user.listenerId}<br />
          Ads will show (if enabled)
        </p>
      )}
    </div>
  );
}

// Usage: Add to any page temporarily
// import PremiumTestBanner from '../components/PremiumTestBanner';
// <PremiumTestBanner />
