import { useState } from "react";
import { API_BASE_URL } from "../../config/api";
import { showToast } from '../../lib/toast';

export default function PlaylistForm({ onCreated }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
const res = await fetch(`${API_BASE_URL}/playlists`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    Name: name,
    ImageURL: image,
    IsPublic: true,  // ✅ added because backend requires it
    ListenerID: 6,
  }),
});

    if (res.ok) {
      const data = await res.json();
      onCreated?.(data);
      setName("");
      setImage("");
      showToast("✅ Playlist created!", 'success');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="playlistForm">
      <h3>Create New Playlist</h3>
      <input
        type="text"
        placeholder="Playlist name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Image URL (optional)"
        value={image}
        onChange={(e) => setImage(e.target.value)}
      />
      <button type="submit">Create Playlist</button>
    </form>
  );
}
