import { useState } from "react";
import "./DeleteConfirmModal.css";

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  songTitle 
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
          <p>Are you sure you want to take down:</p>
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
            {isDeleting ? "Deleting..." : "Take Down"}
          </button>
        </div>
      </div>
    </div>
  );
}
