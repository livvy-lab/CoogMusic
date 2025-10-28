import { useState } from "react";
import CreatePlaylistForm from "./CreatePlaylistForm";
import "./CreatePlaylistModal.css";

export default function CreatePlaylistModal({ listenerId, onCreated }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Button that opens the modal */}
      <button className="createPlaylistBtn" onClick={() => setOpen(true)}>
        + New Playlist
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="modalOverlay" onClick={() => setOpen(false)}>
          <div
            className="modalContainer"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
           <h2 style={{ marginBottom: "1rem" }}>Create New Playlist</h2>
            <CreatePlaylistForm 

              listenerId={listenerId}
              onCreated={(pl) => {
                onCreated?.(pl);
                setOpen(false);
              }}
            />

            <button className="closeBtn" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
