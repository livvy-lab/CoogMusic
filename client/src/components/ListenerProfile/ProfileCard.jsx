import { useEffect, useState } from "react";
import "./ProfileCard.css";

export default function ProfileCard({ listenerId, username }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If no listenerId was passed in, try from localStorage
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    const id = listenerId || stored?.listenerId;
    if (!id) {
      setError("No listener ID found");
      return;
    }

    console.log("[ProfileCard] fetching profile for listener:", id);

    const fetchProfile = async () => {
      try {
        const response = await fetch(`http://localhost:3001/listeners/${id}/profile`);
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status} ${errText}`);
        }
        const data = await response.json();
        console.log("[ProfileCard] loaded:", data);
        setProfile(data);
      } catch (err) {
        console.error("[ProfileCard] fetch error", err);
        setError(err.message);
      }
    };

    fetchProfile();
  }, [listenerId]);

  if (error) {
    return (
      <section className="pc">
        <p style={{ color: "red" }}>Error loading profile: {error}</p>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="pc">
        <p>Loading profile...</p>
      </section>
    );
  }

  const { listener, counts } = profile;

  return (
    <section className="pc">
      <div className="pc__avatarWrap">
        {listener.PFP ? (
          <img
            src={listener.PFP}
            alt={`${listener.FirstName}'s profile`}
            className="pc__avatarImg"
          />
        ) : (
          <div className="pc__avatarPlaceholder"></div>
        )}
      </div>

      <div className="pc__details">
        <h2 className="pc__heading">
          About {listener.FirstName} {listener.LastName}
        </h2>
        <div className="pc__meta">
          <span>Major: {listener.Major || "N/A"}</span>
          <span>Minor: {listener.Minor || "N/A"}</span>
        </div>
        <p className="pc__bio">{listener.Bio || "No bio yet."}</p>

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
