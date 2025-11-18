import React, { useState, useMemo } from 'react';
import './BuyAds.css';
import PageLayout from '../components/PageLayout/PageLayout';
import cat_left from '../assets/left_cat.svg';
import cat_right from '../assets/right_cat.svg';
import { getUser } from '../lib/userStorage';
import { API_BASE_URL } from "../config/api";
import { showToast } from '../lib/toast';

const BuyAds = () => {
  const [activeTab, setActiveTab] = useState('banner'); // 'banner' or 'audio'
  const [formData, setFormData] = useState({
    adTitle: '',
    adDescription: '',
    adFile: null
  });
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;

    // Validate based on active tab
    if (activeTab === 'banner') {
      // Validate image file
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (PNG, JPG, GIF, etc.)', 'error');
        e.target.value = '';
        return;
      }
      // Max 5MB for images
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image file size must be less than 5MB', 'error');
        e.target.value = '';
        return;
      }
    } else {
      // Validate audio file
      if (!file.type.startsWith('audio/')) {
        showToast('Please upload an audio file (MP3, WAV, etc.)', 'error');
        e.target.value = '';
        return;
      }
      // Max 10MB for audio
      if (file.size > 10 * 1024 * 1024) {
        showToast('Audio file size must be less than 10MB', 'error');
        e.target.value = '';
        return;
      }
    }
    
    setFormData(prevState => ({
      ...prevState,
      adFile: file
    }));
  };

  const user = useMemo(() => getUser(), []);
  const isArtist = (user?.accountType || '').toLowerCase() === 'artist';

  const handleTabChange = (tab) => {
    // Clear file when switching tabs
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
      fd.append('adType', activeTab); // 'banner' or 'audio'
      
      if (formData.adDescription) {
        fd.append('adDescription', formData.adDescription.trim());
      }
      
      // Get artistId from user object
      const artistId = user?.artistId || user?.ArtistID;
      if (artistId) {
        fd.append('artistId', String(artistId));
      } else {
        throw new Error('Artist ID not found. Please log in again.');
      }

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
        showToast(`${activeTab === 'banner' ? 'Banner' : 'Audio'} ad uploaded successfully!`, 'success');
        
        // Clear form
        setFormData({ adTitle: '', adDescription: '', adFile: null });
        
        // Reset file input
        const fileInput = document.getElementById('adFile');
        if (fileInput) fileInput.value = '';
        
        // Redirect to My Ads page
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
              textAlign: 'center'
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
              Ad Banner
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => handleTabChange('audio')}
              disabled={!isArtist || uploading}
            >
              Audio Ad
            </button>
          </div>

          {/* Tab Description */}
          <div className="tab-description">
            {activeTab === 'banner' ? (
              <p>
                <strong>Banner Ads</strong> appear on the home page and playlists. 
                Upload a visually appealing image (PNG, JPG) up to 5MB. 
                Recommended size: 1200x400px.
              </p>
            ) : (
              <p>
                <strong>Audio Ads</strong> play between songs for non-subscribers. 
                Upload an audio file (MP3, WAV) up to 10MB. 
                Recommended length: 15-30 seconds.
              </p>
            )}
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Ad Title */}
            <div className="form-group artist-id-group">
              <input
                type="text"
                name="adTitle"
                placeholder={`Ad Title (e.g., '${activeTab === 'banner' ? 'New Album Cover' : 'New Album Out Now!'}')`}
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
                    ? `Change ${activeTab === 'banner' ? 'Image' : 'Audio'} File` 
                    : `Upload ${activeTab === 'banner' ? 'Image (PNG, JPG)' : 'Audio (MP3, WAV)'}`
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

            {/* Ad Description */}
            <div className="form-group message-group">
              <textarea
                name="adDescription"
                placeholder="Ad Description (optional - for internal use)"
                value={formData.adDescription}
                onChange={handleInputChange}
                disabled={!isArtist || uploading}
                maxLength="500"
              />
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div style={{ textAlign: 'center', marginTop: '1rem', color: '#6b3d6b' }}>
                Uploading... Please wait.
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="submit-button" 
              disabled={!isArtist || uploading || !formData.adFile}
            >
              {uploading ? 'Uploading...' : `Upload ${activeTab === 'banner' ? 'Banner' : 'Audio'} Ad`}
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
