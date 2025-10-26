import React from 'react';
import PageLayout from "../components/PageLayout/PageLayout";
import './EditProfile.css';

const EditProfile = () => {
  return (
    <PageLayout>
      <div className="edit-profile-container">
        <h1 className="edit-profile-title">Edit Profile</h1>

        <form className="edit-profile-form">
          <div className="input-row">
            <div className="input-group">
              <label>First name:</label>
              <input type="text" name="firstName" placeholder="Enter first name" />
            </div>
            <div className="input-group">
              <label>Last name:</label>
              <input type="text" name="lastName" placeholder="Enter last name" />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Major:</label>
              <input type="text" name="major" placeholder="Enter major" />
            </div>
            <div className="input-group">
              <label>Minor (optional):</label>
              <input type="text" name="minor" placeholder="Enter minor" />
            </div>
          </div>

          <button type="button" className="update-image-btn">Update Image</button>

          <div className="input-group bio-group">
            <label>Bio:</label>
            <textarea name="bio" placeholder="Tell us about yourself"></textarea>
          </div>

          <div className="edit-profile-buttons">
            <button type="button" className="cancel-btn">Cancel</button>
            <button type="submit" className="save-changes-btn">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default EditProfile;