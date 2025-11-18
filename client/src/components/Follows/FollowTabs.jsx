import React, { useState, useEffect } from "react";
import { useSearchParams, useParams, useLocation } from "react-router-dom";
import UserRow from "./UserRow";
import "./Follows.css";
import { getUser } from "../../lib/userStorage";
import { API_BASE_URL } from "../../config/api";
import { showToast } from '../../lib/toast';

export default function FollowTabs() {
  const { id: viewedUserIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation(); // Added to check URL path
  
  const initialTab = searchParams.get("tab") || "followers";
  const loggedInUser = getUser();
  
  const isViewingOtherListener = Boolean(viewedUserIdParam);
  
  // Determine if we are on an Artist route (e.g. /artists/1/follows)
  const isArtistRoute = location.pathname.includes("/artists/");

  const viewedUserId = isViewingOtherListener
    ? viewedUserIdParam
    : loggedInUser.listenerId || loggedInUser.artistId || loggedInUser.accountId;

  // FIX: Dynamically determine type based on URL route
  const viewedUserType = isViewingOtherListener
    ? (isArtistRoute ? "Artist" : "Listener")
    : loggedInUser.accountType === "listener"
    ? "Listener"
    : "Artist";

  // Hide follow button for logged in user
  const currentUserId =
    loggedInUser.listenerId || loggedInUser.artistId || loggedInUser.accountId;
  const currentUserType =
    loggedInUser.accountType === "listener" ? "Listener" : "Artist";

  const isArtist = currentUserType === "Artist";
  // Check if viewing own profile (IDs match AND types match)
  const isViewingOwnProfile = 
    Number(viewedUserId) === Number(currentUserId) && viewedUserType === currentUserType;

  const [activeTab, setActiveTab] = useState(
    isArtist && isViewingOwnProfile ? "followers" : initialTab,
  );

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [myFollowing, setMyFollowing] = useState([]); // Track who the logged-in user follows
  const [search, setSearch] = useState("");

  // Refetch lists for profile being viewed
  const refetchData = async () => {
    if (!viewedUserId) return;

    try {
      const followersRes = await fetch(
        `${API_BASE_URL}/follows?userId=${viewedUserId}&userType=${viewedUserType}&tab=followers`,
      );
      if (followersRes.ok) setFollowers(await followersRes.json());

      // Only fetch 'following' if it's a Listener (Artists usually don't have a 'following' list in this context)
      // OR if we just want to be safe, we can try fetching it anyway, but the button is hidden below.
      if (viewedUserType === "Listener") {
        const followingRes = await fetch(
          `${API_BASE_URL}/follows?userId=${viewedUserId}&userType=${viewedUserType}&tab=following`,
        );
        if (followingRes.ok) setFollowing(await followingRes.json());
      } else {
        setFollowing([]); // Artists don't show following
      }

      if (!isArtist) {
        const myFollowingRes = await fetch(
          `${API_BASE_URL}/follows?userId=${currentUserId}&userType=${currentUserType}&tab=following`,
        );
        if (myFollowingRes.ok) setMyFollowing(await myFollowingRes.json());
      }
    } catch (e) {
      console.error("Failed to fetch follow data", e);
    }
  };

  useEffect(() => {
    refetchData();
  }, [viewedUserId, viewedUserType, isArtist, isViewingOwnProfile]);

  useEffect(() => {
    // If viewing an Artist (own or other), default to followers tab as they might not have 'following'
    if (viewedUserType === "Artist") {
      setActiveTab("followers");
    } else {
      setActiveTab(initialTab);
    }
  }, [initialTab, viewedUserType]);

  const handleFollow = async (targetUser) => {
    if (isArtist) return;
    try {
      const response = await fetch(`${API_BASE_URL}/follows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FollowerID: currentUserId,
          FollowerType: currentUserType,
          FollowingID: targetUser.id,
          FollowingType: targetUser.type,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Follow failed:", error);
        showToast(error.error || "Failed to follow user", 'error');
        return;
      }

      await refetchData();
    } catch (error) {
      console.error("Error following user:", error);
      showToast("Failed to follow user", 'error');
    }
  };

  const handleUnfollow = async (targetUser) => {
    if (isArtist) return;
    try {
      const response = await fetch(`${API_BASE_URL}/follows`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FollowerID: currentUserId,
          FollowerType: currentUserType,
          FollowingID: targetUser.id,
          FollowingType: targetUser.type,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Unfollow failed:", error);
        showToast(error.error || "Failed to unfollow user", 'error');
        return;
      }

      await refetchData();
    } catch (error) {
      console.error("Error unfollowing user:", error);
      showToast("Failed to unfollow user", 'error');
    }
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
        
        {/* Only show Following tab if the VIEWED user is a Listener */}
        {viewedUserType === "Listener" && (
          <button
            className={activeTab === "following" ? "active" : ""}
            onClick={() => setActiveTab("following")}
          >
            Following
          </button>
        )}

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
              (u.username &&
                u.username.toLowerCase().includes(search.toLowerCase())),
          )
          .map((user) => (
            <UserRow
              key={`${user.type}-${user.id}`}
              user={user}
              isFollowing={
                // check if the logged in user is following this user
                myFollowing.some(
                  (f) => f.id === user.id && f.type === user.type,
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