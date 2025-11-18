import React, { useState, useMemo } from 'react';
import './BuyAds.css';
import PageLayout from '../components/PageLayout/PageLayout';
import cat_left from '../assets/left_cat.svg';
import cat_right from '../assets/right_cat.svg';
import { getUser } from '../lib/userStorage';
import { API_BASE_URL } from "../config/api";
import { showToast } from '../lib/toast';

// Helper function to get audio duration
function getAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio file'));
    };
    
    audio.src = url;
  });
}

const BuyAds = () => {
  const [activeTab, setActiveTab] = useState('banner');
  const [formData, setFormData] = useState({
    adTitle: '',
    adFile: null
  });
  const [uploading, setUploading] = useState(false);

  const user = useMemo(() => getUser(), []);
  const isArtist = (user?.accountType || '').toLowerCase() === 'artist';

  const AD_PRICES = {
    'audio': 5.00,
    'banner': 2.50
  };
  const adPrice = AD_PRICES[activeTab];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (activeTab === 'banner') {
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (PNG, JPG, GIF, etc.)', 'error');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image file size must be less than 5MB', 'error');
        e.target.value = '';
        return;
      }
    } else {
      // Audio validation
      if (!file.type.startsWith('audio/')) {
        showToast('Please upload an audio file (MP3, WAV, etc.)', 'error');
        e.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('Audio file size must be less than 10MB', 'error');
        e.target.value = '';
        return;
      }

      // Check duration (15-30 seconds)
      try {
        const duration = await getAudioDuration(file);
        if (duration < 15) {
          showToast(`Audio file is ${Math.round(duration)} seconds. Minimum is 15 seconds.`, 'error');
          e.target.value = '';
          return;
        }
        if (duration > 30) {
          showToast(`Audio file is ${Math.round(duration)} seconds. Maximum is 30 seconds.`, 'error');
          e.target.value = '';
          return;
        }
      } catch (err) {
        console.error('Error checking audio duration:', err);
        showToast('Could not verify audio duration. Please try again.', 'error');
        e.target.value = '';
        return;
      }
    }

    setFormData(prevState => ({
      ...prevState,
      adFile: file
    }));
  };

  const handleTabChange = (tab) => {
    setFormData(prev => ({ ...prev, adFile: null }));
    const fileInput = document.getElementById('adFile');
    if (fileInput) fileInput.value = '';
    setActiveTab(tab);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isArtist) {
      showToast('Only artist accounts can upload ads.', 'error');
      return;
    }
    if (!formData.adFile) {
      showToast(`Please select ${activeTab === 'banner' ? 'an image' : 'an audio'} file to upload.`, 'error');
      return;
    }
    if (!formData.adTitle.trim()) {
      showToast('Please enter an ad title.', 'error');
      return;
    }

    setUploading(true);

    try {
      const fd = new FormData();
      fd.append('adFile', formData.adFile);
      fd.append('adTitle', formData.adTitle.trim());
      fd.append('adType', activeTab);

      const artistId = user?.artistId || user?.ArtistID;
      if (!artistId) throw new Error('Artist ID not found. Please log in again.');
      fd.append('artistId', String(artistId));

      const res = await fetch(`${API_BASE_URL}/upload/ad`, {
        method: 'POST',
        body: fd
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      console.log('Ad uploaded successfully:', data);

      if (data?.error || data?.db?.error) {
        showToast('File uploaded but database record failed. Please contact support.', 'error');
      } else {
        showToast(`${activeTab === 'banner' ? 'Banner' : 'Audio'} ad uploaded successfully! $${adPrice.toFixed(2)} has been charged.`, 'success');
        setFormData({ adTitle: '', adFile: null });
        const fileInput = document.getElementById('adFile');
        if (fileInput) fileInput.value = '';
        
        setTimeout(() => {
          window.location.href = '/my-ads';
        }, 1500);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast(`Upload error: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageLayout>
      <div className="buyads-container">
        <div className="buyads-header">
          <h1>Advertise with Coogs Music</h1>
          <p>Upload banner ads or audio ads to reach listeners at UH and promote your music.</p>
        </div>

        <div className="buyads-form-container">
          {!isArtist && (
            <div className="error-message" style={{
              marginBottom: 16,
              padding: '12px',
              backgroundColor: '#ffe0e0',
              color: '#c00',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '0.95rem'
            }}>
              This feature is available to artist accounts only. Please log in as an artist.
            </div>
          )}

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              type="button"
              className={`tab-button ${activeTab === 'banner' ? 'active' : ''}`}
              onClick={() => handleTabChange('banner')}
              disabled={!isArtist || uploading}
            >
              Ad Banner $2.50
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => handleTabChange('audio')}
              disabled={!isArtist || uploading}
            >
              Audio Ad $5.00
            </button>
          </div>

          {/* Tab Description */}
          <div className="tab-description">
            {activeTab === 'banner' ? (
              <p>
                <strong>Banner Ads</strong> appear on the home page and playlists.
              </p>
            ) : (
              <p>
                <strong>Audio Ads</strong> play between songs for non-subscribers.
                Upload an audio file that is between 15-30 seconds.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Ad Title */}
            <div className="form-group artist-id-group">
              <input
                type="text"
                name="adTitle"
                placeholder="Ad Title"
                value={formData.adTitle}
                onChange={handleInputChange}
                className="artist-id-input"
                disabled={!isArtist || uploading}
                maxLength="150"
                required
              />
            </div>

            {/* File Upload */}
            <div className="form-group upload-group">
              <div className="upload-button">
                <label htmlFor="adFile">
                  {formData.adFile
                    ? 'Change File'
                    : 'Upload File'
                  }
                </label>
                <input
                  type="file"
                  id="adFile"
                  name="adFile"
                  accept={activeTab === 'banner' ? 'image/*' : 'audio/*'}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={!isArtist || uploading}
                  required
                />
              </div>
              {formData.adFile && (
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <span className="file-name">{formData.adFile.name}</span>
                  <br />
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>
                    {(formData.adFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  {activeTab === 'banner' && formData.adFile.type.startsWith('image/') && (
                    <div style={{ marginTop: '12px' }}>
                      <img
                        src={URL.createObjectURL(formData.adFile)}
                        alt="Preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          borderRadius: '8px',
                          border: '2px solid #a26aa1'
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div style={{
                textAlign: 'center',
                marginTop: '1rem',
                color: '#6b3d6b',
                fontWeight: '600'
              }}>
                Uploading... Please wait.
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-button"
              disabled={!isArtist || uploading || !formData.adFile}
            >
              {uploading ? 'Uploading...' : 'Upload Ad'}
            </button>
          </form>

          <div className="decoration">
            <img src={cat_left} alt="Cat Left" className="cat-icon left" />
            <img src={cat_right} alt="Cat Right" className="cat-icon right" />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default BuyAds;
