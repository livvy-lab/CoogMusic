import React, { useState, useEffect } from 'react';
import './Subscription.css';
import PageLayout from '../components/PageLayout/PageLayout';
import { getUser } from '../lib/userStorage';

const Subscription = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = getUser();
    if (!user?.listenerId) return;

    async function checkSubscription() {
      try {
        const res = await fetch(`http://localhost:3001/subscriptions/${user.listenerId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.hasActiveSubscription !== undefined) {
          setIsSubscribed(!!data.hasActiveSubscription);
        } else if (data?.IsActive !== undefined) {
          setIsSubscribed(!!data.IsActive);
        } else if (data?.Active !== undefined) {
          setIsSubscribed(!!data.Active);
        } else if (data?.subscription && data.subscription.IsActive !== undefined) {
          setIsSubscribed(!!data.subscription.IsActive);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        setError('Failed to check subscription status');
      }
    }

    checkSubscription();
  }, []);

  const handleSubscriptionToggle = async () => {
    const user = getUser();
    if (!user?.listenerId) {
      setError('Please log in first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!isSubscribed) {
        const res = await fetch('http://localhost:3001/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ListenerID: user.listenerId,
            PlanID: 1,
            StartDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            IsActive: 1
          })
        });

        if (!res.ok) throw new Error('Failed to subscribe');
        setIsSubscribed(true);
      } else {
        const checkRes = await fetch(`http://localhost:3001/subscriptions/${user.listenerId}`);
        if (!checkRes.ok) throw new Error('Failed to find subscription');
        const subData = await checkRes.json();
        const subscription = subData.subscription || subData || null;
        const subscriptionId = subscription?.SubscriptionID || subscription?.SubscriptionId || subscription?.id || subscription?.SubscriptionID;

        if (subscriptionId) {
          const res = await fetch(`http://localhost:3001/subscriptions/${subscriptionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              IsActive: 0,
              EndDate: new Date().toISOString().slice(0, 19).replace('T', ' ')
            })
          });

          if (!res.ok) throw new Error('Failed to unsubscribe');
        } else {
          console.warn('No subscription id returned; marking unsubscribed locally');
        }

        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Error toggling subscription:', err);
      setError(isSubscribed ? 'Failed to unsubscribe' : 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="subscription-container">
        <div className="subscription-header">
          <h1>Support Coogs Music & Grow Your Reach</h1>
          <p>Choose a plan that fits your needs - promote your music or enjoy ad-free streaming</p>
        </div>

        <div className="plans-container">
          <div className="plan-card free">
            <h2>Free</h2>
            <div className="plan-features">
              <div className="feature">
                <span className="checkmark"></span>
                <span>Stream with ads</span>
              </div>
              <div className="feature">
                <span className="checkmark"></span>
                <span>Can only have up to 10 playlists</span>
              </div>
              <div className="feature">
                <span className="checkmark"></span>
                <span>Can only make public playlist</span>
              </div>
            </div>
            <button
              className={`plan-button ${!isSubscribed ? 'current' : 'current-inactive'}`}
              disabled={loading}
            >
              Current Plan
            </button>
          </div>

          <div className="plan-card premium">
            <h2>Premium</h2>
            <div className="crown-icon"></div>
            <div className="plan-features">
              <div className="feature">
                <span className="checkmark"></span>
                <span>Ad-free listening</span>
              </div>
              <div className="feature">
                <span className="checkmark"></span>
                <span>Can have any amount of playlist</span>
              </div>
              <div className="feature">
                <span className="checkmark"></span>
                <span>Can make a playlist private</span>
              </div>
            </div>
            <button
              className={`plan-button ${isSubscribed ? 'subscribed' : 'subscribe'}`}
              onClick={handleSubscriptionToggle}
              disabled={loading}
            >
              {loading ? 'Processing...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>
        </div>

        {error && <div className="subscription-error">{error}</div>}
      </div>
    </PageLayout>
  );
};

export default Subscription;
