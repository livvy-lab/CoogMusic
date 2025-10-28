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
        {/* Album Details */}
        <div className="form-content">
          <div className="album-details">
            <div className="form-group">
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

            <div className="form-group">
              <label htmlFor="releaseDate">Release Date</label>
              <input
                type="date"
                id="releaseDate"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Write something about your album..."
                rows={4}
              />
            </div>
          </div>

          {/* Cover Upload */}
          <div className="cover-upload-section">
            <div className="cover-preview" onClick={() => document.getElementById("coverInput").click()}>
              {previewUrl ? (
                <img src={previewUrl} alt="Cover preview" className="cover-image" />
              ) : (
                <div className="cover-placeholder">
                  <i className="fas fa-image"></i>
                  <span>Add Album Cover</span>
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
          </div>
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? "Creating Album..." : "Create Album"}
        </button>
      </form>
    </div>
  );
}
