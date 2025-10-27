import React, { useState, useEffect } from "react";
import UserRow from "./UserRow";
import "./Follows.css";
import { getUser } from "../../lib/userStorage";

export default function FollowTabs() {
  const user = getUser();
  const CURRENT_USER_ID = user.listenerId || user.artistId || user.accountId;
  const CURRENT_USER_TYPE = user.accountType === "listener" ? "Listener" : "Artist";

  const [activeTab, setActiveTab] = useState("followers");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [search, setSearch] = useState("");

  // refetch both lists to keep the UI in sync
  const refetchData = async () => {
    const followersRes = await fetch(`http://localhost:3001/follows?userId=${CURRENT_USER_ID}&userType=${CURRENT_USER_TYPE}&tab=followers`);
    setFollowers(await followersRes.json());
    const followingRes = await fetch(`http://localhost:3001/follows?userId=${CURRENT_USER_ID}&userType=${CURRENT_USER_TYPE}&tab=following`);
    setFollowing(await followingRes.json());
  };

  useEffect(() => {
    refetchData();
  }, [CURRENT_USER_ID, CURRENT_USER_TYPE]);

  const handleFollow = async (targetUser) => {
    await fetch("http://localhost:3001/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        FollowerID: CURRENT_USER_ID,
        FollowerType: CURRENT_USER_TYPE,
        FollowingID: targetUser.id,
        FollowingType: targetUser.type,
      }),
    });
    await refetchData(); // Refetch data to update the lists
  };

  const handleUnfollow = async (targetUser) => {
    await fetch("http://localhost:3001/follows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        FollowerID: CURRENT_USER_ID,
        FollowerType: CURRENT_USER_TYPE,
        FollowingID: targetUser.id,
        FollowingType: targetUser.type,
      }),
    });
    await refetchData(); // refetch data to update the lists
  };

  const listToDisplay = activeTab === "followers" ? followers : following;

  return (
    <div className="follow-container">
      <div className="tabs">
        <button className={activeTab === "followers" ? "active" : ""} onClick={() => setActiveTab("followers")}>Followers</button>
        <button className={activeTab === "following" ? "active" : ""} onClick={() => setActiveTab("following")}>Following</button>
      </div>
      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Search"
          className="follow-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="user-list">
        {listToDisplay
          .filter(
            (u) =>
              (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
              (u.username && u.username.toLowerCase().includes(search.toLowerCase()))
          )
          .map((user) => (
            <UserRow
              key={`${user.type}-${user.id}`}
              user={user}
              isFollowing={following.some(f => f.id === user.id && f.type === user.type)} // Added type check for accuracy
              onFollow={() => handleFollow(user)}
              onUnfollow={() => handleUnfollow(user)}
            />
          ))}
      </div>
    </div>
  );
}