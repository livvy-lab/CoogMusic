import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config/api";
import { getUser } from "../../lib/userStorage";

export default function CreatePlaylistForm({ listenerId, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
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

    try {
      let mediaId = null;

      // If user selected a cover image, upload it first
      if (coverFile) {
        setUploading(true);
  const fd = new FormData();
  // use the same field name as profile avatar uploads ('file') for consistency
  fd.append("file", coverFile);
        const up = await fetch(`${API_BASE_URL}/media`, {
          method: "POST",
          body: fd,
        });
        if (!up.ok) {
          const txt = await up.text().catch(() => "");
          throw new Error(`Image upload failed: ${up.status} ${txt}`);
        }
        const ju = await up.json();
        mediaId = ju.mediaId || ju.media_id || ju.mediaID || ju.media_id || null;
        setUploading(false);
      }

      // Create playlist as before
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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create playlist");
      }

      const newPlaylist = await res.json();

      // If we uploaded an image, associate it with the new playlist.
      // Make this atomic: if association fails, delete the created playlist.
      if (mediaId && newPlaylist?.PlaylistID) {
        try {
          const assoc = await fetch(`${API_BASE_URL}/playlists/${newPlaylist.PlaylistID}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cover_media_id: mediaId }),
          });
          if (!assoc.ok) {
            // rollback: delete the newly created playlist
            await fetch(`${API_BASE_URL}/playlists/${newPlaylist.PlaylistID}`, { method: "DELETE" });
            throw new Error("Failed to attach cover to new playlist; playlist creation rolled back.");
          }
          newPlaylist.cover_media_id = mediaId;
        } catch (e) {
          setUploading(false);
          throw e;
        }
      }

      onCreated?.(newPlaylist);
      setName("");
      setDescription("");
      setIsPublic(true);
      setCoverFile(null);
  if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch (e) {} }
  setPreviewUrl(null);
  try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Playlist created', type: 'success' } })); } catch (e) {}
  if (mediaId) { try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Cover uploaded', type: 'success' } })); } catch (e) {} }
      setUploading(false);
    } catch (err) {
      setUploading(false);
      setError(err.message || String(err));
    }
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

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        Cover image (optional)
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setCoverFile(f);
            if (f) {
              try {
                const url = URL.createObjectURL(f);
                setPreviewUrl(url);
              } catch (e) {
                setPreviewUrl(null);
              }
            } else {
              if (previewUrl) { URL.revokeObjectURL(previewUrl); }
              setPreviewUrl(null);
            }
          }}
        />
      </label>

      {previewUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={previewUrl} alt="cover preview" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '2px solid #895674' }} />
          <button type="button" onClick={() => { setCoverFile(null); if (previewUrl) { URL.revokeObjectURL(previewUrl); } setPreviewUrl(null); }}>Remove</button>
        </div>
      )}

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

      <button type="submit" disabled={uploading}>{uploading ? "Uploading…" : "Create"}</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
