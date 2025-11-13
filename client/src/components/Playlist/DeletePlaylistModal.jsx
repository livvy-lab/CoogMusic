import { useState } from "react";
import "./CreatePlaylistModal.css";

export default function DeletePlaylistModal({ playlist, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onConfirm?.();
    setDeleting(false);
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContainer" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3 style={{ color: '#895674', marginTop: 0 }}>Delete Playlist</h3>
        
        <p style={{ fontSize: 16, lineHeight: 1.6, color: '#6e4760' }}>
          Are you sure you want to delete <strong>"{playlist?.Name || 'this playlist'}"</strong>?
        </p>
        
        {playlist?.TrackCount > 0 && (
          <p style={{ fontSize: 14, color: '#af578a', marginTop: 8 }}>
            This playlist contains {playlist.TrackCount} {playlist.TrackCount === 1 ? 'track' : 'tracks'}.
          </p>
        )}
        
        <p style={{ fontSize: 14, color: '#d9534f', fontWeight: 600, marginTop: 12 }}>
          This action cannot be undone.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="modalBtn" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button 
            className="modalBtn" 
            onClick={handleDelete} 
            disabled={deleting}
            style={{ 
              background: '#d9534f', 
              color: 'white',
              borderColor: 'rgba(0,0,0,0.1)'
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Playlist'}
          </button>
        </div>
      </div>
    </div>
  );
}
