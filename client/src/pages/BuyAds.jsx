import React, { useState } from 'react';
import './BuyAds.css';
import PageLayout from '../components/PageLayout/PageLayout';

const BuyAds = () => {
  const [formData, setFormData] = useState({
    artistId: '',
    email: '',
    message: '',
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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
  };

  return (
    <PageLayout>
      <div className="buyads-container">
        <div className="buyads-header">
          <h1>Advertise with Coogs Music</h1>
          <p>Connect with listeners at UH and promote your music directly to music lovers.</p>
        </div>

        <div className="buyads-form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                name="artistId"
                placeholder="Artist ID"
                value={formData.artistId}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group upload-group">
              <div className="upload-button">
                <label htmlFor="adFile">Upload Ad File</label>
                <input
                  type="file"
                  id="adFile"
                  name="adFile"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
              {formData.adFile && <span className="file-name">{formData.adFile.name}</span>}
            </div>

            <div className="form-group">
              <textarea
                name="message"
                placeholder="Message"
                value={formData.message}
                onChange={handleInputChange}
              />
            </div>

            <button type="submit" className="submit-button">Submit</button>
          </form>

          <div className="decoration">
            <div className="cat-icon left">😺</div>
            <div className="cat-icon right">😺</div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default BuyAds;