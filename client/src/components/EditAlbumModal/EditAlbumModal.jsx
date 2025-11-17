import { useState, useEffect } from "react";
import SongUploadModal from "../ArtistUpload/SongUploadModal";
import { API_BASE_URL } from "../../config/api";
import "./EditAlbumModal.css";


export default function EditAlbumModal({
  isOpen,
  onClose,
  onSuccess,
  album
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [tracks, setTracks] = useState([]); // array of song IDs
  const [allSongs, setAllSongs] = useState([]);
  const [toRemove, setToRemove] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSongModal, setShowSongModal] = useState(false);
  const [songUploadError, setSongUploadError] = useState("");
  const [isUploadingSong, setIsUploadingSong] = useState(false);


  useEffect(() => {
    if (isOpen && album) {
      setTitle(album.title || "");
      setDescription(album.description || "");
      setCoverFile(null);
      setError("");
      setToRemove([]);
      if (album.cover_media_id) {
        loadCoverPreview(album.cover_media_id);
      } else {
        setCoverPreview(null);
      }
      fetchAlbumTracks();
      fetchAllSongs();
    }
  }, [isOpen, album]);


  const fetchAlbumTracks = () => {
    fetch(`${API_BASE_URL}/albums/${album.AlbumID}/tracks`)
      .then(res => res.json())
      .then(data => setTracks((data || []).map(track => track.SongID)))
      .catch(() => setTracks([]));
  };
  
  const fetchAllSongs = () => {
    const artId = album.artist_id || album.ArtistID;
    if (!artId) {
      setAllSongs([]);
      return;
    }
    fetch(`${API_BASE_URL}/artists/${artId}/songs`)
      .then(res => res.json())
      .then(data => setAllSongs(Array.isArray(data) ? data : []))
      .catch(() => setAllSongs([]));
  };


  const loadCoverPreview = async (mediaId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/media/${mediaId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.url) setCoverPreview(data.url);
    } catch { setCoverPreview(null); }
  };


  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setError("");
    }
  };


  const toggleRemoveTrack = (songId) => {
    setToRemove(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };


  const addTrack = (songId, songObj = null) => {
    setTracks(prev => prev.includes(songId) ? prev : [...prev, songId]);
    setToRemove(prev => prev.filter(id => id !== songId));
    if (songObj) setAllSongs(prev =>
      prev.find(s => String(s.SongID) === String(songId)) ? prev : [...prev, songObj]);
  };


  const getFinalTracks = () =>
    tracks.filter(songId => !toRemove.includes(songId));


  const handleSongUpload = async ({ title, audioFile, genreIds }) => {
    setSongUploadError("");
    setIsUploadingSong(true);
    try {
      if (!title.trim()) throw new Error("Song title is required.");
      if (!audioFile) throw new Error("Audio file required.");
      if (!genreIds || !genreIds.length) throw new Error("Choose a genre.");

      // Upload audio
      const audioForm = new FormData();
      audioForm.append("audio", audioFile);
      audioForm.append("type", "song_audio");
      const audioRes = await fetch(`${API_BASE_URL}/media`, { method: "POST", body: audioForm });
      if (!audioRes.ok) throw new Error("Audio upload failed");
      const audioData = await audioRes.json();

      // Create the Song: Send GenreIDs as an array (matching backend expectations)
      const songRes = await fetch(`${API_BASE_URL}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Title: title.trim(),
          ArtistID: album.artist_id || album.ArtistID,
          GenreIDs: genreIds,
          audio_media_id: audioData.mediaId
        })
      });
      if (!songRes.ok) throw new Error("Failed to create song");
      const songData = await songRes.json();

      // Add to album's tracks
      addTrack(songData.SongID, songData);
      setShowSongModal(false);
      setSongUploadError("");
    } catch (e) {
      setSongUploadError(e.message || "Failed to add song to album.");
    } finally {
      setIsUploadingSong(false);
    }
  };


  const handleSongModalClose = () => {
    setShowSongModal(false);
    setSongUploadError("");
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (title.trim() === "") throw new Error("Title is required.");
      const patchData = {
        Title: title.trim(),
        Description: description,
        cover_media_id: album.cover_media_id || null
      };
      if (coverFile) {
        const form = new FormData();
        form.append("image", coverFile);
        form.append("type", "album_cover");
        const coverRes = await fetch(`${API_BASE_URL}/media`, {
          method: "POST", body: form,
        });
        if (!coverRes.ok) {
          const err = await coverRes.json();
          throw new Error(err.error || "Failed to upload cover image");
        }
        const data = await coverRes.json();
        patchData.cover_media_id = data.mediaId || null;
      }
      const patchRes = await fetch(`${API_BASE_URL}/albums/${album.AlbumID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData)
      });
      if (!patchRes.ok) {
        const err = await patchRes.json();
        throw new Error(err.error || "Failed to update album");
      }
      await fetch(`${API_BASE_URL}/albums/${album.AlbumID}/tracks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackSongIds: getFinalTracks() }),
      });
      onSuccess(); onClose();
    } catch (e) {
      setError(e.message || "Failed to update album.");
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!isOpen || !album) return null;


  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content edit-album-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Edit Album</h2>
            <button className="modal-close-btn" onClick={onClose} disabled={isSubmitting}>×</button>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body">
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label htmlFor="album-title">Album Title</label>
                <input
                  id="album-title"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="album-desc">Description</label>
                <textarea
                  id="album-desc"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="album-cover">Cover Image</label>
                <div className="file-upload-area">
                  {coverPreview && (
                    <div className="cover-preview">
                      <img src={coverPreview} alt="Cover preview" />
                    </div>
                  )}
                  <input
                    id="album-cover"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    disabled={isSubmitting}
                    className="file-input"
                  />
                  <label htmlFor="album-cover" className="file-label">
                    {coverFile ? coverFile.name : "Choose new cover image"}
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Album Tracks</label>
                <div className="edit-tracks-list">
                  {tracks.map(songId => {
                    const song = allSongs.find(s => s.SongID === songId);
                    if (!song) return null;
                    const isMarked = toRemove.includes(song.SongID);
                    return (
                      <div key={song.SongID} className="edit-track-song" style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                        <span>
                          {song.Title}
                          {isMarked && (
                            <span style={{ color: "#D45D94", fontWeight: 700, fontSize: "1.2em", marginLeft: 6 }} aria-label="Marked for removal">✓</span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="btn-remove-track"
                          style={{
                            marginLeft: 8,
                            background: isMarked ? "#f6d6e0" : "#fff",
                            color: isMarked ? "#b04495" : "#895674",
                            border: isMarked ? "1.5px solid #b04495" : "1.5px solid #ad7d9b",
                            borderRadius: 7,
                            fontWeight: 600,
                            padding: "3px 11px",
                            cursor: "pointer",
                            fontSize: "0.95rem"
                          }}
                          onClick={() => toggleRemoveTrack(song.SongID)}
                          disabled={isSubmitting}
                        >
                          {isMarked ? "Marked" : "Remove from Album"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="tracks-help-text">Click <b>Remove from Album</b> to mark for removal (checkmark shows marked). Upload new songs below.</div>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                className="btn-add-song"
                style={{
                  width: "100%", margin: "15px 0 7px", fontSize: "1rem",
                  padding: "10px 0", borderRadius: "7px", border: "2px solid #895674",
                  background: "#fffafc", fontWeight: 700, color: "#782355", cursor: "pointer"
                }}
                onClick={() => { setShowSongModal(true); setSongUploadError(""); }}
              >
                + Upload and Add New Song
              </button>
              {songUploadError && <div className="error-message">{songUploadError}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn-submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
          {showSongModal && (
            <SongUploadModal
              onSuccess={handleSongUpload}
              onClose={handleSongModalClose}
              errorMsg={songUploadError}
              isSubmitting={isUploadingSong}
            />
          )}
        </div>
      </div>
    </>
  );
}
