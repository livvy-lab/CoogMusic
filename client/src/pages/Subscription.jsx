import React from 'react';
import './Subscription.css';
import PageLayout from '../components/PageLayout/PageLayout';

const Subscription = () => {
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
              <span className="checkmark">✓</span>
              <span>Stream with ads</span>
            </div>
          </div>
          <button className="plan-button current">Current Plan</button>
        </div>

        <div className="plan-card premium">
          <h2>Premium</h2>
          <div className="crown-icon">👑</div>
          <div className="plan-features">
            <div className="feature">
              <span className="checkmark">✓</span>
              <span>Ad-free listening</span>
            </div>
          </div>
          <button className="plan-button subscribe">Subscribe</button>
        </div>
      </div>
    </div>
    </PageLayout>
  );
};

export default Subscription;