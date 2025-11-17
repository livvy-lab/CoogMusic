import { useState } from "react";
import "./DeleteConfirmModal.css";


export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  songTitle,
  albumsRestriction,
  type
}) {
  const [isDeleting, setIsDeleting] = useState(false);


  if (!isOpen) return null;


  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };


  // 🎯 If song is restricted by albums, show restriction message instead
  if (albumsRestriction && albumsRestriction.length > 0) {
    const isEditRestriction = type === 'edit';
    
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{isEditRestriction ? "Cannot Edit Song" : "Cannot Delete Song"}</h2>
            <button 
              className="modal-close-btn" 
              onClick={onClose}
              disabled={isDeleting}
            >
              ×
            </button>
          </div>
          
          <div className="modal-body">
            <p>
              {isEditRestriction 
                ? "This song cannot be edited because it's part of the following album(s):"
                : "This song cannot be deleted because it's part of the following album(s):"}
            </p>
            <p className="song-title-highlight">
              {albumsRestriction.map(a => a.Title).join(", ")}
            </p>
            <p className="warning-text">
              {isEditRestriction 
                ? "Please edit the album directly to make changes to this track."
                : "Please remove the song from the album first, or delete the entire album."}
            </p>
          </div>
          
          <div className="modal-footer">
            <button 
              className="btn-cancel" 
              onClick={onClose}
              disabled={isDeleting}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }


  // Normal deletion confirmation
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirm Deletion</h2>
          <button 
            className="modal-close-btn" 
            onClick={onClose}
            disabled={isDeleting}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <p>Are you sure you want to remove:</p>
          <p className="song-title-highlight">"{songTitle}"</p>
          <p className="warning-text">This action cannot be undone.</p>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn-cancel" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            className="btn-confirm-delete" 
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}