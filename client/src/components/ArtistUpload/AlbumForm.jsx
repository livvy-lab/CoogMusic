import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";
import "./AlbumForm.css";
import SongUploadModal from "./SongUploadModal";




export default function AlbumForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    artistId: "",
    description: ""
  });
  const [tracks, setTracks] = useState([]); // {title, audioFile, genreIds, tempId}
  const [showSongUploadModal, setShowSongUploadModal] = useState(false);
  const [cover, setCover] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [notification, setNotification] = useState({ type: "", message: "" });




  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      const id = stored?.artistId ?? stored?.ArtistID ?? null;
      if (id) setFormData(data => ({ ...data, artistId: String(id) }));
    } catch {}
  }, []);




  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/genres`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAvailableGenres(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch genres:", err);
      }
    };
    fetchGenres();
  }, []);




  const handleCoverChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    // handle undefined MIME type by checking both type and extension
    const mimeType = selectedFile.type || "";
    const filename = selectedFile.name.toLowerCase();
    const validImageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];
    const hasValidExtension = validImageExtensions.some(ext => filename.endsWith(ext));
    
    if (!mimeType.startsWith("image/") && !hasValidExtension) {
      setNotification({ type: "error", message: "Please select a valid image file." });
      return;
    }
    
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    setCover(selectedFile);
  };




  const handleAddSong = (track) => {
    setTracks(tracks => [
      ...tracks,
      { ...track, tempId: Date.now() + Math.random() },
    ]);
    setShowSongUploadModal(false);
  };




  const handleRemoveSong = (tempId) => {
    setTracks(tracks.filter((t) => t.tempId !== tempId));
  };




  // Compute unique album genres as the set of all song genreIds
  const allAlbumGenres = useMemo(() => Array.from(
    new Set([].concat(...tracks.map(t => t.genreIds || [])))
  ), [tracks]);




  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotification({ type: "", message: "" });




    // Custom validation checks
    if (!formData.title.trim()) {
      setNotification({ type: "error", message: "Please enter an album title." });
      return;
    }
    if (!formData.artistId) {
      setNotification({ type: "error", message: "Artist ID missing. Please log in again." });
      return;
    }
    if (tracks.length === 0) {
      setNotification({ type: "error", message: "Please add at least one track to the album." });
      return;
    }
    // All checks passed, start loading
    setLoading(true);




    try {
      let coverMediaId = null;
      if (cover) {
        const coverFormData = new FormData();
        coverFormData.append("image", cover);
        const res = await fetch(`${API_BASE_URL}/upload/image`, {
          method: "POST",
          body: coverFormData,
        });
        if (!res.ok) throw new Error("Failed to upload cover image");
        const { mediaId } = await res.json();
        coverMediaId = mediaId;
        console.log("Cover uploaded with mediaId:", coverMediaId);
      }




      // Step 1: Upload all songs
      const uploadedTracks = [];
      for (let idx = 0; idx < tracks.length; idx++) {
        const { title, audioFile, genreIds = [] } = tracks[idx];
        const songFormData = new FormData();
        songFormData.append("title", title);
        songFormData.append("artistId", formData.artistId);
        songFormData.append("audio", audioFile);
        songFormData.append("genres", JSON.stringify(genreIds));
        
        // include coverMediaId with each song
        if (coverMediaId) {
          songFormData.append("coverMediaId", coverMediaId);
        }
        
        console.log(`Uploading song ${idx + 1}/${tracks.length}:`, title);
        console.log("   - artistId:", formData.artistId);
        console.log("   - audioFile:", audioFile?.name, audioFile?.type, audioFile?.size);
        console.log("   - genreIds:", genreIds);
        console.log("   - coverMediaId:", coverMediaId);
        
        const songRes = await fetch(`${API_BASE_URL}/upload/song`, {
          method: "POST",
          body: songFormData,
        });


        console.log(`Response status for song ${idx + 1}:`, songRes.status);
        
        if (!songRes.ok) {
          const errData = await songRes.json();
          console.error(`Song ${idx + 1} error response:`, errData);
          throw new Error(`Failed to upload song #${idx + 1}: ${title} - ${errData.error || songRes.statusText}`);
        }
        
        const song = await songRes.json();
        console.log(`Song ${idx + 1} uploaded:`, song);
        uploadedTracks.push({
          songId: song.songId,
          title,
          genreIds,
        });
      }




      const albumData = {
        title: formData.title,
        artistId: parseInt(formData.artistId),
        releaseDate: new Date().toISOString().split("T")[0],
        description: formData.description.trim(), // ← ADDED: Include description
        coverMediaId: coverMediaId,
        genres: allAlbumGenres,
        tracks: uploadedTracks.map((track, idx) => ({
          songId: track.songId,
          trackNumber: idx + 1,
        })),
      };

      console.log("Creating album with data:", albumData); // ← Added logging to verify


      const uploadRes = await fetch(`${API_BASE_URL}/albums`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(albumData),
      });




      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Failed to create album");
      }




      const { albumId } = await uploadRes.json();
      navigate(`/albums/${albumId}`);
    } catch (err) {
      console.error("Album creation failed:", err);
      setNotification({ type: "error", message: `Failed to create album: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };




  return (
    <>
      <div className="album-form-container">
        {notification.message && (
          <div className={`form-notification ${notification.type}`}>
            <span>{notification.message}</span>
            <button
              type="button"
              className="form-notification-close"
              onClick={() => setNotification({ type: "", message: "" })}
            >
              ×
            </button>
          </div>
        )}
        {/* Added noValidate to disable browser default validation popups */}
        <form onSubmit={handleSubmit} className="album-form" noValidate>
          <div className="album-layout">
            <div className="album-cover-section">
              <div
                className="album-cover-upload"
                onClick={() => document.getElementById("coverInput").click()}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Cover preview"
                    className="album-cover-preview"
                  />
                ) : (
                  <div className="album-cover-placeholder">
                    <div className="upload-icon">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path
                          d="M10.6667 13.3333C11.7712 13.3333 12.6667 12.4379 12.6667 11.3333C12.6667 10.2288 11.7712 9.33333 10.6667 9.33333C9.56209 9.33333 8.66666 10.2288 8.66666 11.3333C8.66666 12.4379 9.56209 13.3333 10.6667 13.3333Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M6.66666 25.3333V22.6667L10.6667 18.6667L14.6667 22.6667L20 17.3333L25.3333 22.6667V25.3333M6.66666 25.3333H25.3333M6.66666 25.3333V6.66667H25.3333V25.3333"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="upload-text">Upload Cover</span>
                  </div>
                )}
                <input
                  type="file"
                  id="coverInput"
                  accept="image/*"
                  onChange={handleCoverChange}
                  style={{ display: "none" }}
                />
              </div>
              <div className="add-songs-section">
                <div className="add-songs-label">Tracks ({tracks.length})</div>
                <div className="track-list">
                  {tracks.length === 0 && (
                    <div className="track-item-placeholder">No tracks added yet.</div>
                  )}
                  {tracks.map((track, index) => (
                    <div key={track.tempId} className="track-item">
                      <span>
                        {index + 1}. {track.title}
                        {track.genreIds && track.genreIds.length > 0 && (
                          <span style={{marginLeft:8, fontWeight:400, color:'#895674', fontSize:13}}>
                            (
                            {track.genreIds
                              .map(
                                gid =>
                                  (availableGenres.find(g => g.GenreID === gid) || {}).Name ||
                                  gid
                              )
                              .join(", ")}
                            )
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        className="track-item-remove"
                        onClick={() => handleRemoveSong(track.tempId)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="choose-tracks-btn"
                  onClick={() => setShowSongUploadModal(true)}
                  disabled={loading}
                >
                  Add new track
                </button>
              </div>
            </div>
            <div className="album-details-section">
              <div className="form-field">
                <label htmlFor="title">Album Title</label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter album title"
                />
              </div>
              <div className="form-field">
                <label>Genres</label>
                <div className="genre-grid" style={{margin: "8px 0 12px 0"}}>
                  {allAlbumGenres.length === 0 ? (
                    <div style={{ color: "#895674", fontStyle: "italic" }}>
                      None
                    </div>
                  ) : (
                    allAlbumGenres.map((genreId) => {
                      const genre = availableGenres.find((g) => g.GenreID === genreId);
                      return genre ? (
                        <span className="genre-tag selected" key={genreId}>
                          {genre.Name}
                        </span>
                      ) : null;
                    })
                  )}
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Write something about your album..."
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="publish-button"
                disabled={loading}
              >
                {loading ? "Publishing..." : "Publish Album"}
              </button>
            </div>
          </div>
        </form>
        {showSongUploadModal && (
          <SongUploadModal
            onSuccess={handleAddSong}
            onClose={() => setShowSongUploadModal(false)}
          />
        )}
      </div>
    </>
  );
}