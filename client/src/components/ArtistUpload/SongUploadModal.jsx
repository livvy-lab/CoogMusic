import { useState } from "react";
import "./SongUploadModal.css";

export default function SongUploadModal({ onSuccess, onClose }) {
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioName, setAudioName] = useState("");
  const [error, setError] = useState("");

  const SUPPORTED_FILES = ".mp3, .wav, .aac, .ogg, .flac";

  const handleAudioChange = e => {
    const file = e.target.files[0];
    setAudioFile(file || null);
    setAudioName(file ? file.name : "");
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!title || !audioFile) {
      setError("All fields required.");
      return;
    }
    onSuccess({ title, audioFile });
    setTitle(""); setAudioFile(null); setAudioName(""); setError("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="song-upload-modal compact" onClick={e => e.stopPropagation()}>
        <h2 className="upload-page-title" style={{margin: 0, fontSize: 28, marginBottom: 18}}>Add Track</h2>
        <form className="song-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="song-title">Song Title</label>
            <input
              type="text"
              id="song-title"
              value={title}
              placeholder="Enter song title"
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <div
              className="upload-box upload-box-compact"
              tabIndex={0}
              onClick={() => document.getElementById("audio-file").click()}
              style={{minHeight:70}}
            >
              <div className="upload-icon" style={{marginBottom:2}}>
                <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
                  <path d="M16 22V10M16 10L10 16M16 10L22 16" stroke="#782355" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="4" y="24" width="24" height="4" rx="2" fill="#ad7d9b"/>
                </svg>
              </div>
              <button type="button" className="select-button" tabIndex={-1}>Select audio file</button>
              {audioName && <div className="file-selected">{audioName}</div>}
              <input
                type="file"
                id="audio-file"
                style={{ display: "none" }}
                onChange={handleAudioChange}
                accept="audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/aac,audio/ogg"
              />
            </div>
          </div>
          {error && <div className="modal-error">{error}</div>}
          <div className="supported-files-text" style={{margin:"12px 0 4px 0"}}>
            Supported Files: {SUPPORTED_FILES}
          </div>
          <button type="submit" className="upload-submit-button" style={{marginTop:7}}>
            Add Track
          </button>
          <button type="button" className="choose-tracks-btn cancel-upload-btn" onClick={onClose}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
