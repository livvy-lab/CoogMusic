import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../../lib/userStorage";
import "./ProfileCard.css";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

export default function ProfileCard({ listenerId: propListenerId = null, publicView = false }) {
  const navigate = useNavigate();

  const [listenerId, setListenerId] = useState(null);
  const [data, setData] = useState(null);
  const [publicCount, setPublicCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countLoading, setCountLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pfpUrl, setPfpUrl] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);

  // Get current user info
  const currentUser = getUser();
  const currentUserType = currentUser?.accountType?.toLowerCase() || "";
  const currentUserId = currentUser?.listenerId || currentUser?.artistId || currentUser?.accountId;
  const isOwnProfile = Number(currentUserId) === Number(listenerId);

  // read listenerId (+ cached pfp if present)
  useEffect(() => {
    if (propListenerId != null) {
      setListenerId(propListenerId);
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        if (stored?.listenerId && stored.listenerId === propListenerId && stored?.pfpUrl) {
          setPfpUrl(stored.pfpUrl);
        }
      } catch {}
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      if (stored?.listenerId) {
        setListenerId(stored.listenerId);
        if (stored?.pfpUrl) setPfpUrl(stored.pfpUrl);
      } else {
        setError("No listener ID found. Please log in again.");
        setLoading(false);
        setCountLoading(false);
      }
    } catch (e) {
      console.error("Failed to read localStorage:", e);
      setError("Error loading user data");
      setLoading(false);
      setCountLoading(false);
    }
  }, [propListenerId]);

  // fetch profile (names, counts, legacy PFP)
  useEffect(() => {
    if (!listenerId) return;
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_BASE}/listeners/${listenerId}/profile`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancel) {
          setData(j);
          const legacy = j?.listener?.PFP;
          if (legacy && !pfpUrl) setPfpUrl(legacy);
        }
      } catch (e) {
        console.error("[ProfileCard] fetch error", e);
        if (!cancel) setError(e.message || "Failed to fetch profile");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenerId]);

  // fetch canonical PFP from /pfp (Media join → S3), override cache/legacy
  useEffect(() => {
    if (!listenerId) return;
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/pfp/listener/${listenerId}`);
        if (!r.ok) return;
        const j = await r.json();
        const url = j?.url || "";
        if (!cancel && url) {
          setPfpUrl(url);
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...stored, pfpUrl: url }));
        }
      } catch {}
    })();
    return () => { cancel = true; };
  }, [listenerId]);

  // public playlist count (unchanged)
  useEffect(() => {
    if (!listenerId) return;
    let cancel = false;
    (async () => {
      try {
        setCountLoading(true);
        const res = await fetch(`${API_BASE}/playlists?listenerId=${listenerId}`);
        if (!res.ok) throw new Error("count fetch failed");
        const arr = await res.json();
        const count = Array.isArray(arr)
          ? arr.filter((p) => Number(p.IsPublic) === 1 && Number(p.IsDeleted) !== 1).length
          : 0;
        if (!cancel) setPublicCount(count);
      } catch (e) {
        console.warn("Public playlist count fetch failed:", e);
        if (!cancel) setPublicCount(0);
      } finally {
        if (!cancel) setCountLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [listenerId]);

  // Check follow status, whenever user or profile changes or after toggle
  const checkFollowStatus = async () => {
    if (!listenerId || !currentUserId || isOwnProfile) {
      setIsFollowing(false);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/follows/relationship?followerId=${currentUserId}&followerType=${currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1)}&followingId=${listenerId}&followingType=Listener`
      );
      if (!res.ok) {
        setIsFollowing(false);
        return;
      }
      const isFollow = await res.json();
      setIsFollowing(Boolean(isFollow?.isFollowing || isFollow?.following));
    } catch {
      setIsFollowing(false);
    }
  };

  useEffect(() => {
    checkFollowStatus();
  }, [listenerId, currentUserId, currentUserType, isOwnProfile]);

  if (loading) return <section className="pc">Loading…</section>;
  if (error || !data) return <section className="pc">Error: {error || "No data"}</section>;

  const { listener, counts } = data;
  const playlistsPublic = publicCount ?? counts?.playlists ?? 0;

  // Handler for Follow/Unfollow button
  const handleFollowToggle = async () => {
    if (isFollowing) {
      // Unfollow
      try {
        await fetch(`${API_BASE}/follows`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            FollowerID: currentUserId,
            FollowerType: currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1),
            FollowingID: listenerId,
            FollowingType: "Listener"
          }),
        });
        await checkFollowStatus();
      } catch (e) {
        
      }
    } else {
      // Follow
      try {
        await fetch(`${API_BASE}/follows`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            FollowerID: currentUserId,
            FollowerType: currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1),
            FollowingID: listenerId,
            FollowingType: "Listener"
          }),
        });
        await checkFollowStatus();
      } catch (e) {
        
      }
    }
  };

  return (
    <section className="pc">
      <div className="pc__avatarWrap">
        {pfpUrl ? (
          <img className="pc__avatarImg" src={pfpUrl} alt="Profile" />
        ) : (
          <div className="pc__avatarPlaceholder" />
        )}
      </div>
      <div className="pc__details">
        <div className="pc__headingRow">
          <h2 className="pc__heading">
            About {listener.FirstName} {listener.LastName}
          </h2>
          {
            !isOwnProfile && (
              <button
                className={`pc__followBtn${isFollowing ? " following" : ""}`}
                onClick={handleFollowToggle}
                style={{ marginLeft: 18 }}
              >
                {isFollowing ? "Following" : "+ Follow"}
              </button>
            )
          }
        </div>
        <div className="pc__meta">
          <span>Major: {listener.Major || "—"}</span>
          <span>Minor: {listener.Minor || "—"}</span>
        </div>
        <p className="pc__bio">{listener.Bio || "No bio available."}</p>
        <div className="pc__stats">
          <button
            onClick={() => navigate("/follows?tab=followers")}
            aria-label="View followers"
            title="View followers"
          >
            {counts.followers} followers
          </button>
          <button
            onClick={() => navigate("/follows?tab=following")}
            aria-label="View following"
            title="View following"
          >
            {counts.following} following
          </button>
          <button
            onClick={() => navigate(`/listeners/${listenerId}/playlists`)}
            aria-label="View public playlists"
            title="View public playlists"
          >
            {countLoading ? "…" : playlistsPublic} playlists
          </button>
        </div>
      </div>

      <div className="pc__songs">🎵 {counts.songs} songs</div>
    </section>
  );
}
