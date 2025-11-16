import { useState, useEffect } from "react";
import "./EditSongModal.css";
import { API_BASE_URL } from "../../config/api";

export default function EditSongModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  song 
}) {
  const [title, setTitle] = useState("");
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGenres, setIsLoadingGenres] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchGenres();
    }
  }, [isOpen]);

  useEffect(() => {
    if (song && isOpen) {
      console.log("[EditSongModal] Loading song:", song);
      setTitle(song.title || "");
      
      if (song.cover_media_id) {
        loadCoverPreview(song.cover_media_id);
      } else {
        setCoverPreview(null);
      }
      
      loadSongGenres();
    }
  }, [song, isOpen]);

  const fetchGenres = async () => {
    try {
      console.log("[EditSongModal] Fetching genres...");
      const res = await fetch(`${API_BASE_URL}/genres`);
      if (!res.ok) throw new Error("Failed to fetch genres");
      const data = await res.json();
      console.log("[EditSongModal] Genres loaded:", data);
      setAvailableGenres(data);
    } catch (err) {
      console.error("Error fetching genres:", err);
      setError("Failed to load genres");
    }
  };

  const loadSongGenres = async () => {
    if (!song) return;
    
    setIsLoadingGenres(true);
    try {
      console.log(`[EditSongModal] Fetching genres for song ${song.SongID}...`);
      const res = await fetch(`${API_BASE_URL}/song_genres/song/${song.SongID}`);
      
      let fetchedGenreIds = [];
      if (res.ok) {
        const data = await res.json();
        console.log("[EditSongModal] Song genres from Song_Genre table:", data);
        if (Array.isArray(data)) {
          fetchedGenreIds = data.map(g => g.GenreID);
        }
      } else {
        console.warn("Failed to fetch song_genres, proceeding...");
      }

      // Use a Set to combine genres from both sources without duplicates
      const allGenreIds = new Set(fetchedGenreIds);

      if (song.GenreID) {
        console.log(`[EditSongModal] Adding primary genre from song object: ${song.GenreID}`);
        allGenreIds.add(song.GenreID);
      }

      const finalGenreIds = Array.from(allGenreIds);
      console.log("[EditSongModal] Setting combined selected genres:", finalGenreIds);
      setSelectedGenres(finalGenreIds);
      
    } catch (err) {
      console.error("Error loading song genres:", err);
      // Fallback to just the song's main GenreID if the fetch fails
      setSelectedGenres(song.GenreID ? [song.GenreID] : []);
    } finally {
      setIsLoadingGenres(false);
    }
  };

  const loadCoverPreview = async (mediaId) => {
    try {
      console.log(`[EditSongModal] Loading cover preview for media ${mediaId}...`);
      const res = await fetch(`${API_BASE_URL}/media/${mediaId}`);
      if (!res.ok) return;
      const data = await res.json();
      console.log("[EditSongModal] Cover data:", data);
      if (data.url) {
        setCoverPreview(data.url);
      }
    } catch (err) {
      console.error("Error loading cover preview:", err);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Cover image must be less than 5MB");
        return;
      }
      console.log("[EditSongModal] Cover file selected:", file.name, file.type);
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        setError("Please select an audio file");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError("Audio file must be less than 50MB");
        return;
      }
      console.log("[EditSongModal] Audio file selected:", file.name, file.type);
      setAudioFile(file);
      setError("");
    }
  };

  const toggleGenre = (genreId) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      console.log("[EditSongModal] Starting update for song:", song.SongID);

      // Update song title if changed
      if (title.trim() !== song.title) {
        console.log("[EditSongModal] Updating title to:", title.trim());
        const updateRes = await fetch(`${API_BASE_URL}/songs/${song.SongID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Title: title.trim() })
        });
        if (!updateRes.ok) {
          const errData = await updateRes.json();
          console.error("[EditSongModal] Title update failed:", errData);
          throw new Error(errData.error || "Failed to update song title");
        }
        console.log("[EditSongModal] Title updated successfully");
      }

      // Upload new cover if provided
      if (coverFile) {
        console.log("[EditSongModal] Uploading new cover...");
        const coverFormData = new FormData();
        coverFormData.append("image", coverFile);
        coverFormData.append("type", "song_cover");

        const coverRes = await fetch(`${API_BASE_URL}/media`, {
          method: "POST",
          body: coverFormData
        });

        if (!coverRes.ok) {
          const errData = await coverRes.json();
          console.error("[EditSongModal] Cover upload failed:", errData);
          throw new Error(errData.error || "Failed to upload cover image");
        }
        const coverData = await coverRes.json();
        console.log("[EditSongModal] Cover uploaded:", coverData);

        // Update song with new cover media ID
        console.log("[EditSongModal] Updating song cover_media_id to:", coverData.mediaId);
        const updateCoverRes = await fetch(`${API_BASE_URL}/songs/${song.SongID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cover_media_id: coverData.mediaId })
        });

        if (!updateCoverRes.ok) {
          const errData = await updateCoverRes.json();
          console.error("[EditSongModal] Cover update failed:", errData);
          throw new Error(errData.error || "Failed to update song cover");
        }
        console.log("[EditSongModal] Cover updated successfully");
      }

      // Upload new audio file if provided
      if (audioFile) {
        console.log("[EditSongModal] Uploading new audio...");
        const audioFormData = new FormData();
        audioFormData.append("audio", audioFile);
        audioFormData.append("type", "song_audio");

        const audioRes = await fetch(`${API_BASE_URL}/media`, {
          method: "POST",
          body: audioFormData
        });

        if (!audioRes.ok) {
          const errData = await audioRes.json();
          console.error("[EditSongModal] Audio upload failed:", errData);
          throw new Error(errData.error || "Failed to upload audio file");
        }
        const audioData = await audioRes.json();
        console.log("[EditSongModal] Audio uploaded:", audioData);

        // Update song with new audio media ID
        console.log("[EditSongModal] Updating song audio_media_id to:", audioData.mediaId);
        const updateAudioRes = await fetch(`${API_BASE_URL}/songs/${song.SongID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio_media_id: audioData.mediaId })
        });

        if (!updateAudioRes.ok) {
          const errData = await updateAudioRes.json();
          console.error("[EditSongModal] Audio update failed:", errData);
          throw new Error(errData.error || "Failed to update song audio");
        }
        console.log("[EditSongModal] Audio updated successfully");
      }

      // Delete all existing genres for this song
      console.log("[EditSongModal] Deleting existing genres...");
      const deleteGenresRes = await fetch(
        `${API_BASE_URL}/song_genres/song/${song.SongID}`,
        { method: "DELETE" }
      );

      if (!deleteGenresRes.ok) {
        console.warn("Could not delete genres, continuing anyway");
      } else {
        console.log("[EditSongModal] Existing genres deleted");
      }

      // Add new genre associations
      console.log("[EditSongModal] Adding genres:", selectedGenres);
      for (const genreId of selectedGenres) {
        const addGenreRes = await fetch(`${API_BASE_URL}/song_genres`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            SongID: song.SongID, 
            GenreID: genreId 
          })
        });

        if (!addGenreRes.ok) {
          console.warn(`Could not add genre ${genreId}`);
        } else {
          console.log(`[EditSongModal] Genre ${genreId} added`);
        }
      }

      console.log("[EditSongModal] Update complete!");
      onSuccess();
      handleClose();
    } catch (err) {
      console.error("[EditSongModal] Error updating song:", err);
      setError(err.message || "Failed to update song");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setSelectedGenres([]);
    setCoverFile(null);
    setAudioFile(null);
    setCoverPreview(null);
    setError("");
    setIsLoadingGenres(false);
    onClose();
  };

  if (!isOpen || !song) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content edit-song-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Song</h2>
          <button 
            className="modal-close-btn" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="song-title">Song Title</label>
              <input
                id="song-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter song title"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label>Genres {isLoadingGenres && <span className="loading-text">(Loading...)</span>}</label>
              <div className="genre-grid">
                {availableGenres.length === 0 ? (
                  <p className="no-genres-text">Loading genres...</p>
                ) : (
                  availableGenres.map((genre) => (
                    <button
                      key={genre.GenreID}
                      type="button"
                      className={`genre-tag ${
                        selectedGenres.includes(genre.GenreID) ? "selected" : ""
                      }`}
                      onClick={() => toggleGenre(genre.GenreID)}
                      disabled={isSubmitting || isLoadingGenres}
                    >
                      {genre.Name}
                    </button>
                  ))
                )}
              </div>
              {selectedGenres.length > 0 && (
                <p className="selected-count">Selected: {selectedGenres.length}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="cover-upload">Cover Image</label>
              <div className="file-upload-area">
                {coverPreview && (
                  <div className="cover-preview">
                    <img src={coverPreview} alt="Cover preview" />
                  </div>
                )}
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  disabled={isSubmitting}
                  className="file-input"
                />
                <label htmlFor="cover-upload" className="file-label">
                  {coverFile ? coverFile.name : "Choose new cover image"}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="audio-upload">Audio File</label>
              <div className="file-upload-area">
                <input
                  id="audio-upload"
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioChange}
                  disabled={isSubmitting} 
                  className="file-input"
                />
                <label htmlFor="audio-upload" className="file-label">
                  {audioFile ? audioFile.name : "Choose new audio file"}
                </label>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              type="button"
              className="btn-cancel" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn-submit" 
              disabled={isSubmitting || isLoadingGenres}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}