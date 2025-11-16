import React, { useState, useEffect } from 'react';
import './Subscription.css';
import PageLayout from '../components/PageLayout/PageLayout';
import { getUser } from '../lib/userStorage';
import { API_BASE_URL } from "../config/api";

const Subscription = () => {
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);

  const isSubscribed = !!activeSubscription;

  useEffect(() => {
    const user = getUser();
    if (!user?.listenerId) return;

    // fetch all available plans from the new table
    async function fetchPlans() {
      try {
        const res = await fetch(`${API_BASE_URL}/subscription-plans`);
        if (res.ok) {
          const data = await res.json();
          // store all plans that have a cost (e.g., "Monthly", "Annual")
          setPlans(data.filter(plan => plan.Cost > 0));
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      }
    }

    // check the user's current subscription status
    async function checkSubscription() {
      try {
        const res = await fetch(`${API_BASE_URL}/subscriptions/listener/${user.listenerId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveSubscription(data); // store the full subscription object (including PlanID, PlanName, etc.)
        } else {
          setActiveSubscription(null); // 404 means no active subscription
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        setActiveSubscription(null);
      }
    }

    fetchPlans();
    checkSubscription();
  }, []);

  // handles subscribing to a new plan
  const handleSubscribe = async (planId) => {
    const user = getUser();
    if (!user?.listenerId) {
      setError('Please log in first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // SUBSCRIBE
      const res = await fetch(`${API_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ListenerID: user.listenerId,
          DateStarted: new Date().toISOString().slice(0, 19).replace('T', ' '),
          DateEnded: null,
          IsActive: 1,
          PlanID: planId
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Subscription failed:', errText);
        throw new Error('Failed to subscribe');
      }

      const data = await res.json();
      console.log('✅ Subscription success:', data);
      setActiveSubscription(data); // set the new active subscription
      
      // Reload the page to remove ads from display
      window.location.reload();

    } catch (err) {
      console.error('Error subscribing:', err);
      setError('Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  // handles unsubscribing (reverting to free)
  const handleUnsubscribe = async () => {
    const user = getUser();
    if (!user?.listenerId || !activeSubscription) {
      setError('No active subscription found to unsubscribe from');
      return;
    }

    // confirmation handled by in-page modal

    setLoading(true);
    setError(null);

    try {
      // use the SubscriptionID from the state
      const subscriptionId = activeSubscription.SubscriptionID;

      if (!subscriptionId) {
        console.error('Could not find SubscriptionID in state');
        throw new Error('No active subscription found');
      }

      // Update the subscription to mark it inactive
      const res = await fetch(`${API_BASE_URL}/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          IsActive: 0,

        })
      });

      if (!res.ok) throw new Error('Failed to unsubscribe');

      setActiveSubscription(null); // User is no longer subscribed
      
      // Reload the page to show ads again
      window.location.reload();


    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError('Failed to unsubscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="subscription-container">
        <div className="subscription-header">
          <h1>Become a premium member ≽^•⩊•^≼ </h1>
          <p>Subscribe and obtain additional benefits</p>
        </div>

        <div className="plans-container">
          
          <div className="plan-card free">
            <h2>Free</h2>
            <h3 className="plan-price">$0.00<span> / month</span></h3>
            <div className="plan-features">
              <div className="feature">
                <span className="checkmark">X</span>
                <span>Ads appear on homepage</span>
              </div>
              <div className="feature">
                <span className="checkmark">X</span>
                <span>Can create up to 10 playlists</span>
              </div>
              <div className="feature">
                <span className="checkmark">X</span>
                <span>Can only create public playlists</span>
              </div>
            </div>
            <button
              className={`plan-button ${!isSubscribed ? 'current' : 'revert-free'}`}
              onClick={() => { if (isSubscribed && !loading) setShowConfirm(true); }}
              disabled={loading || !isSubscribed}
            >
              {!isSubscribed ? 'Current Plan' : (loading ? 'Processing...' : 'Cancel Subscription')}
            </button>
          </div>

          {plans.map(plan => {
          
            // check if the user is subscribed AND if this plan is their active one
            const isThisPlanActive = isSubscribed && activeSubscription.PlanID === plan.PlanID;

            return (
              <div className="plan-card premium" key={plan.PlanID}>
                <h2>{plan.PlanName}</h2>
                <div className="crown-icon"></div>
                <h3 className="plan-price">${plan.Cost}<span> / {plan.PlanName.toLowerCase().includes('annual') ? 'year' : 'month'}</span></h3>
                
                <div className="plan-features">
                  <div className="feature">
                    <span className="checkmark">✓</span>
                    <span>Remove ads on homepage</span>
                  </div>
                  <div className="feature">
                    <span className="checkmark">✓</span>
                    <span>Can create unlimited playlists</span>
                  </div>
                  <div className="feature">
                    <span className="checkmark">✓</span>
                    <span>Can create private playlists</span>
                  </div>
                </div>
                
                <button
                  className={`plan-button ${isThisPlanActive ? 'current' : 'subscribe-toggle'}`}
                  onClick={() => !isSubscribed ? handleSubscribe(plan.PlanID) : undefined}
                  disabled={loading || isSubscribed} // Disable if loading or ANY plan is active
                >
                  {loading ? 'Processing...' : 
                    isThisPlanActive ? 'Currently Active' : 
                    `Subscribe to ${plan.PlanName}`
                  }
                </button>
              </div>
            );
          })}

        </div>

        {error && <div className="subscription-error">{error}</div>}

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="sub-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <div className="sub-modal" onClick={(e) => e.stopPropagation()}>
              <h3 id="cancel-title">Cancel subscription?</h3>
              <p>Are you sure you want to cancel the subscription and change back to the Free plan? Ads will be shown again and premium features will be disabled.</p>
              <div className="sub-modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowConfirm(false)}
                  aria-label="Keep subscription"
                >
                  Keep Subscription
                </button>
                <button
                  className="btn-danger"
                  onClick={async () => { try { await handleUnsubscribe(); } finally { setShowConfirm(false); } }}
                  aria-label="Confirm cancel subscription"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
            {/* clicking overlay closes */}
            <button className="sub-modal-backdrop" aria-label="Close" onClick={() => setShowConfirm(false)} />
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Subscription;
