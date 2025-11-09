import React, { useState, useEffect, useMemo } from 'react';
import './MyAds.css';
import PageLayout from '../components/PageLayout/PageLayout';
import { getUser } from '../lib/userStorage';
import { API_BASE_URL } from "../config/api";

const MyAds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = useMemo(() => getUser(), []);
  const isArtist = (user?.accountType || '').toLowerCase() === 'artist';

  useEffect(() => {
    if (isArtist) {
      fetchAds();
    } else {
      setError('Only artist accounts can manage ads.');
      setLoading(false);
    }
  }, [isArtist]);

  const fetchAds = async () => {
    try {
      setLoading(true);
      if (!user?.accountId) {
        setError('Please log in to view your ads');
        setLoading(false);
        return;
      }

      // Fetch only this artist's advertisements
      const artistId = user?.artistId;
      if (!artistId) {
        setError('Artist profile not found for this account.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/advertisements?artistId=${encodeURIComponent(artistId)}`);
      if (!res.ok) throw new Error('Failed to fetch ads');
      
      const data = await res.json();
      // Backend already filters IsDeleted=0; keep a defensive client-side filter
      const activeAds = (Array.isArray(data) ? data : []).filter(
        ad => ad.IsDeleted === 0 || ad.IsDeleted === null || ad.IsDeleted === undefined
      );
      setAds(activeAds);
      setError(null);
    } catch (err) {
      console.error('Error fetching ads:', err);
      setError('Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adId, adName) => {
    if (!window.confirm(`Are you sure you want to delete "${adName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/advertisements/${adId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete ad');

      // Remove from UI
      setAds(ads.filter(ad => ad.AdID !== adId));
      alert('Ad deleted successfully!');
    } catch (err) {
      console.error('Error deleting ad:', err);
      alert('Failed to delete ad. Please try again.');
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="myads-container">
          <div className="myads-header">
            <h1>My Ads</h1>
          </div>
          <div className="loading">Loading your ads...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="myads-container">
        <div className="myads-header">
          <h1>My Ads</h1>
          <p>Manage all your uploaded advertisements</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {ads.length === 0 ? (
          <div className="no-ads">
            <p>You haven't uploaded any ads yet.</p>
            <a href="/buy-ads" className="upload-link">Upload your first ad →</a>
          </div>
        ) : (
          <div className="ads-grid">
            {ads.map(ad => {
              const id = ad.AdID ?? ad.adId ?? ad.id;
              const rawUrl = ad.AdFileUrl || (ad.AdFile && (String(ad.AdFile).startsWith('http') ? ad.AdFile : `${API_BASE_URL}${ad.AdFile}`)) || '';
              let ext = '';
              try {
                const u = new URL(rawUrl);
                const p = u.pathname || '';
                const dot = p.lastIndexOf('.');
                ext = dot >= 0 ? p.slice(dot + 1).toLowerCase() : '';
              } catch {}

              const isImage = /^(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext);
              const isVideo = /^(mp4|webm|mov|m4v|ogg|ogv)$/i.test(ext);
              const isAudio = /^(mp3|wav|ogg|m4a|aac|flac)$/i.test(ext);

              return (
                <div key={id ?? Math.random()} className="ad-card">
                  <div className="ad-preview">
                    {(ad.AdFile || ad.AdFileUrl) ? (
                      <div className="ad-file-preview">
                        {isImage ? (
                          <img src={rawUrl} alt={ad.AdName || 'Ad'} />
                        ) : isVideo ? (
                          <video controls>
                            <source src={rawUrl} />
                          </video>
                        ) : isAudio ? (
                          <audio controls>
                            <source src={rawUrl} />
                          </audio>
                        ) : (
                          // Fallback: try to render as image first; if it fails, show icon
                          <img src={rawUrl} alt={ad.AdName || 'Ad'} onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const div = document.createElement('div');
                              div.className = 'file-icon';
                              div.textContent = '📄';
                              parent.appendChild(div);
                            }
                          }} />
                        )}
                      </div>
                    ) : (
                      <div className="file-icon">📄</div>
                    )}
                  </div>

                  <div className="ad-info">
                    <h3 className="ad-title">{ad.AdName}</h3>
                    <div className="ad-meta">
                      
                    </div>
                    {rawUrl && (
                      <a
                        href={rawUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-link"
                      >
                        View File ↗
                      </a>
                    )}
                  </div>

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(id, ad.AdName)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default MyAds;
