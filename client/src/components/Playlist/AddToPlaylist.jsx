import React, { useEffect, useState, useRef } from "react";
import "./AddToPlaylist.css";
import { showToast } from '../../lib/toast';
import { showToast } from '../../lib/toast';

export default function AddToPlaylist({ songId }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const ref = useRef(null);

  const stored = localStorage.getItem("listener");
  const listenerId = stored ? JSON.parse(stored).ListenerID : null;

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  async function fetchPlaylists() {
    if (!listenerId) {
      setPlaylists([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3001/listeners/${listenerId}/playlists`
      );
      if (!res.ok) throw new Error("Failed to load playlists");
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      console.error(err);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }

  async function addTo(playlistId) {
    if (!playlistId || !songId) return;
    setAdding(true);
    try {
      const res = await fetch("http://localhost:3001/playlist_tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ PlaylistID: playlistId, SongID: songId }),
      });
      if (res.status === 201 || res.ok) {
        showToast("Added to playlist", 'success');
        setOpen(false);
        try {
          window.dispatchEvent(
            new CustomEvent("playlistChanged", { detail: { playlistId, songId } })
          );
        } catch (e) {}
        return;
      }
      if (res.status === 409) {
        showToast("Song already in that playlist", 'error');
        return;
      }
      const data = await res.json();
      throw new Error(data?.error || "Failed to add");
    } catch (err) {
      console.error(err);
      showToast("Failed to add to playlist", 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div ref={ref} className="addToPlaylistRoot">
      <button
        className="addToPlaylistBtn--icon"
        onClick={(e) => {
          e.stopPropagation();
          if (!open && playlists.length === 0) fetchPlaylists();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label="Add to playlist"
        tabIndex={0}
      >
        +
      </button>

      {open && (
        <div className="addToPlaylistPopup">
          <div className="addToPlaylistPopup__title">Add to playlist</div>
          {loading ? (
            <div style={{ fontSize: 13 }}>Loading...</div>
          ) : playlists.length === 0 ? (
            <div style={{ fontSize: 13 }}>No playlists found</div>
          ) : (
            playlists.map((p) => (
              <button
                key={p.PlaylistID}
                className="addToPlaylistPopup__playlistBtn"
                onClick={(e) => {
                  e.stopPropagation();
                  addTo(p.PlaylistID);
                }}
                disabled={adding}
              >
                {p.Name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
