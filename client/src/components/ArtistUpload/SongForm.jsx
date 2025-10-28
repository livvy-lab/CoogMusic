import { useState } from "react";
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
    explicit: false
  });
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

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
      songFormData.append("file", file);
      songFormData.append("title", formData.title);
      songFormData.append("description", formData.description);
      songFormData.append("genres", JSON.stringify(formData.genres));
      songFormData.append("artists", JSON.stringify(formData.artists));
      songFormData.append("explicit", formData.explicit);

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
      <form onSubmit={handleSubmit} className="song-form">
        <div className="form-content">
          <div className="upload-grid">
            {/* Cover Upload */}
            <div className="upload-section">
              <div className="upload-box">
                <div 
                  className="upload-button" 
                  onClick={() => document.getElementById("coverInput").click()}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Cover preview" className="cover-preview" />
                  ) : (
                    <div className="upload-placeholder">
                      <i className="fas fa-image fa-2x"></i>
                      <span>Click to browse</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="coverInput"
                  accept="image/*"
                  onChange={handleCoverChange}
                  style={{ display: "none" }}
                />
                {cover && (
                  <div className="file-name">
                    {cover.name}
                  </div>
                )}
                <button 
                  type="button" 
                  className="card-submit-button" 
                  onClick={() => document.getElementById("coverInput").click()}
                >
                  Add Cover Image
                </button>
              </div>
            </div>

            {/* Song Upload */}
            <div className="upload-section">
              <div className="upload-box">
                <div 
                  className="upload-button" 
                  onClick={() => document.getElementById("songInput").click()}
                >
                  <div className="upload-placeholder">
                    <i className="fas fa-music fa-2x"></i>
                    <span>Click to browse</span>
                  </div>
                </div>
                <input
                  type="file"
                  id="songInput"
                  accept="audio/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                {file && (
                  <div className="file-name">
                    {file.name}
                  </div>
                )}
                <button 
                  type="button" 
                  className="card-submit-button" 
                  onClick={() => document.getElementById("songInput").click()}
                >
                  Choose Song
                </button>
              </div>
            </div>
          </div>

          {/* Song Details */}
          <div className="song-details">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Song title"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Write something about your song..."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.explicit}
                  onChange={(e) => setFormData({ ...formData, explicit: e.target.checked })}
                />
                <span>Explicit Content</span>
              </label>
            </div>
          </div>
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? "Uploading..." : "Upload Song"}
        </button>
      </form>
    </div>
  );
}