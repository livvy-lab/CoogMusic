import React, { useState, useEffect } from 'react';
import UserRow from './UserRow';
import './Follows.css';

// mock data for development. replace later
const mockFollowers = [
  { id: 1, name: 'Cool Girl', username: 'Coolgirl', avatarUrl: 'https://via.placeholder.com/75' },
  { id: 3, name: 'Best Artist', username: 'thebest', avatarUrl: 'https://via.placeholder.com/75' },
];
const mockFollowing = [
  { id: 2, name: 'Normal Girl', username: 'Normal', avatarUrl: 'https://via.placeholder.com/75' },
];

export default function FollowTabs() {
  // tracks the active tab: 'followers' or 'following'
  const [activeTab, setActiveTab] = useState('followers');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  // load initial data when the component first mounts
  useEffect(() => {
    // mock data -> real API call
    setFollowers(mockFollowers);
    setFollowing(mockFollowing);
  }, []);

  // selects which list to display based on the active tab
  const listToDisplay = activeTab === 'followers' ? followers : following;

  return (
    <div className="follow-container">
      {/* tabs */}
      <div className="tabs">
        <button
          className={activeTab === 'followers' ? 'active' : ''}
          onClick={() => setActiveTab('followers')}
        >
          Followers
        </button>
        <button
          className={activeTab === 'following' ? 'active' : ''}
          onClick={() => setActiveTab('following')}
        >
          Following
        </button>
      </div>

      {/* search bar */}
      <div className="search-bar-container">
        <input type="text" placeholder="Search" className="follow-search" />
      </div>

      {/* user list */}
      <div className="user-list">
        {listToDisplay.map(user => (
          <UserRow 
            key={user.id} 
            user={user} 
            isFollowing={activeTab === 'following'} 
          />
        ))}
      </div>
    </div>
  );
}