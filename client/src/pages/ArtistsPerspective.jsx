import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ArtistsPerspectiveNew.css';
import PageLayout from '../components/PageLayout/PageLayout';
import { API_BASE_URL } from "../config/api";
import { getUser } from '../lib/userStorage';
import { usePlayer } from '../context/PlayerContext';
import headphonesIcon from '../assets/icons/headphones-icon.svg';
import usersIcon from '../assets/icons/users-icon.svg';
import chartIcon from '../assets/icons/chart-icon.svg';
import uploadIcon from '../assets/icons/upload-icon.svg';
import megaphoneIcon from '../assets/icons/megaphone-icon.svg';
import albumIcon from '../assets/icons/album-icon.svg';
import uploadSongIcon from '../assets/navigation_icons/uploadsong.svg';

export default function ArtistsPerspective() {
  const navigate = useNavigate();
  const { playSong } = usePlayer();
  const [artistId, setArtistId] = useState(null);
  const [artistName, setArtistName] = useState('Artist');
  const [artistImageUrl, setArtistImageUrl] = useState(null);
  const [totalStreams, setTotalStreams] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [monthlyListeners, setMonthlyListeners] = useState(0);
  const [topSongs, setTopSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to resolve the artist ID from the logged-in account
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
        if (found && found.ArtistID) {
          setArtistId(found.ArtistID);
          // Fetch artist profile data using the same endpoint as ArtistCard
          fetchArtistProfile(found.ArtistID, signal);
          // Fetch all stats for this artist
          fetchTotalStreams(found.ArtistID, signal);
          fetchFollowerCount(found.ArtistID, signal);
          fetchMonthlyListeners(found.ArtistID, signal);
          fetchTopSongs(found.ArtistID, signal);
        } else if (user.name) {
          setArtistName(user.name);
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to load artist data', err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchArtistProfile(id, signal) {
      try {
        const res = await fetch(`${API_BASE_URL}/artists/${id}/profile`, { signal });
        if (!res.ok) return;
        const data = await res.json();
        // Set artist name
        if (data.ArtistName) setArtistName(data.ArtistName);
        // Use pfpSignedUrl (preferred), pfpUrl, or PFP (fallback) - same as ArtistCard
        const imageUrl = data.pfpSignedUrl || data.pfpUrl || data.PFP;
        if (imageUrl) setArtistImageUrl(imageUrl);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to load artist profile', err);
      }
    }

    async function fetchTotalStreams(artistId, signal) {
      try {
        // Use the same analytics endpoint as the analytics page
        const res = await fetch(`${API_BASE_URL}/analytics/artist/${artistId}/summary`, { signal });
        if (!res.ok) return;
        const data = await res.json();
        // Extract total streams from the totals array
        const streamsData = data.totals?.find(t => t.label === "Total Streams");
        setTotalStreams(streamsData?.value || 0);
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

    async function fetchMonthlyListeners(artistId, signal) {
      try {
        const res = await fetch(`${API_BASE_URL}/plays/artist-monthly-listeners?artistId=${artistId}`, { signal });
        if (!res.ok) return;
        const data = await res.json();
        setMonthlyListeners(data.monthlyListeners || 0);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to load monthly listeners', err);
      }
    }

    async function fetchTopSongs(artistId, signal) {
      try {
        const res = await fetch(`${API_BASE_URL}/artists/${artistId}/top-tracks?limit=3`, { signal });
        if (!res.ok) return;
        const data = await res.json();
        setTopSongs(data.tracks || []);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Failed to load top songs', err);
      }
    }

    loadArtist();
    return () => controller.abort();
  }, []);

  return (
    <PageLayout>
      <div className="artist-dashboard">
        <div className="welcome-row">
          {artistImageUrl ? (
            <img src={artistImageUrl} alt={artistName} className="artist-avatar" />
          ) : (
            <div className="artist-avatar placeholder" aria-label="No profile image">🎤</div>
          )}
          <h1 className="welcome-title">Welcome back, {artistName}</h1>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <img src={headphonesIcon} alt="Total Streams" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Streams</div>
              <div className="stat-value">
                {loading ? '...' : totalStreams.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <img src={usersIcon} alt="Followers" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Followers</div>
              <div className="stat-value">
                {loading ? '...' : followerCount >= 1000 ? `${(followerCount / 1000).toFixed(1)}k` : followerCount}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <img src={chartIcon} alt="Monthly Listeners" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Monthly Listeners</div>
              <div className="stat-value">
                {loading ? '...' : monthlyListeners.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-btn" onClick={() => navigate('/upload/song')}>
              <img src={uploadIcon} alt="" />
              <span>Upload New Track</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/buy-ads')}>
              <img src={megaphoneIcon} alt="" />
              <span>Create Ad Campaign</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/upload/album')}>
              <img src={albumIcon} alt="" />
              <span>Create Album</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/my-songs')}>
              <span className="qa-icon qa-icon--upload-song" aria-hidden="true" />
              <span>Manage Songs</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/my-albums')}>
              <img src={albumIcon} alt="" />
              <span>Manage Albums</span>
            </button>
          </div>
        </div>

        {/* Top Songs */}
        <div className="top-songs">
          <h2 className="section-title">Top Songs</h2>
          <div className="songs-list">
            {topSongs.length > 0 ? (
              topSongs.map((song, index) => (
                <div 
                  key={song.SongID} 
                  className="song-row"
                  onClick={() => playSong({ songId: song.SongID })}
                >
                  <div className="song-left">
                    {/* Removed Heart Icon Here */}
                    <div className="song-artwork">
                      {song.CoverURL ? (
                        <img src={song.CoverURL} alt={song.Title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="artwork-placeholder">🎵</div>
                      )}
                    </div>
                    <div className="song-info">
                      <div className="song-title">{song.Title}</div>
                      <div className="song-artist">{artistName}</div>
                    </div>
                  </div>
                  <div className="song-right">
                    <div className="song-date">
                      {song.ReleaseDate ? new Date(song.ReleaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                    </div>
                    <div className="song-plays">
                      {(song.StreamCount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-songs">No songs yet. Upload your first track!</div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}