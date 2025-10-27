import { useEffect, useState } from "react";

export default function AddToPlaylistMenu({ songId, onAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);

  // 🧩 Fetch all playlists when menu is opened
  async function fetchPlaylists() {
    const res = await fetch("http://localhost:3001/playlists");
    if (res.ok) {
      const data = await res.json();
      setPlaylists(data);
    }
  }

  // 🧠 Toggle dropdown
  function toggleMenu() {
    if (!isOpen) fetchPlaylists();
    setIsOpen(!isOpen);
  }

  // 🧩 Add song to selected playlist
  async function addSongToPlaylist(playlistId) {
    const res = await fetch(`http://localhost:3001/playlists/${playlistId}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId }),
    });

    if (res.ok) {
      alert("✅ Song added to playlist!");
      setIsOpen(false);
      onAdded?.();
    } else {
      alert("❌ Failed to add song. Check backend route.");
    }
  }

  return (
    <div className="relative inline-block text-left">
      {/* ➕ Button */}
   <button onClick={toggleMenu} className="addToPlaylistBtn" title="Add to playlist">
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
            <p className="text-xs text-gray-500 px-3 py-2">No playlists found</p>
          )}
        </div>
      )}
    </div>
  );
}
