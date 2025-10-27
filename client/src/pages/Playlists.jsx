import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout/PageLayout";
import PlaylistForm from "../components/Playlist/PlaylistForm";

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);

  // 🧩 Fetch playlists from backend
  async function fetchPlaylists() {
    try {
      const res = await fetch("http://localhost:3001/playlists");
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

  // 🔁 Refresh after a new playlist is created
  function handlePlaylistCreated() {
    fetchPlaylists();
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
                className="bg-pink-50 border-2 border-pink-200 rounded-xl shadow-md p-4 hover:shadow-lg transition"
              >
                <img
                  src={pl.ImageURL || "https://placehold.co/300x200?text=No+Image"}
                  alt={pl.Name}
                  className="w-full h-40 object-cover rounded-md mb-3"
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
