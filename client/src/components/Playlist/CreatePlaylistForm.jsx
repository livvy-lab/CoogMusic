import { useState } from "react";

export default function CreatePlaylistForm({ listenerId, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const res = await fetch("http://localhost:3001/playlists", {
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
