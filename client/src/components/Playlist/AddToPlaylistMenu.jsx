import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL } from "../../config/api";
import { getUser } from "../../lib/userStorage";
import { Link } from "react-router-dom";
import "./AddToPlaylistMenu.css";

export default function AddToPlaylistMenu({ songId, songTitle, onAdded, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchedFor, setFetchedFor] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [buttonPos, setButtonPos] = useState({ left: 0, top: 0 });

  const btnRef = useRef();
  const menuRef = useRef();

  // click outside closes
  useEffect(() => {
    function handle(e) {
      if (
        isOpen &&
        btnRef.current &&
        !btnRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }
  }, [isOpen]);

  // update popup portal position to be under the plus button
  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setButtonPos({
        left: rect.left,
        top: rect.bottom + window.scrollY
      });
    }
  }, [isOpen]);

  async function fetchPlaylists() {
    setLoading(true);
    const u = getUser();
    const listenerId = u?.listenerId ?? u?.ListenerID ?? null;
    if (!listenerId) {
      setPlaylists([]);
      setFetchedFor(null);
      setLoading(false);
      return;
    }
    const url = `${API_BASE_URL}/listeners/${listenerId}/playlists`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        setPlaylists([]);
        setFetchedFor(listenerId);
        return;
      }
      const data = await res.json();
      setPlaylists(Array.isArray(data) ? data : []);
      setFetchedFor(listenerId);
      // fallback for dev dbs
      if (listenerId && (!Array.isArray(data) || data.length === 0)) {
        try {
          const fb = await fetch(
            `${API_BASE_URL}/playlists?listenerId=${encodeURIComponent(listenerId)}`
          );
          if (fb.ok) {
            const db = await fb.json();
            if (Array.isArray(db) && db.length > 0) setPlaylists(db);
          }
        } catch {}
      }
    } catch {
      setPlaylists([]);
      setFetchedFor(listenerId);
    } finally {
      setLoading(false);
    }
  }

  function toggleMenu(e) {
    e.stopPropagation();
    if (!isOpen) fetchPlaylists();
    setIsOpen((v) => !v);
  }

  // add song to selected playlist
  async function addSongToPlaylist(playlistId, playlistName) {
    try {
      const res = await fetch(`${API_BASE_URL}/playlist_tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ PlaylistID: playlistId, SongID: songId }),
      });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (res.status === 201) {
        setConfirmation(`"${songTitle}" has been added to your playlist "${playlistName}".`);
        setTimeout(() => {
          setIsOpen(false);
          setConfirmation(null);
        }, 1700);
        onAdded?.();
        return;
      }
      if (res.status === 409) {
        setConfirmation(`Song is already in "${playlistName}".`);
        setTimeout(() => setConfirmation(null), 1700);
        return;
      }
      setConfirmation(`Failed to add song (status ${res.status}).`);
      setTimeout(() => setConfirmation(null), 1700);
    } catch {
      setConfirmation("Failed to add song. See console for details.");
      setTimeout(() => setConfirmation(null), 1700);
    }
  }

  // renders the popup using a portal at body with correct positioning
  const popup = isOpen
    ? createPortal(
        <div
          ref={menuRef}
          className="addToPlaylistPopup-menu"
          style={{
            position: "absolute",
            left: buttonPos.left,
            top: buttonPos.top,
            zIndex: 9999,
            width: "260px",
            maxWidth: "95vw"
          }}
        >
          <div className="addToPlaylistPopup__title">Add to playlist</div>
          {confirmation ? (
            <div className="addToPlaylistPopup__confirmation">{confirmation}</div>
          ) : loading ? (
            <div
              className="addToPlaylistPopup__loading"
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                color: "#8c5d6d"
              }}
            >
              Loading...
            </div>
          ) : playlists.length > 0 ? (
            playlists.map((pl) => (
              <button
                key={pl.PlaylistID}
                className="addToPlaylistPopup__playlistBtn"
                onClick={() => addSongToPlaylist(pl.PlaylistID, pl.Name)}
              >
                {pl.Name}
              </button>
            ))
          ) : (
            <div className="addToPlaylistPopup__noPlaylists">
              <p className="addToPlaylistPopup__emptyTxt">You have no playlists yet.</p>
              <Link to="/me/playlists" className="addToPlaylistPopup__create">
                Create one
              </Link>
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="addToPlaylistMenu-root">
      <button
        type="button"
        ref={btnRef}
        onClick={toggleMenu}
        className={`addToPlaylistBtn addToPlaylistBtn--icon${compact ? " addToPlaylistBtn--compact" : ""}`}
        title="Add to playlist"
        aria-haspopup="true"
        aria-expanded={isOpen}
        tabIndex={0}
      >
        +
      </button>
      {popup}
    </div>
  );
}
