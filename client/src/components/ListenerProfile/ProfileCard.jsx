import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ProfileCard.css";

export default function ProfileCard() {
  const navigate = useNavigate();
  const [listenerId, setListenerId] = useState(null);
  const [data, setData] = useState(null);
  const [publicCount, setPublicCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countLoading, setCountLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      if (stored?.listenerId) setListenerId(stored.listenerId);
      else {
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
  }, []);

  useEffect(() => {
    if (!listenerId) return;
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`http://localhost:3001/listeners/${listenerId}/profile`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancel) setData(j);
      } catch (e) {
        console.error("[ProfileCard] fetch error", e);
        if (!cancel) setError(e.message || "Failed to fetch profile");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [listenerId]);

  useEffect(() => {
    if (!listenerId) return;
    let cancel = false;
    (async () => {
      try {
        setCountLoading(true);
        const res = await fetch(`http://localhost:3001/playlists?listenerId=${listenerId}`);
        if (!res.ok) throw new Error("count fetch failed");
        const arr = await res.json();
        const count = Array.isArray(arr)
          ? arr.filter(p => Number(p.IsPublic) === 1 && Number(p.IsDeleted) !== 1).length
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

  if (loading) return <section className="pc">Loading…</section>;
  if (error || !data) return <section className="pc">Error: {error || "No data"}</section>;

  const { listener, counts } = data;
  const playlistsPublic = publicCount ?? counts?.playlists ?? 0;

  return (
    <section className="pc">
      <div className="pc__avatarWrap">
        {listener.PFP ? (
          <img className="pc__avatarImg" src={listener.PFP} alt="Profile" />
        ) : (
          <div className="pc__avatarPlaceholder" />
        )}
      </div>

      <div className="pc__details">
        <h2 className="pc__heading">
          About {listener.FirstName} {listener.LastName}
        </h2>
        <div className="pc__meta">
          <span>Major: {listener.Major || "—"}</span>
          <span>Minor: {listener.Minor || "—"}</span>
        </div>
        <p className="pc__bio">{listener.Bio || "No bio available."}</p>

        <div className="pc__stats">
          <button>{counts.followers} followers</button>
          <button>{counts.following} following</button>
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
