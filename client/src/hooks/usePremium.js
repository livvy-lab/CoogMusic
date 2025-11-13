// client/src/hooks/usePremium.js
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

/**
 * Hook to check if a listener has an active premium subscription
 * @param {number} listenerId - The ID of the listener
 * @returns {Object} { isPremium, loading, error, subscription, refetch }
 */
export function usePremium(listenerId) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const checkPremiumStatus = async () => {
    if (!listenerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/premium/check/${listenerId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to check premium status: ${response.status}`);
      }

      const data = await response.json();
      setIsPremium(data.isPremium || false);
      setSubscription(data.subscription || null);
    } catch (err) {
      console.error('Error checking premium status:', err);
      setError(err.message);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPremiumStatus();
  }, [listenerId]);

  return {
    isPremium,
    loading,
    error,
    subscription,
    refetch: checkPremiumStatus
  };
}

/**
 * Function to subscribe a listener to premium
 * @param {number} listenerId - The ID of the listener
 * @param {number} durationMonths - Duration in months (null for lifetime)
 * @returns {Promise<Object>} Subscription details
 */
export async function subscribeToPremium(listenerId, durationMonths = 12) {
  try {
    const response = await fetch(`${API_BASE_URL}/premium/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listenerId, durationMonths })
    });

    if (!response.ok) {
      throw new Error(`Failed to subscribe: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Error subscribing to premium:', err);
    throw err;
  }
}

/**
 * Function to cancel a subscription
 * @param {number} subscriptionId - The ID of the subscription to cancel
 * @returns {Promise<Object>} Cancellation confirmation
 */
export async function cancelSubscription(subscriptionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/premium/cancel/${subscriptionId}`, {
      method: 'PUT'
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel subscription: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('Error cancelling subscription:', err);
    throw err;
  }
}
