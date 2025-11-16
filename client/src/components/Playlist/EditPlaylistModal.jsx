import { useState, useEffect } from "react";
import "./CreatePlaylistModal.css";
import { API_BASE_URL } from "../../config/api";
import EditPlaylistCoverModal from "./EditPlaylistCoverModal";
import DeleteConfirmModal from "../DeleteConfirmModal/DeleteConfirmModal";
import { Trash2, Image as ImageIcon, Save } from "lucide-react";

export default function EditPlaylistModal({ playlist, tracks = [], onClose, onUpdated }) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState(playlist?.Name || "");
  const [description, setDescription] = useState(playlist?.Description || "");
  const [localTracks, setLocalTracks] = useState(tracks || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openCoverModal, setOpenCoverModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { songId, title } or null

  useEffect(() => {
    setName(playlist?.Name || "");
    setDescription(playlist?.Description || "");
    setLocalTracks(tracks || []);
  }, [playlist, tracks]);

  function close() {
    setOpen(false);
    onClose?.();
  }

  async function saveName() {
    if (!playlist?.PlaylistID) return;
    // if nothing changed, do nothing
    if (name === playlist.Name && description === (playlist.Description || "")) return;
    setLoading(true);
    setError(null);
    try {
      // server expects PUT for playlist updates
      const res = await fetch(`${API_BASE_URL}/playlists/${playlist.PlaylistID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Name: name, Description: description }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to update playlist");
      }
      // optimistic update
      const updated = { ...playlist, Name: name, Description: description };
  onUpdated?.(updated, localTracks);
  try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Playlist updated', type: 'success' } })); } catch(e){}
  try { window.dispatchEvent(new CustomEvent('playlistUpdated', { detail: { PlaylistID: playlist.PlaylistID } })); } catch(e){}
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function removeTrack(songId) {
    // legacy: this function is now triggered by the modal confirm handler.
    // Keep for backward compatibility but prefer using `handleConfirmRemove` instead.
    if (!playlist?.PlaylistID || !songId) return;
    setConfirmTarget({ songId, title: (localTracks.find(t => String(t.SongID) === String(songId)) || {}).title || '' });
  }

  // Called when the user confirms deletion in DeleteConfirmModal
  async function handleConfirmRemove() {
    if (!playlist?.PlaylistID || !confirmTarget?.songId) return;
    const songId = confirmTarget.songId;
    try {
      const res = await fetch(`${API_BASE_URL}/playlist_tracks/${playlist.PlaylistID}/${songId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove song');
      // update local list
      const next = localTracks.filter(t => String(t.SongID) !== String(songId));
      setLocalTracks(next);
      onUpdated?.(playlist, next);
      try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Song removed from playlist', type: 'success' } })); } catch(e){}
    } catch (e) {
      try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: e.message || 'Could not remove song', type: 'error' } })); } catch(e){}
    } finally {
      // close modal regardless
      setConfirmTarget(null);
    }
  }

  if (!open) return null;

  return (
    <div className="modalOverlay" onClick={close}>
      <div className="modalContainer" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <h3>Edit playlist</h3>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666' }}>Playlist name</label>
            <input className="playlistNameInput" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginTop: 8 }}>Description (optional)</label>
            <textarea className="playlistNameInput" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', minHeight: 72 }} />
          </div>

          <div className="modalRightActions">
            <button className="modalBtn" onClick={() => setOpenCoverModal(true)}><ImageIcon size={14} />&nbsp;Change cover</button>
            <button className="modalBtn" onClick={() => {
              // remove cover
              if (!playlist?.PlaylistID) return;
              if (!window.confirm('Remove playlist cover?')) return;
              (async () => {
                try {
                  const r = await fetch(`${API_BASE_URL}/playlists/${playlist.PlaylistID}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cover_media_id: null })
                  });
                  if (!r.ok) throw new Error('Failed to remove cover');
                  onUpdated?.({ ...playlist, cover_media_id: null }, localTracks);
                  try { window.dispatchEvent(new CustomEvent('playlistCoverUpdated', { detail: { PlaylistID: playlist.PlaylistID, cover_media_id: null } })); } catch(e){}
                } catch (e) {
                  alert(e.message || 'Failed to remove cover');
                }
              })();
            }}><Trash2 size={14} />&nbsp;Remove cover</button>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#666' }}>Tracks</label>
          <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
            {localTracks.length === 0 ? (
              <div style={{ padding: 8, color: '#666' }}>No tracks in this playlist.</div>
            ) : (
              localTracks.map((t, i) => (
                <div key={t.SongID || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 6, borderBottom: '1px solid #fafafa' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontSize: 14 }}>{t.title}</strong>
                    <span style={{ fontSize: 12, color: '#666' }}>{t.artist}</span>
                  </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                    <button className="modalBtn icon" onClick={() => removeTrack(t.SongID)} title="Remove track"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="modalBtn primary" onClick={saveName} disabled={loading}>{loading ? 'Saving…' : (<><Save size={14} />&nbsp;Save</>)}</button>
          <button className="modalBtn" onClick={close}>Close</button>
        </div>

        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}

        {openCoverModal && (
          <EditPlaylistCoverModal playlist={playlist} onClose={() => setOpenCoverModal(false)} onUpdated={(u) => {
            // reflect cover updates
            onUpdated?.(u, localTracks);
            try { window.dispatchEvent(new CustomEvent('playlistCoverUpdated', { detail: { PlaylistID: u.PlaylistID, cover_media_id: u.cover_media_id } })); } catch(e){}
            setOpenCoverModal(false);
          }} />
        )}
        
        <DeleteConfirmModal
          isOpen={!!confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onConfirm={handleConfirmRemove}
          songTitle={confirmTarget?.title}
        />
      </div>
    </div>
  );
}
