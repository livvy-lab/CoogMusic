import { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config/api";
import "./SongUploadModal.css";



export default function SongUploadModal({ 
  onSuccess, 
  onClose, 
  errorMsg, 
  isSubmitting 
}) {
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioName, setAudioName] = useState("");
  const [error, setError] = useState(""); // For internal validation
  const [availableGenres, setAvailableGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);



  const SUPPORTED_FILES = ".mp3, .wav, .aac, .ogg, .flac";



  useEffect(() => {
    fetch(`${API_BASE_URL}/genres`)
      .then(res => res.json())
      .then(data => setAvailableGenres(Array.isArray(data) ? data : []));
  }, []);



  const handleAudioChange = e => {
    const file = e.target.files[0];
    setAudioFile(file || null);
    setAudioName(file ? file.name : "");
    setError(""); // clear error on file change
  };



  const toggleGenre = (genreId) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
    setError(""); // clear error on genre select
  };



  const handleSubmit = e => {
    e.preventDefault();
    // Custom validation checks
    if (!title.trim()) {
      setError("Please enter a song title.");
      return;
    }
    if (!audioFile) {
      setError("Please select an audio file.");
      return;
    }
    if (selectedGenres.length === 0) {
      setError("Please select at least one genre.");
      return;
    }
    onSuccess({ title, audioFile, genreIds: selectedGenres });
    
  };



  // Combine internal validation error with external network error
  const displayError = error || errorMsg;



  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="song-upload-modal" onClick={e => e.stopPropagation()}>
        <form className="song-form-layout" onSubmit={handleSubmit} noValidate>
          <div className="modal-left-col">
            <span className="modal-title-desktop">Add Track</span>
            <div className="form-group">
              <label htmlFor="song-title">Song Title</label>
              <input
                type="text"
                id="song-title"
                className="title-input"
                value={title}
                placeholder="Enter song title"
                onChange={e => { setTitle(e.target.value); setError(""); }}
                disabled={isSubmitting} // Use prop
              />
            </div>
            <div className="form-group upload-group" style={{marginBottom:0}}>
              <div
                className={`upload-box${audioFile ? " has-file" : ""}`}
                tabIndex={0}
                onClick={() => !isSubmitting && document.getElementById("audio-file").click()}
                style={isSubmitting ? { cursor: 'not-allowed' } : {}}
              >
                <div className="upload-content">
                  <div className="upload-icon">
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                      <path d="M16 22V10M16 10L10 16M16 10L22 16" stroke="#782355" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="4" y="24" width="24" height="4" rx="2" fill="#ad7d9b"/>
                    </svg>
                  </div>
                  <div className="select-text">
                    Select audio file
                  </div>
                  {audioName && <div className="file-selected">{audioName}</div>}
                  <input
                    type="file"
                    id="audio-file"
                    style={{ display: "none" }}
                    onChange={handleAudioChange}
                    accept="audio/*"
                    disabled={isSubmitting} // Use prop
                  />
                </div>
              </div>
            </div>
            <div className="supported-text">
              Supported: {SUPPORTED_FILES}
            </div>
          </div>
          
          <div className="modal-right-col">
            <div className="genres-group">
              <span className="genre-label">Genres</span>
              <div className="genre-grid-scroll">
                <div className="genre-grid">
                  {availableGenres.map((genre) => (
                    <button
                      key={genre.GenreID}
                      type="button"
                      className={`genre-capsule${selectedGenres.includes(genre.GenreID) ? " selected" : ""}`}
                      onClick={() => toggleGenre(genre.GenreID)}
                      disabled={isSubmitting} // Use prop
                    >
                      {genre.Name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              {displayError && 
                <div className="error-message">
                  {displayError}
                </div>
              }
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Uploading..." : "Add Track"}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}