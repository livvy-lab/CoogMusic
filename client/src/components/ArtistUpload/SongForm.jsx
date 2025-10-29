import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SongForm.css";

export default function SongForm() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genres: [],
    artists: [],
    artistId: "",
    explicit: false
  });
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Load artistId from localStorage when available (artist-only page is already guarded)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      const id = stored?.artistId ?? stored?.ArtistID ?? null;
      if (id) setFormData(data => ({ ...data, artistId: String(id) }));
    } catch {}
  }, []);

  // Handle audio file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("audio/")) {
      alert("Please select an audio file");
      return;
    }
    setFile(selectedFile);
  };

  // Handle cover image selection
  const handleCoverChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Create preview URL for image
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    setCover(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select an audio file");
      return;
    }
    if (!formData.artistId) {
      alert("Missing artist account. Please log in as an artist and try again.");
      return;
    }
    setLoading(true);

    try {
      // First upload the cover image if provided
      let coverMediaId = null;
      if (cover) {
        const formData = new FormData();
        formData.append("image", cover);
        const res = await fetch("/media", {
          method: "POST",
          body: formData
        });
        
        if (!res.ok) {
          throw new Error("Failed to upload cover image");
        }

        const { mediaId } = await res.json();
        coverMediaId = mediaId;
      }

      // Then upload the song
      const songFormData = new FormData();
      // Backend expects field name 'audio' (not 'file')
      songFormData.append("audio", file);
      songFormData.append("title", formData.title);
      songFormData.append("description", formData.description);
      songFormData.append("genres", JSON.stringify(formData.genres));
      songFormData.append("artists", JSON.stringify(formData.artists));
      songFormData.append("explicit", formData.explicit);
      if (formData.artistId) {
        songFormData.append("artistId", formData.artistId);
      }

      const uploadRes = await fetch("/upload/song", {
        method: "POST",
        body: songFormData
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload song");
      }

      const { songId } = await uploadRes.json();

      // If we have a cover, associate it with the song
      if (coverMediaId) {
        const coverRes = await fetch(`/songs/${songId}/cover`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId: coverMediaId })
        });

        if (!coverRes.ok) {
          console.error("Failed to associate cover with song:", coverMediaId);
        }
      }

      navigate(`/songs/${songId}`);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload song. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="song-form-container">
      <p className="upload-subtitle">Choose an audio file and enter the details below to upload your track</p>
      
      <form onSubmit={handleSubmit} className="song-form">
        <div className="upload-boxes-row">
          {/* Audio File Upload */}
          <div 
            className="upload-box" 
            onClick={() => document.getElementById("songInput").click()}
          >
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 16V32M24 16L18 22M24 16L30 22M40 24C40 32.8366 32.8366 40 24 40C15.1634 40 8 32.8366 8 24C8 15.1634 15.1634 8 24 8C32.8366 8 40 15.1634 40 24Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <button type="button" className="select-button">
              Select audio file
            </button>
            {file && <div className="file-selected">{file.name}</div>}
            <input
              type="file"
              id="songInput"
              accept="audio/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          {/* Cover Image Upload */}
          <div 
            className="upload-box" 
            onClick={() => document.getElementById("coverInput").click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Cover preview" className="cover-preview-img" />
            ) : (
              <>
                <div className="upload-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 20C17.6569 20 19 18.6569 19 17C19 15.3431 17.6569 14 16 14C14.3431 14 13 15.3431 13 17C13 18.6569 14.3431 20 16 20Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M10 38V34L16 28L22 34L30 26L38 34V38M10 38H38M10 38V10H38V38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <button type="button" className="select-button">
                  Select audio picture
                </button>
              </>
            )}
            {cover && !previewUrl && <div className="file-selected">{cover.name}</div>}
            <input
              type="file"
              id="coverInput"
              accept="image/*"
              onChange={handleCoverChange}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {/* Track Title */}
        <div className="form-field">
          <label htmlFor="title">Track Title</label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Song title"
            required
          />
        </div>

        {/* Description */}
        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Write something about your song..."
            rows={4}
          />
        </div>

        {/* Explicit Content */}
        <div className="checkbox-field">
          <input
            type="checkbox"
            id="explicit"
            checked={formData.explicit}
            onChange={(e) => setFormData({ ...formData, explicit: e.target.checked })}
          />
          <label htmlFor="explicit">Explicit Content</label>
        </div>

        {/* Upload Button */}
        <button type="submit" className="upload-submit-button" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}