import React, { useState, useEffect, useMemo } from 'react';
import './MyAds.css';
import PageLayout from '../components/PageLayout/PageLayout';
import { getUser } from '../lib/userStorage';
import { API_BASE_URL } from "../config/api";
import { showToast } from '../lib/toast';

const MyAds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [adToDelete, setAdToDelete] = useState(null);

  const user = useMemo(() => getUser(), []);
  const isArtist = (user?.accountType || '').toLowerCase() === 'artist';

  useEffect(() => {
    if (isArtist) fetchAds();
    else {
      setError('Only artist accounts can manage ads.');
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [isArtist]);

  const fetchAds = async () => {
    try {
      setLoading(true);
      if (!user?.accountId) {
        setError('Please log in to view your ads');
        setLoading(false);
        return;
      }
      const artistId = user?.artistId;
      if (!artistId) {
        setError('Artist profile not found for this account.');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/advertisements?artistId=${encodeURIComponent(artistId)}`);
      if (!res.ok) throw new Error('Failed to fetch ads');
      const data = await res.json();
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

  const handleDeleteClick = (adId, adName) => {
    setAdToDelete({ adId, adName });
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!adToDelete) return;

    try {
      const res = await fetch(`${API_BASE_URL}/advertisements/${adToDelete.adId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete ad');
      setAds(ads.filter(ad => ad.AdID !== adToDelete.adId));
      showToast('Ad deleted successfully!', 'success');
    } catch (err) {
      console.error('Error deleting ad:', err);
      showToast('Failed to delete ad. Please try again.', 'error');
    } finally {
      setShowConfirm(false);
      setAdToDelete(null);
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
            <a href="/buy-ads" className="upload-link">
              Upload your first ad
            </a>
          </div>
        ) : (
          <div className="ads-grid">
            {ads.map(ad => {
              const id = ad.AdID ?? ad.adId ?? ad.id;
              const rawUrl =
                ad.AdFileUrl ||
                (ad.AdFile &&
                  (String(ad.AdFile).startsWith('http')
                    ? ad.AdFile
                    : `${API_BASE_URL}${ad.AdFile}`)) ||
                '';
              let ext = '';
              try {
                const u = new URL(rawUrl);
                const p = u.pathname || '';
                const dot = p.lastIndexOf('.');
                ext = dot >= 0 ? p.slice(dot + 1).toLowerCase() : '';
              } catch {}

              const isImage = /^(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/.test(ext);
              const isAudio = /^(mp3|wav|ogg|m4a|aac|flac)$/i.test(ext);

              return (
                <div key={id ?? Math.random()} className="ad-card">
                  <div className="ad-preview">
                    {(ad.AdFile || ad.AdFileUrl) ? (
                      <div className="ad-file-preview">
                        {isImage ? (
                          <img
                            src={rawUrl}
                            alt={ad.AdName || 'Ad'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#f0f0f0' }}
                            onError={e => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '';
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent && !parent.querySelector('.img-fallback')) {
                                const fallback = document.createElement('div');
                                fallback.className = "img-fallback";
                                fallback.textContent = "Image unavailable";
                                fallback.style = "color:#bbb;text-align:center;width:100%;padding:2em 0;";
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : isAudio ? (
                          <audio controls style={{ width: '100%' }}>
                            <source src={rawUrl} />
                          </audio>
                        ) : (
                          <div className="file-icon" style={{ fontSize: "1.2rem" }}>File</div>
                        )}
                      </div>
                    ) : (
                      <div className="file-icon" style={{ fontSize: "1.2rem" }}>File</div>
                    )}
                  </div>
                  <div className="ad-info">
                    <h3 className="ad-title">{ad.AdName}</h3>
                    {rawUrl && (
                      <a
                        href={rawUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-link"
                        tabIndex={0}
                      >
                        View File
                      </a>
                    )}
                  </div>
                  <div style={{ padding: '0 1.5rem 1rem' }}>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteClick(id, ad.AdName)}
                      style={{ background: '#dc3545', color: '#fff' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirm && adToDelete && (
          <div className="sub-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="sub-modal" onClick={(e) => e.stopPropagation()}>
              <h3 id="delete-title">Delete Ad?</h3>
              <p>Are you sure you want to delete "{adToDelete.adName}"? This action cannot be undone.</p>
              <div className="sub-modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowConfirm(false);
                    setAdToDelete(null);
                  }}
                  aria-label="Cancel deletion"
                >
                  Cancel
                </button>
                <button
                  className="btn-danger"
                  onClick={confirmDelete}
                  aria-label="Confirm delete ad"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
            <button
              className="sub-modal-backdrop"
              aria-label="Close"
              onClick={() => {
                setShowConfirm(false);
                setAdToDelete(null);
              }}
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default MyAds;
