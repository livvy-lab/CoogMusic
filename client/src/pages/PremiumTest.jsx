// Test page for premium subscription
// Route: /premium-test

import React, { useState } from 'react';
import { usePremium, subscribeToPremium, cancelSubscription } from '../hooks/usePremium';
import { getUser } from '../lib/userStorage';
import PageLayout from '../components/PageLayout/PageLayout';

export default function PremiumTest() {
  const user = getUser();
  const { isPremium, loading, subscription, error, refetch } = usePremium(user?.listenerId);
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState('');

  if (!user) {
    return (
      <PageLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h1>Please log in to test premium features</h1>
        </div>
      </PageLayout>
    );
  }

  const handleSubscribe = async (months) => {
    try {
      setSubscribing(true);
      setMessage('');
      const result = await subscribeToPremium(user.listenerId, months);
      setMessage(`✅ ${result.message}`);
      await refetch();
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription?.subscriptionId) return;
    
    if (!window.confirm('Are you sure you want to cancel premium?')) return;

    try {
      setSubscribing(true);
      setMessage('');
      await cancelSubscription(subscription.subscriptionId);
      setMessage('✅ Subscription cancelled');
      await refetch();
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <PageLayout>
      <div style={{ 
        maxWidth: '800px', 
        margin: '40px auto', 
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ 
          color: '#612C4B', 
          marginBottom: '30px',
          borderBottom: '3px solid #895674',
          paddingBottom: '10px'
        }}>
          Premium Subscription Test
        </h1>

        {/* Current Status */}
        <div style={{
          background: isPremium ? '#E8F5E9' : '#FFEBEE',
          border: `2px solid ${isPremium ? '#4CAF50' : '#f44336'}`,
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '20px' }}>
            {loading ? '🔄 Checking Status...' : isPremium ? '✅ Premium Active' : '❌ No Premium'}
          </h2>

          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
            <p><strong>Listener ID:</strong> {user.listenerId}</p>
            <p><strong>Listener Name:</strong> {user.ListenerName || 'N/A'}</p>
            
            {error && (
              <p style={{ color: '#c62828' }}><strong>Error:</strong> {error}</p>
            )}

            {isPremium && subscription && (
              <>
                <p><strong>Subscription ID:</strong> {subscription.subscriptionId}</p>
                <p><strong>Started:</strong> {subscription.dateStarted}</p>
                <p><strong>Expires:</strong> {subscription.dateEnded || 'Never'}</p>
                {subscription.isLifetime ? (
                  <p><strong>Type:</strong> 🌟 Lifetime Access</p>
                ) : (
                  <p><strong>Days Remaining:</strong> ⏰ {subscription.daysRemaining} days</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            background: message.includes('✅') ? '#E8F5E9' : '#FFEBEE',
            border: `1px solid ${message.includes('✅') ? '#4CAF50' : '#f44336'}`,
            borderRadius: '4px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            {message}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#612C4B', marginBottom: '15px' }}>Test Actions</h3>
          
          {!isPremium && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleSubscribe(1)}
                disabled={subscribing}
                style={{
                  background: '#895674',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: subscribing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Subscribe for 1 Month
              </button>
              
              <button
                onClick={() => handleSubscribe(12)}
                disabled={subscribing}
                style={{
                  background: '#612C4B',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: subscribing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Subscribe for 1 Year
              </button>
              
              <button
                onClick={() => handleSubscribe(null)}
                disabled={subscribing}
                style={{
                  background: '#FFD700',
                  color: '#612C4B',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: subscribing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              >
                🌟 Lifetime Access
              </button>
            </div>
          )}

          {isPremium && (
            <button
              onClick={handleCancel}
              disabled={subscribing}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: subscribing ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Cancel Premium
            </button>
          )}
        </div>

        {/* Premium Benefits Info */}
        <div style={{
          background: '#F7ECF2',
          border: '2px solid #BDA0AE',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '30px'
        }}>
          <h3 style={{ color: '#612C4B', marginTop: 0 }}>Premium Benefits</h3>
          <ul style={{ lineHeight: '2', color: '#4B2C3D' }}>
            <li>🚫 <strong>Ad-Free Listening</strong> - No interruptions</li>
            <li>✨ <strong>Enhanced Experience</strong> - Premium badge</li>
            <li>⏰ <strong>Automatic Renewal</strong> - Monthly check system</li>
            <li>🔒 <strong>Secure</strong> - Auto-expires when payment stops</li>
          </ul>
        </div>

        {/* Testing Notes */}
        <div style={{
          background: '#FFF9C4',
          border: '1px solid #F9A825',
          borderRadius: '4px',
          padding: '15px',
          marginTop: '20px',
          fontSize: '13px'
        }}>
          <strong>🧪 Testing Notes:</strong>
          <ul style={{ marginTop: '10px', marginBottom: 0 }}>
            <li>Premium status is checked automatically when pages load</li>
            <li>AdDisplay component will NOT show if premium is active</li>
            <li>Database triggers auto-expire subscriptions monthly</li>
            <li>Check browser console for premium status logs</li>
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}
