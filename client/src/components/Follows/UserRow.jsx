import React from 'react';
import './Follows.css';

// displays a single user row
export default function UserRow({ user, isFollowing }) {
  
  // use a placeholder if the avatar URL is broken
  const avatar = user.avatarUrl || 'https://via.placeholder.com/75';

  return (
    // main container for the user row
    <div className="user-row" style={{ background: isFollowing ? '#8E3F65' : '#895674' }}>
      
      {/* left side: avatar and user details */}
      <div className="user-info">
        <img src={avatar} alt={`${user.name}'s avatar`} className="user-avatar" />
        <div className="user-details">
          <span className="user-name">{user.name}</span>
          <span className="user-username">@{user.username}</span>
        </div>
      </div>
      
      {/* right side: follow/following button */}
      {isFollowing ? (
        <button className="following-btn">
          Following ✓
        </button>
      ) : (
        <button className="follow-btn">
          Follow +
        </button>
      )}
    </div>
  );
}