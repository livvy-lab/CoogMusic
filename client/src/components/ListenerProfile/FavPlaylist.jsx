import { useEffect, useState } from "react";
import "./FavPlaylist.css";
import { API_BASE_URL } from "../../config/api";

export default function FavPlaylist({ listenerId }) {
  const [playlist, setPlaylist] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    const id = listenerId || stored?.listenerId;
    if (!id) {
      setError("No listener ID found");
      setLoading(false);
      return;
    }

    const fetchPlaylist = async () => {
      try {
  const res = await fetch(`${API_BASE_URL}/listeners/${id}/profile`);
        if (!res.ok) {
          const errTxt = await res.text();
          throw new Error(`HTTP ${res.status} ${errTxt}`);
        }

        const data = await res.json();
        console.log("[FavPlaylist] pinned playlist:", data.favorites?.pinnedPlaylist);
        setPlaylist(data.favorites?.pinnedPlaylist || null);
      } catch (err) {
        console.error("[FavPlaylist] fetch error", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [listenerId]);

  if (loading) {
    return (
      <section className="playlistSection">
        <h2 className="playlistSection__title">Go-to Playlist</h2>
        <p>Loading playlist...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="playlistSection">
        <h2 className="playlistSection__title">Go-to Playlist</h2>
        <p style={{ color: "red" }}>Error loading playlist: {error}</p>
      </section>
    );
  }

  // 🟣 Case 1: No pinned playlist
  if (!playlist) {
    return (
      <section className="playlistSection">
        <h2 className="playlistSection__title">Go-to Playlist</h2>
        <div className="playlistCard playlistCard--empty">
          <div className="playlistCard__body">
            <div className="playlistCard__placeholder" aria-hidden="true" />
            <div className="playlistCard__text">
              <h3 className="playlistCard__title">None pinned yet</h3>
              <p className="playlistCard__desc">
                Pin a playlist from your library to show it here!
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 🟢 Case 2: Playlist exists
  return (
    <section className="playlistSection">
      <h2 className="playlistSection__title">Go-to Playlist</h2>

      <div className="playlistCard">
        <div className="playlistCard__body">
          {playlist.CoverURL ? (
            <img
              className="playlistCard__image"
              src={playlist.CoverURL}
              alt={`${playlist.Name} cover`}
            />
          ) : (
            <div className="playlistCard__placeholder" aria-hidden="true" />
          )}

          <div className="playlistCard__text">
            <h3 className="playlistCard__title">
              <a
                className="playlistCard__titleLink"
                href={playlist.PlaylistURL || "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                {playlist.Name || "Untitled Playlist"}
              </a>
            </h3>

            <p className="playlistCard__desc">
              {playlist.Description || "No description available."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
