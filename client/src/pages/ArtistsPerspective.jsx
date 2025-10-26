import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ArtistsPerspective.css';
import PageLayout from '../components/PageLayout/PageLayout';


// Top songs will be dynamic

export default function ArtistsPerspective() {

  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStreams: 0,
    followers: 0,
    monthlyListeners: 0
  });
  const [topSongs, setTopSongs] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function loadData() {
      try {
        // replace these with your real endpoints
        const [statsRes, songsRes] = await Promise.all([
          fetch('/api/artist/stats', { signal }),
          fetch('/api/artist/top-songs', { signal })
        ]);

        if (!statsRes.ok || !songsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const statsJson = await statsRes.json();
        const songsJson = await songsRes.json();

        // Example expected shapes:
        // statsJson: { totalStreams: 12345, followers: 6789, monthlyListeners: 2345 }
        // songsJson: [ { rank:1, title: '...', artist:'...', plays: '10.2k', date: '...', duration: '2:33' }, ... ]

        setStats({
          totalStreams: statsJson.totalStreams ?? 0,
          followers: statsJson.followers ?? 0,
          monthlyListeners: statsJson.monthlyListeners ?? 0
        });

        setTopSongs(Array.isArray(songsJson) ? songsJson : []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed loading artist data', err);
          // optionally set an error state to show a message in UI
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, []);

  return (
    <PageLayout>
      <div className="artist-dashboard-container">
        <h1 className="welcome-header">Welcome back, Artist</h1>
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Streams</div>
            <div className="stat-value">{stats.totalStreams}</div>
            <div className="stat-icon">🎧</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Followers</div>
            <div className="stat-value">{stats.followers}</div>
            <div className="stat-icon">👥</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Monthly Listeners</div>
            <div className="stat-value">{stats.monthlyListeners}</div>
            <div className="stat-icon">📊</div>
          </div>
        </div>
        <div className="quick-actions-box">
          <div className="quick-actions-label">Quick Actions</div>
          <div className="quick-actions-row">
            <button className="quick-action-btn">
              <span className="quick-action-icon">⬆️</span>
              Upload New Track
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/buy-ads')}>
              <span className="quick-action-icon">📢</span>
              Create Ad Campaign
            </button>
            <button className="quick-action-btn">
              <span className="quick-action-icon">📀</span>
              Create Album
            </button>
          </div>
        </div>
        <div className="top-songs-box">
          <div className="top-songs-label">Top Songs</div>
          <div className="top-songs-table">
            <div className="top-songs-header-row">
              <div className="col-rank">#</div>
              <div className="col-title">Title</div>
              <div className="col-plays">Plays</div>
              <div className="col-date">Date</div>
              <div className="col-duration">Duration</div>
            </div>
            {topSongs.length === 0 ? (
              <div className="top-songs-row" style={{textAlign: 'center', width: '100%'}}>Loading...</div>
            ) : (
              topSongs.map(song => (
                <div className="top-songs-row" key={song.rank}>
                  <div className="col-rank">{song.rank}</div>
                  <div className="col-title">
                    <span className="song-title">{song.title}</span>
                    <span className="song-artist">{song.artist}</span>
                  </div>
                  <div className="col-plays">{song.plays} plays</div>
                  <div className="col-date">{song.date}</div>
                  <div className="col-duration">{song.duration}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageLayout>

  );
}



