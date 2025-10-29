import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ArtistsPerspective.css';
import PageLayout from '../components/PageLayout/PageLayout';
import { API_BASE_URL } from "../config/api";
import { getUser } from '../lib/userStorage';

export default function ArtistsPerspective() {
  const navigate = useNavigate();
  const [artistName, setArtistName] = useState('Artist');
  const [totalStreams, setTotalStreams] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to resolve the artist name from the logged-in account
    const user = getUser();
    if (!user || !user.accountId) return;

    const controller = new AbortController();
    const signal = controller.signal;

    async function loadArtist() {
      try {
  const res = await fetch(`${API_BASE_URL}/artists`, { signal });
        if (!res.ok) return;
        const artists = await res.json();

        // server returns AccountID in Artist rows
        const found = artists.find(a => String(a.AccountID) === String(user.accountId));
        if (found && found.ArtistName) {
          setArtistName(found.ArtistName);
          // Fetch total streams and followers for this artist
          if (found.ArtistID) {
            fetchTotalStreams(found.ArtistID, signal);
            fetchFollowerCount(found.ArtistID, signal);
          }
        } else if (user.name) {
          setArtistName(user.name);
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to load artist name', err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchTotalStreams(artistId, signal) {
      try {
  const res = await fetch(`${API_BASE_URL}/plays/artist-streams?artistId=${artistId}`, { signal });
        if (!res.ok) return;
        const data = await res.json();
        setTotalStreams(data.totalStreams || 0);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to load stream count', err);
      }
    }

    async function fetchFollowerCount(artistId, signal) {
      try {
  const res = await fetch(`${API_BASE_URL}/follows/artist-followers?artistId=${artistId}`, { signal });
        if (!res.ok) return;
        const data = await res.json();
        setFollowerCount(data.followerCount || 0);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to load follower count', err);
      }
    }

    loadArtist();
    return () => controller.abort();
  }, []);

  return (
    <PageLayout>
      <div className="artist-dashboard-container">
        <h1 className="welcome-header">Welcome back, {artistName}</h1>

        <div className="stats-grid">
          <div className="streams-stats-box">
            <div className="stat-label">Total Streams</div>
            <div className="stat-value">
              {loading ? '...' : totalStreams.toLocaleString()}
            </div>
            <div className="stat-subtext">People have streamed your songs</div>
          </div>

          <div className="followers-stats-box">
            <div className="stat-label">Followers</div>
            <div className="stat-value">
              {loading ? '...' : followerCount.toLocaleString()}
            </div>
            <div className="stat-subtext">People following you</div>
          </div>
        </div>

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



