// src/components/listenerprofile/ListenerProfile.jsx
import { useState, useEffect } from "react";

export default function ListenerProfile() {
  // temporary placeholder data for design
  const mockListener = {
    FirstName: "Olivia",
    LastName: "Wright",
    Major: "Computer Science",
    Minor: "Design",
    Bio: "I love discovering new artists and making playlists.",
    Banner: "/images/banner-temp.jpg",
    PFP: "/images/pfp-temp.jpg",
    playlists: [
      { id: 1, name: "Morning Vibes" },
      { id: 2, name: "Late Night Coding" },
    ],
    follows: [
      { id: 5, name: "Doja Cat" },
      { id: 6, name: "Kendrick Lamar" },
    ],
  };

  const [listener, setListener] = useState(mockListener);

  return (
    <div className="listener-profile">
      <div className="banner">
        <img src={listener.Banner} alt="Banner" />
      </div>
      <div className="profile-info">
        <img src={listener.PFP} alt="Profile" className="profile-pic" />
        <h1>
          {listener.FirstName} {listener.LastName}
        </h1>
        <p>{listener.Bio}</p>
        <p>
          <strong>Major:</strong> {listener.Major}
        </p>
        <p>
          <strong>Minor:</strong> {listener.Minor}
        </p>

        <h3>Playlists</h3>
        <ul>
          {listener.playlists.map((pl) => (
            <li key={pl.id}>{pl.name}</li>
          ))}
        </ul>

        <h3>Following</h3>
        <ul>
          {listener.follows.map((artist) => (
            <li key={artist.id}>{artist.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
