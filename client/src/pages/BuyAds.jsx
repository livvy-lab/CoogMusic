import React, { useState, useMemo } from 'react';
import './BuyAds.css';
import PageLayout from '../components/PageLayout/PageLayout';
import cat_left from '../assets/left_cat.svg';
import cat_right from '../assets/right_cat.svg';
import { getUser } from '../lib/userStorage';

const BuyAds = () => {
  const [formData, setFormData] = useState({
    adTitle: '',
    adDescription: '',
    adFile: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleFileUpload = (e) => {
    setFormData(prevState => ({
      ...prevState,
      adFile: e.target.files[0]
    }));
  };

  const user = useMemo(() => getUser(), []);

  const isArtist = (user?.accountType || '').toLowerCase() === 'artist';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isArtist) {
      alert('Only artist accounts can upload ads.');
      return;
    }
    if (!formData.adFile) {
      alert('Please select a file to upload.');
      return;
    }

    try {
      const fd = new FormData();
      fd.append('adFile', formData.adFile);
      if (formData.adTitle) fd.append('adTitle', formData.adTitle);
      if (formData.adDescription) fd.append('adDescription', formData.adDescription);
      if (user?.accountId) fd.append('accountId', String(user.accountId));

      const res = await fetch('http://localhost:3001/upload/ad', {
        method: 'POST',
        body: fd
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Upload failed');
      }

      const data = await res.json();
      console.log('Ad uploaded to S3:', data);
      alert('Ad uploaded successfully!');
      // Optionally clear form after success
      setFormData({ adTitle: '', adDescription: '', adFile: null });
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Upload error: ${err.message}`);
    }
  };

  return (
    <PageLayout>
      <div className="buyads-container">
        <div className="buyads-header">
          <h1>Advertise with Coogs Music</h1>
          <p>Connect with listeners at UH and promote your music directly to music lovers.</p>
        </div>

        <div className="buyads-form-container">
          {!isArtist && (
            <div className="error-message" style={{ marginBottom: 16 }}>
              This feature is available to artist accounts only. Please log in as an artist.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            {/* Ad Title - full width on top */}
            <div className="form-group artist-id-group">
              <input
                type="text"
                name="adTitle"
                placeholder="Ad Title"
                value={formData.adTitle}
                onChange={handleInputChange}
                className="artist-id-input"
                disabled={!isArtist}
              />
            </div>

            {/* Upload - full width */}
            <div className="form-group upload-group">
              <div className="upload-button">
                <label htmlFor="adFile">Upload Ad File</label>
                <input
                  type="file"
                  id="adFile"
                  name="adFile"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={!isArtist}
                />
              </div>
              {formData.adFile && <span className="file-name">{formData.adFile.name}</span>}
            </div>

            {/* Ad Description */}
            <div className="form-group message-group">
              <textarea
                name="adDescription"
                placeholder="Ad Description"
                value={formData.adDescription}
                onChange={handleInputChange}
                disabled={!isArtist}
              />
            </div>

            {/* Centered smaller submit button */}
            <button type="submit" className="submit-button" disabled={!isArtist}>Submit</button>
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