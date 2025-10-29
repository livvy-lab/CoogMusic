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

      // Fetch all advertisements (you may want to filter by artist/account later)
  const res = await fetch(`${API_BASE_URL}/advertisements`);
      if (!res.ok) throw new Error('Failed to fetch ads');
      
      const data = await res.json();
      // Filter only non-deleted ads
  // Treat undefined/null IsDeleted as active; backend already filters IsDeleted=0
  const activeAds = data.filter(ad => ad.IsDeleted === 0 || ad.IsDeleted === null || ad.IsDeleted === undefined);
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
              const fileUrl = (ad.AdFileUrl || (ad.AdFile && (ad.AdFile.startsWith('http') ? ad.AdFile : `${API_BASE_URL}${ad.AdFile}`)) || '');
              return (
              <div key={ad.AdID} className="ad-card">
                <div className="ad-preview">
                  {ad.AdFile && (
                    <div className="ad-file-preview">
                      {fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={fileUrl} alt={ad.AdName} />
                      ) : fileUrl.match(/\.(mp4|webm|mov)$/i) ? (
                        <video controls>
                          <source src={fileUrl} />
                        </video>
                      ) : fileUrl.match(/\.(mp3|wav|ogg)$/i) ? (
                        <audio controls>
                          <source src={fileUrl} />
                        </audio>
                      ) : (
                        <div className="file-icon">📄</div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="ad-info">
                  <h3 className="ad-title">{ad.AdName}</h3>
                  <div className="ad-meta">
                    <span className="ad-id">ID: {ad.AdID}</span>
                  </div>
                  {fileUrl && (
                    <a 
                      href={fileUrl} 
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
                  onClick={() => handleDelete(ad.AdID, ad.AdName)}
                >
                  🗑️ Delete
                </button>
              </div>
            );})}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default MyAds;
