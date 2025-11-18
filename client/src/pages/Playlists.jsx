import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import PlaylistForm from "../components/Playlist/PlaylistForm";
import { API_BASE_URL } from "../config/api";

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);

  // 🧩 Fetch playlists from backend
  async function fetchPlaylists() {
    try {
      const res = await fetch(`${API_BASE_URL}/playlists`);
      if (!res.ok) throw new Error("Failed to fetch playlists");
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      console.error("❌ Error loading playlists:", err);
    }
  }

  // 🔁 Load playlists once on page load
  useEffect(() => {
    fetchPlaylists();
  }, []);

  // 🔁 Listen for playlist creation events
  useEffect(() => {
    function onCreated(e) {
      const pl = e?.detail;
      if (!pl || !pl.PlaylistID) return;
      // Add new playlist to the beginning of the list
      setPlaylists(prev => [pl, ...prev]);
    }

    window.addEventListener('playlistCreated', onCreated);
    return () => {
      window.removeEventListener('playlistCreated', onCreated);
    };
  }, []);

  // 🔁 Refresh after a new playlist is created
  function handlePlaylistCreated(newPlaylist) {
    // Dispatch event so other components can listen
    try {
      window.dispatchEvent(new CustomEvent('playlistCreated', { detail: newPlaylist }));
    } catch (e) {
      console.error('Failed to dispatch playlistCreated event:', e);
    }
    // Also update local state directly as fallback
    if (newPlaylist && newPlaylist.PlaylistID) {
      setPlaylists(prev => [newPlaylist, ...prev]);
    }
  }

  return (
    <PageLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#782355] mb-4">Your Playlists</h1>

        {/* 🎵 Create new playlist form */}
        <div className="max-w-lg mb-8">
          <PlaylistForm onCreated={handlePlaylistCreated} />
        </div>

        {/* 🎶 List of all playlists */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.length === 0 ? (
            <p className="text-gray-500">No playlists yet.</p>
          ) : (
            playlists.map((pl) => (
              <div
                key={pl.PlaylistID}
                className="bg-pink-50 border-2 border-pink-200 rounded-xl shadow-md p-4 hover:shadow-lg transition playlistCard"
              >
                <img
                  src={pl.ImageURL || "https://placehold.co/300x200?text=No+Image"}
                  alt={pl.Name}
                  className="w-full playlistCardImg mb-3 rounded-md"
                />
                <h3 className="text-lg font-semibold text-[#782355] truncate">
                  {pl.Name}
                </h3>
                <p className="text-sm text-pink-700">
                  Listener ID: {pl.ListenerID}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
