import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config/api";
import { getUser } from "../../lib/userStorage";

export default function CreatePlaylistForm({ listenerId, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [playlistCount, setPlaylistCount] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!listenerId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/subscriptions/listener/${listenerId}`);
        if (res.ok) {
          const d = await res.json();
          if (mounted) setIsSubscribed(Boolean(d.IsActive));
        } else {
          if (mounted) setIsSubscribed(false);
        }
      } catch (e) {
        if (mounted) setIsSubscribed(false);
      }

      try {
        const r = await fetch(`${API_BASE_URL}/listeners/${listenerId}/playlists`);
        if (r.ok) {
          const data = await r.json();
          if (mounted) setPlaylistCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => { mounted = false; };
  }, [listenerId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // enforce non-subscriber rules: only public playlists and max 10
    if (!isSubscribed) {
      if (!isPublic) {
        setError('Private playlists are available to subscribers only.');
        return;
      }
      if (typeof playlistCount === 'number' && playlistCount >= 10) {
        setError('Free accounts can create up to 10 playlists. Upgrade to create more.');
        return;
      }
    }

    const res = await fetch(`${API_BASE_URL}/playlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ListenerID: listenerId,
        Name: name,
        Description: description,
        IsPublic: isPublic,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create playlist");
      return;
    }

    const newPlaylist = await res.json();
    onCreated?.(newPlaylist);
    setName("");
    setDescription("");
    setIsPublic(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginBottom: "1rem",
      }}
    >
      <h3>Create New Playlist</h3>

      <input
        type="text"
        placeholder="Playlist name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label>
        Visibility:
        <select
          value={isPublic}
          onChange={(e) => setIsPublic(e.target.value === "true")}
        >
          <option value="true">Public</option>
          <option value="false">Private</option>
        </select>
      </label>

      <button type="submit">Create</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
