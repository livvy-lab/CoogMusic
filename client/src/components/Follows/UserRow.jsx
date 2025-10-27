import React from "react";
import "./Follows.css";

export default function UserRow({ user, isFollowing, onFollow, onUnfollow }) {
  const avatar = user.avatarUrl || "https://via.placeholder.com/75";
  return (
    <div className="user-row" style={{ background: isFollowing ? "#8E3F65" : "#895674" }}>
      <div className="user-info">
        <img src={avatar} alt={user.name + "'s avatar"} className="user-avatar" />
        <div className="user-details">
          <span className="user-name">{user.name}</span>
          <span className="user-username">{user.username}</span>
        </div>
      </div>
      <div>
        {isFollowing ? (
          <button className="following-btn" onClick={onUnfollow}>Following</button>
        ) : (
          <button className="follow-btn" onClick={onFollow}>Follow</button>
        )}
      </div>
    </div>
  );
}
