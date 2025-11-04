import { useEffect, useState } from "react";
import "./SongForm.css";
import { API_BASE_URL } from "../../config/api";

export default function SongForm() {
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);

  const [genresList, setGenresList] = useState([]);
  const [isGenreOpen, setIsGenreOpen] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    genreId: "",
    artists: [],
    artistId: "",
  });
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // load artist id from localstorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      const id = stored?.artistId ?? stored?.ArtistID ?? null;
      if (id) setFormData(data => ({ ...data, artistId: String(id) }));
    } catch {}
  }, []);

  // fetch genres on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/genres`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGenresList(data);
        }
      })
      .catch(err => console.error("Failed to fetch genres:", err));
  }, []);

  const selectedGenreName = genresList.find(
    g => g.GenreID === formData.genreId
  )?.Name;

  // handle audio file selection
  const handleFileChange = (e) => {
    setSuccessMessage("");
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("audio/")) {
      alert("Please select an audio file");
      return;
    }
    setFile(selectedFile);
  };

  // handle cover image selection
  const handleCoverChange = (e) => {
    setSuccessMessage("");
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    setCover(selectedFile);
  };

  // reset the form fields and uploaded files
  const resetForm = () => {
    setFile(null);
    setCover(null);
    setPreviewUrl(null);
    setFormData(data => ({
      ...data,
      title: "",
      genreId: ""
    }));
    setIsGenreOpen(false);
    document.getElementById("songInput").value = null;
    document.getElementById("coverInput").value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");

    if (!file) {
      alert("Please select an audio file");
      return;
    }
    if (!formData.artistId) {
      alert("Missing artist account. Please log in as an artist and try again.");
      return;
    }
    if (!formData.title) {
      alert("Please enter a title for the song.");
      return;
    }
    if (!formData.genreId) {
      alert("Please select a genre for the song.");
      return;
    }
    setLoading(true);

    try {
      // first upload cover image if provided
      let coverMediaId = null;
      if (cover) {
        const formData = new FormData();
        formData.append("image", cover);
        const res = await fetch(`${API_BASE_URL}/media`, {
          method: "POST",
          body: formData
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Failed to upload cover image" }));
          throw new Error(`Cover upload failed: ${errData.error}`);
        }

        const { mediaId } = await res.json();
        coverMediaId = mediaId;
      }

      // upload the song file and song data
      const songFormData = new FormData();
      songFormData.append("audio", file);
      songFormData.append("title", formData.title);
      songFormData.append("artistId", formData.artistId);
      songFormData.append("genreId", formData.genreId);
      songFormData.append("artists", JSON.stringify(formData.artists));

      const uploadRes = await fetch(`${API_BASE_URL}/upload/song`, {
        method: "POST",
        body: songFormData
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({ error: "Failed to upload song. Server response unreadable." }));
        throw new Error(errData.error || "Failed to upload song");
      }

      const { songId } = await uploadRes.json();

      // associate cover with song if any
      if (coverMediaId) {
        const coverRes = await fetch(`${API_BASE_URL}/songs/${songId}/cover`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId: coverMediaId })
        });

        if (!coverRes.ok) {
          console.error("Failed to associate cover with song:", coverMediaId);
        }
      }

      setSuccessMessage(`Successfully uploaded "${formData.title}"!`);
      resetForm();

    } catch (err) {
      console.error("Upload failed:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="song-form-container">
      <p className="upload-subtitle">Choose an audio file and enter the details below to upload your track</p>
      <form onSubmit={handleSubmit} className="song-form">
        <div className="upload-boxes-row">
          {/* audio file upload */}
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
              name="audio"
              accept="audio/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          {/* cover image upload */}
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
                  Select cover image
                </button>
              </>
            )}
            {cover && !previewUrl && <div className="file-selected">{cover.name}</div>}
            <input
              type="file"
              id="coverInput"
              name="image"
              accept="image/*"
              onChange={handleCoverChange}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {/* track title input */}
        <div className="form-field">
          <label htmlFor="title">Track Title</label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.target.value });
              setSuccessMessage("");
            }}
            placeholder="Song title"
            required
          />
        </div>

        {/* genre dropdown */}
        <div className="form-field">
          <label htmlFor="genre">Genre</label>
          <div className="custom-select-container">
            <div 
              className="custom-select-trigger"
              onClick={() => setIsGenreOpen(!isGenreOpen)}
              tabIndex="0"
            >
              {selectedGenreName || "Select Genre"}
            </div>
            {isGenreOpen && (
              <div className="custom-select-options">
                {genresList.map(genre => (
                  <div 
                    key={genre.GenreID}
                    className={`custom-select-option ${formData.genreId === genre.GenreID ? 'selected' : ''}`}
                    onClick={() => {
                      setFormData({ ...formData, genreId: genre.GenreID });
                      setIsGenreOpen(false);
                      setSuccessMessage("");
                    }}
                  >
                    {genre.Name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* success message if upload succeeded */}
        {successMessage && (
          <div className="upload-success-message">
            {successMessage}
          </div>
        )}

        {/* upload button */}
        <button type="submit" className="upload-submit-button" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
