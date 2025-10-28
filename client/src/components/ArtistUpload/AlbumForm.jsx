import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AlbumForm.css";

export default function AlbumForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    artistId: "",
    releaseDate: "",
    description: ""
  });
  const [cover, setCover] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      const id = stored?.artistId ?? stored?.ArtistID ?? null;
      if (id) setFormData(data => ({ ...data, artistId: String(id) }));
    } catch {}
  }, []);

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
    if (!formData.title || !formData.artistId) {
      alert("Please fill in the required fields");
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

      // Then create the album
      const albumFormData = new FormData();
      albumFormData.append("title", formData.title);
      albumFormData.append("artistId", formData.artistId);
      albumFormData.append("description", formData.description);
      if (formData.releaseDate) {
        albumFormData.append("releaseDate", formData.releaseDate);
      }

      const uploadRes = await fetch("/upload/album", {
        method: "POST",
        body: albumFormData
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to create album");
      }

      const { albumId } = await uploadRes.json();

      // If we have a cover, associate it with the album
      if (coverMediaId) {
        const coverRes = await fetch(`/albums/${albumId}/cover`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId: coverMediaId })
        });

        if (!coverRes.ok) {
          console.error("Failed to associate cover with album:", coverMediaId);
        }
      }

      navigate(`/albums/${albumId}`);
    } catch (err) {
      console.error("Album creation failed:", err);
      alert("Failed to create album. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="album-form-container">
      <form onSubmit={handleSubmit} className="album-form">
        <div className="album-layout">
          {/* Left Side - Album Cover Upload */}
          <div className="album-cover-section">
            <div 
              className="album-cover-upload" 
              onClick={() => document.getElementById("coverInput").click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Cover preview" className="album-cover-preview" />
              ) : (
                <div className="album-cover-placeholder">
                  <div className="upload-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.6667 13.3333C11.7712 13.3333 12.6667 12.4379 12.6667 11.3333C12.6667 10.2288 11.7712 9.33333 10.6667 9.33333C9.56209 9.33333 8.66666 10.2288 8.66666 11.3333C8.66666 12.4379 9.56209 13.3333 10.6667 13.3333Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M6.66666 25.3333V22.6667L10.6667 18.6667L14.6667 22.6667L20 17.3333L25.3333 22.6667V25.3333M6.66666 25.3333H25.3333M6.66666 25.3333V6.66667H25.3333V25.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

            {/* Add Songs Section */}
            <div className="add-songs-section">
              <div className="add-songs-label">Add Songs</div>
              <button type="button" className="choose-tracks-btn">
                Choose from uploaded tracks
              </button>
            </div>
          </div>

          {/* Right Side - Album Details */}
          <div className="album-details-section">
            <div className="form-field">
              <label htmlFor="title">Album Title</label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter album title"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="releaseDate">Release Date</label>
              <input
                type="date"
                id="releaseDate"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label htmlFor="genre">Genre/Tags</label>
              <input
                type="text"
                id="genre"
                placeholder="Enter genres or tags"
              />
            </div>

            <div className="form-field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Write something about your album..."
                rows={3}
              />
            </div>

            <button type="submit" className="publish-button" disabled={loading}>
              {loading ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
