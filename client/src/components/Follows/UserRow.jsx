import React from "react";
import { useNavigate } from "react-router-dom";
import "./Follows.css";

export default function UserRow({
  user,
  isFollowing,
  onFollow,
  onUnfollow,
  currentUserId,
  currentUserType,
}) {
  const avatar = user.avatarUrl || "https://via.placeholder.com/75";
  const navigate = useNavigate();

  // Row click (except button) goes to profile
  const handleRowClick = (e) => {
    if (e.target.tagName === "BUTTON") return;
    if (user.type === "Listener") navigate(`/listeners/${user.id}`);
    else if (user.type === "Artist") navigate(`/artist/${user.id}`);
  };

  const isOwnProfile =
    String(user.id) === String(currentUserId) && user.type === currentUserType;

  const isArtist = currentUserType === "Artist";

  return (
    <div
      className="user-row"
      style={{
        background: isFollowing ? "#8E3F65" : "#895674",
        cursor: "pointer",
      }}
      onClick={handleRowClick}
    >
      <div className="user-info">
        <img
          src={avatar}
          alt={user.name + "'s avatar"}
          className="user-avatar"
        />
        <div className="user-details">
          <span className="user-name">{user.name}</span>
          <span className="user-username">{user.username}</span>
        </div>
      </div>
      <div>
        
        {!isArtist && !isOwnProfile && (
          isFollowing ? (
            <button className="following-btn" onClick={onUnfollow}>
              Following
            </button>
          ) : (
            <button className="follow-btn" onClick={onFollow}>
              Follow
            </button>
          )
        )}

      </div>
    </div>
  );
}