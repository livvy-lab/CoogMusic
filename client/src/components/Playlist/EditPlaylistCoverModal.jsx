import { useState, useEffect } from "react";
import "./CreatePlaylistModal.css";
import { API_BASE_URL } from "../../config/api";

export default function EditPlaylistCoverModal({ playlist, onClose, onUpdated }) {
  const [open, setOpen] = useState(true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function resolveCurrent() {
      if (!playlist) return;
      if (playlist.CoverURL) {
        setCurrentUrl(playlist.CoverURL);
        return;
      }
      if (playlist.cover_media_id) {
        try {
          const r = await fetch(`${API_BASE_URL}/media/${playlist.cover_media_id}`);
          if (!r.ok) return;
          const j = await r.json();
          if (mounted) setCurrentUrl(j?.url || null);
        } catch (e) {}
      }
    }
    resolveCurrent();
    return () => { mounted = false; };
  }, [playlist]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => { URL.revokeObjectURL(url); };
  }, [file]);

  function close() {
    setOpen(false);
    onClose?.();
  }

  async function handleUpload() {
    if (!file || !playlist?.PlaylistID) return;
    setLoading(true);
    setError(null);
    try {
  // upload media
  const fd = new FormData();
  // use 'file' to match the profile upload implementation
  fd.append("file", file);
      const up = await fetch(`${API_BASE_URL}/media`, { method: "POST", body: fd });
      if (!up.ok) throw new Error("Image upload failed");
      const ju = await up.json();
      const mediaId = ju.mediaId || ju.media_id || ju.mediaID || null;

      // associate with playlist
      const assoc = await fetch(`${API_BASE_URL}/playlists/${playlist.PlaylistID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_media_id: mediaId }),
      });
      if (!assoc.ok) throw new Error("Failed to attach cover to playlist");

      onUpdated?.({ ...playlist, cover_media_id: mediaId });
      try {
        window.dispatchEvent(new CustomEvent('playlistCoverUpdated', { detail: { PlaylistID: playlist.PlaylistID, cover_media_id: mediaId } }));
        window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Cover updated', type: 'success' } }));
      } catch (e) {}
      close();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!playlist?.PlaylistID) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${playlist.PlaylistID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_media_id: null }),
      });
      if (!res.ok) throw new Error("Failed to remove cover");
      onUpdated?.({ ...playlist, cover_media_id: null });
      try {
        window.dispatchEvent(new CustomEvent('playlistCoverUpdated', { detail: { PlaylistID: playlist.PlaylistID, cover_media_id: null } }));
        window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Cover removed', type: 'success' } }));
      } catch (e) {}
      close();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modalOverlay" onClick={close}>
      <div className="modalContainer" onClick={(e) => e.stopPropagation()}>
        <h3>Change playlist cover</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ width: 120, height: 120, borderRadius: 8, overflow: 'hidden', border: '2px solid #895674' }}>
            {preview ? (
              <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : currentUrl ? (
              <img src={currentUrl} alt="current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#f2cce1' }} />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleUpload} disabled={loading || !file}>{loading ? 'Uploading…' : 'Upload'}</button>
              <button onClick={handleRemove} disabled={loading || !playlist?.cover_media_id}>Remove cover</button>
              <button onClick={close}>Cancel</button>
            </div>
            {error && <div style={{ color: 'red' }}>{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
