import { useEffect, useState } from "react";
import "./SongForm.css";
import { API_BASE_URL } from "../../config/api";

export default function SongForm() {
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [genresList, setGenresList] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    genres: [],
    artists: [],
    artistId: "",
  });
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // load artistId from localStorage
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
        if (Array.isArray(data)) setGenresList(data);
      })
      .catch(err => console.error("Failed to fetch genres:", err));
  }, []);

  // handle genre checkbox change
  const handleGenreChange = (e) => {
    setSuccessMessage("");
    const genreId = Number(e.target.value);
    const isChecked = e.target.checked;
    setFormData(prevData => {
      const oldGenres = prevData.genres || [];
      let newGenres = isChecked
        ? [...oldGenres, genreId]
        : oldGenres.filter(id => id !== genreId);
      return { ...prevData, genres: newGenres };
    });
  };

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

  // reset form fields except artistId
  const resetForm = () => {
    setFile(null);
    setCover(null);
    setPreviewUrl(null);
    setFormData(data => ({
      ...data,
      title: "",
      genres: []
    }));
    document.getElementById("songInput").value = null;
    document.getElementById("coverInput").value = null;
  };

  // handle form submit (upload song and cover)
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
    if (formData.genres.length === 0) {
      alert("Please select at least one genre for the song.");
      return;
    }
    setLoading(true);
    try {
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
      const songFormData = new FormData();
      songFormData.append("audio", file);
      songFormData.append("title", formData.title);
      songFormData.append("artistId", formData.artistId);
      songFormData.append("genres", JSON.stringify(formData.genres));
      songFormData.append("genreId", formData.genres[0]);
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
      // associate cover with song
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
          {/* audio file upload box */}
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

          {/* cover image upload box */}
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

        {/* track title */}
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

        {/* genre checkboxes */}
        <div className="form-field">
          <label htmlFor="genre">Genre (Select all that apply)</label>
          <div className="genre-checkbox-group">
            {genresList.map(genre => (
              <div key={genre.GenreID} className="genre-checkbox-item">
                <input
                  type="checkbox"
                  id={`genre-${genre.GenreID}`}
                  value={genre.GenreID}
                  checked={formData.genres.includes(genre.GenreID)}
                  onChange={handleGenreChange}
                />
                <label htmlFor={`genre-${genre.GenreID}`}>{genre.Name}</label>
              </div>
            ))}
          </div>
        </div>

        {/* success message */}
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
