import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config/api";
import { getUser } from "../../lib/userStorage";

import { Link } from "react-router-dom";

export default function AddToPlaylistMenu({ songId, onAdded, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [fetchedFor, setFetchedFor] = useState(null);

  // 🧩 Fetch all playlists when menu is opened
  async function fetchPlaylists() {
    // Prefer fetching the current listener's playlists so users only see their own
    const u = getUser();
    const listenerId = u?.listenerId ?? u?.ListenerID ?? null;
    const url = listenerId ? `${API_BASE_URL}/listeners/${listenerId}/playlists` : `${API_BASE_URL}/playlists`;
    console.debug('[AddToPlaylistMenu] fetching playlists for listener', listenerId, 'url=', url);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('[AddToPlaylistMenu] playlists fetch returned', res.status);
        setPlaylists([]);
        setFetchedFor(listenerId);
        return;
      }
      const data = await res.json();
      console.debug('[AddToPlaylistMenu] fetched playlists length=', Array.isArray(data) ? data.length : 'non-array', data?.slice?.(0,3));
      setPlaylists(Array.isArray(data) ? data : []);
      setFetchedFor(listenerId);

      // Fallback: if the listener-specific route returned no array or an empty array,
      // try the query parameter form (/playlists?listenerId=) which some environments may use.
      if (listenerId && (!Array.isArray(data) || data.length === 0)) {
        try {
          const fb = await fetch(`${API_BASE_URL}/playlists?listenerId=${encodeURIComponent(listenerId)}`);
          if (fb.ok) {
            const db = await fb.json();
            if (Array.isArray(db) && db.length > 0) {
              console.debug('[AddToPlaylistMenu] fallback /playlists?listenerId returned', db.length);
              setPlaylists(db);
            }
          }
        } catch (e) {
          console.warn('[AddToPlaylistMenu] fallback fetch error', e);
        }
      }
    } catch (err) {
      console.error('[AddToPlaylistMenu] fetchPlaylists error', err);
      setPlaylists([]);
      setFetchedFor(listenerId);
    }
  }

  // 🧠 Toggle dropdown
  function toggleMenu() {
    if (!isOpen) fetchPlaylists();
    setIsOpen(!isOpen);
  }

  // 🧩 Add song to selected playlist
  async function addSongToPlaylist(playlistId) {
    try {
      console.debug('[AddToPlaylistMenu] adding song', songId, 'to playlist', playlistId);
      const res = await fetch(`${API_BASE_URL}/playlist_tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ PlaylistID: playlistId, SongID: songId }),
      });

      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

      if (res.status === 201) {
        alert("✅ Song added to playlist!");
        setIsOpen(false);
        onAdded?.();
        return;
      }

      if (res.status === 409) {
        alert('⚠️ That song is already in the playlist.');
        return;
      }

      console.warn('[AddToPlaylistMenu] addSongToPlaylist failed', res.status, data);
      // show the server response to the user to aid debugging (temporary)
      try {
        alert(`❌ Failed to add song (status ${res.status}):\n${JSON.stringify(data)}`);
      } catch (e) {
        alert('❌ Failed to add song. See console for details.');
      }
    } catch (err) {
      console.error('[AddToPlaylistMenu] addSongToPlaylist error', err);
      alert('❌ Failed to add song (network error).');
    }
  }

  return (
    <div className="relative inline-block text-left">
      {/* ➕ Button */}
      <button
        onClick={toggleMenu}
        className={`addToPlaylistBtn ${compact ? "addToPlaylistBtn--compact" : ""}`}
        title="Add to playlist"
      >
        +
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute mt-2 w-48 bg-white border border-pink-200 rounded-lg shadow-md z-10">
          <p className="text-sm font-semibold text-[#782355] px-3 py-2 border-b border-pink-100">
            Add to playlist
          </p>
          {playlists.length > 0 ? (
            playlists.map((pl) => (
              <button
                key={pl.PlaylistID}
                onClick={() => addSongToPlaylist(pl.PlaylistID)}
                className="block w-full text-left px-3 py-2 hover:bg-pink-50 text-[#782355] text-sm"
              >
                {pl.Name}
              </button>
            ))
          ) : (
            <div className="px-3 py-2">
              <p className="text-xs text-gray-500">You have no playlists yet.</p>
              {fetchedFor != null && (
                <p className="text-xs text-gray-400">(fetched for listener id: {String(fetchedFor)})</p>
              )}
              <Link to="/me/playlists" className="text-sm text-[#782355]">Create one</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
