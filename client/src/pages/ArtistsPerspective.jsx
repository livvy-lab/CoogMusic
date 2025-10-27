import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ArtistsPerspective.css';
import PageLayout from '../components/PageLayout/PageLayout';
import { getUser } from '../lib/userStorage';

export default function ArtistsPerspective() {
  const navigate = useNavigate();
  const [artistName, setArtistName] = useState('Artist');

  useEffect(() => {
    // Try to resolve the artist name from the logged-in account
    const user = getUser();
    if (!user || !user.accountId) return;

    const controller = new AbortController();
    const signal = controller.signal;

    async function loadArtist() {
      try {
        const res = await fetch('http://localhost:3001/artists', { signal });
        if (!res.ok) return;
        const artists = await res.json();

        // server returns AccountID in Artist rows
        const found = artists.find(a => String(a.AccountID) === String(user.accountId));
        if (found && found.ArtistName) setArtistName(found.ArtistName);
        else if (user.name) setArtistName(user.name);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to load artist name', err);
      }
    }

    loadArtist();
    return () => controller.abort();
  }, []);

  return (
    <PageLayout>
      <div className="artist-dashboard-container">
  <h1 className="welcome-header">Welcome back, {artistName}</h1>

        <div className="quick-actions-box">
          <div className="quick-actions-label">Quick Actions</div>
          <div className="quick-actions-row">
            <button className="quick-action-btn" onClick={() => navigate('/upload')}>
              <span className="quick-action-icon">⬆️</span>
              Upload New Track
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/buy-ads')}>
              <span className="quick-action-icon">📢</span>
              Create Ad Campaign
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/upload')}>
              <span className="quick-action-icon">📀</span>
              Create Album
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}



