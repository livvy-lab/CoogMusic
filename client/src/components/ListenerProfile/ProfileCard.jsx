import React, { useEffect, useState } from "react";
import "./ProfileCard.css";

export default function ProfileCard() {
  const [listenerId, setListenerId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load listenerId from localStorage once on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      if (stored?.listenerId) {
        setListenerId(stored.listenerId);
      } else {
        setError("No listener ID found. Please log in again.");
        setLoading(false);
      }
    } catch (e) {
      console.error("Failed to read localStorage:", e);
      setError("Error loading user data");
      setLoading(false);
    }
  }, []);

  // Fetch profile data when listenerId is available
  useEffect(() => {
    if (!listenerId) return;
    let cancel = false;

    (async () => {
      try {
        setLoading(true);
        const url = `http://localhost:3001/listeners/${listenerId}/profile`;
        console.log("[ProfileCard] fetching", url);

        const r = await fetch(url);
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(`HTTP ${r.status} ${txt}`);
        }

        const j = await r.json();
        if (!cancel) setData(j);
      } catch (e) {
        console.error("[ProfileCard] fetch error", e);
        if (!cancel) setError(e.message || "Failed to fetch profile");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [listenerId]);

  // Conditional renders
  if (loading) return <section className="pc">Loading…</section>;
  if (error || !data) return <section className="pc">Error: {error || "No data"}</section>;

  const { listener, counts } = data;

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
          <button>{counts.playlists} playlists</button>
        </div>
      </div>

      <div className="pc__songs">🎵 {counts.songs} songs</div>
    </section>
  );
}
