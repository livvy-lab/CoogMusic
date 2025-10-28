import React, { useState, useEffect } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import UserRow from "./UserRow";
import "./Follows.css";
import { getUser } from "../../lib/userStorage";

export default function FollowTabs() {
  const { id: viewedUserIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "followers";

  const loggedInUser = getUser();
  const isViewingOtherListener = Boolean(viewedUserIdParam);
  const viewedUserId = isViewingOtherListener
    ? viewedUserIdParam
    : loggedInUser.listenerId || loggedInUser.artistId || loggedInUser.accountId;
  const viewedUserType = isViewingOtherListener
    ? "Listener"
    : loggedInUser.accountType === "listener"
    ? "Listener"
    : "Artist";

  // Hide follow button for logged in user
  const currentUserId = loggedInUser.listenerId || loggedInUser.artistId || loggedInUser.accountId;
  const currentUserType = loggedInUser.accountType === "listener" ? "Listener" : "Artist";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [search, setSearch] = useState("");

  // Refetch lists for profile being viewed
  const refetchData = async () => {
    const followersRes = await fetch(
      `http://localhost:3001/follows?userId=${viewedUserId}&userType=${viewedUserType}&tab=followers`
    );
    setFollowers(await followersRes.json());
    const followingRes = await fetch(
      `http://localhost:3001/follows?userId=${viewedUserId}&userType=${viewedUserType}&tab=following`
    );
    setFollowing(await followingRes.json());
  };

  useEffect(() => {
    refetchData();
  }, [viewedUserId, viewedUserType]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleFollow = async (targetUser) => {
    await fetch("http://localhost:3001/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        FollowerID: currentUserId,
        FollowerType: currentUserType,
        FollowingID: targetUser.id,
        FollowingType: targetUser.type,
      }),
    });
    await refetchData();
  };

  const handleUnfollow = async (targetUser) => {
    await fetch("http://localhost:3001/follows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        FollowerID: currentUserId,
        FollowerType: currentUserType,
        FollowingID: targetUser.id,
        FollowingType: targetUser.type,
      }),
    });
    await refetchData();
  };

  // Display list (followers or following) for the user being viewed
  const listToDisplay = activeTab === "followers" ? followers : following;

  return (
    <div className="follow-container">
      <div className="tabs">
        <button
          className={activeTab === "followers" ? "active" : ""}
          onClick={() => setActiveTab("followers")}
        >
          Followers
        </button>
        <button
          className={activeTab === "following" ? "active" : ""}
          onClick={() => setActiveTab("following")}
        >
          Following
        </button>
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
              isFollowing={
                // check if the logged in user is following this user
                following.some(
                  (f) => f.id === user.id && f.type === user.type
                )
              }
              onFollow={() => handleFollow(user)}
              onUnfollow={() => handleUnfollow(user)}
              currentUserId={currentUserId}
              currentUserType={currentUserType}
            />
          ))}
      </div>
    </div>
  );
}