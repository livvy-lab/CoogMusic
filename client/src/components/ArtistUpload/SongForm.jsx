import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function SongForm() {
  const [title, setTitle] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [genreId, setGenreId] = useState("");
  const [explicit, setExplicit] = useState(false);
  const [trackNumber, setTrackNumber] = useState("");
  const [audio, setAudio] = useState(null);
  const [genres, setGenres] = useState([]);
  const [result, setResult] = useState(null);
  const [artistId, setArtistId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      const id =
        stored?.artistId ??
        stored?.ArtistID ??
        stored?.artistID ??
        stored?.artist?.ArtistID ??
        stored?.artist?.id ??
        null;
      if (id) setArtistId(Number(id));
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchGenres() {
      try {
        const r = await fetch(`${API_BASE}/genres`);
        if (!r.ok) throw new Error("Failed to fetch genres");
        const data = await r.json();
        if (!cancelled) setGenres(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setGenres([]);
      }
    }
    fetchGenres();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResult(null);

    if (!artistId || !Number.isFinite(Number(artistId)) || Number(artistId) <= 0) {
      setError("No artist ID found. Log in as an artist again.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!audio) {
      setError("Select an audio file.");
      return;
    }

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("artistId", String(artistId));
    if (albumId) fd.append("albumId", String(albumId));
    if (genreId) fd.append("genreId", String(genreId));
    if (trackNumber) fd.append("trackNumber", String(trackNumber));
    fd.append("explicit", explicit ? "1" : "0");
    fd.append("audio", audio, audio.name || "upload");

    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/upload/song`, { method: "POST", body: fd });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!r.ok) {
        setError(data?.error || r.statusText || "Upload failed");
        return;
      }
      setResult(data);
      setSuccess(`Uploaded “${title.trim()}” successfully.`);
      setTitle("");
      setAlbumId("");
      setGenreId("");
      setTrackNumber("");
      setExplicit(false);
      setAudio(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e2) {
      setError(e2.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 bg-white p-6 rounded-xl shadow-md max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold">Upload New Song</h2>

      {error ? <div className="text-red-600 text-sm">{error}</div> : null}
      {success ? <div className="text-green-600 text-sm">{success}</div> : null}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="border rounded px-3 py-2"
        required
      />

      <input
        value={albumId}
        onChange={(e) => setAlbumId(e.target.value)}
        placeholder="AlbumID (optional)"
        className="border rounded px-3 py-2"
        inputMode="numeric"
      />

      <select
        value={genreId}
        onChange={(e) => setGenreId(e.target.value)}
        className="border rounded px-3 py-2"
      >
        <option value="">Select Genre (optional)</option>
        {genres.map((g) => (
          <option key={g.GenreID} value={g.GenreID}>
            {g.Name}
          </option>
        ))}
      </select>

      <input
        value={trackNumber}
        onChange={(e) => setTrackNumber(e.target.value)}
        placeholder="Track # (optional)"
        className="border rounded px-3 py-2"
        inputMode="numeric"
      />

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={explicit}
          onChange={(e) => setExplicit(e.target.checked)}
        />
        Explicit
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={(e) => setAudio(e.target.files?.[0] || null)}
      />

      <button
        type="submit"
        disabled={submitting}
        className={`${submitting ? "opacity-60 cursor-not-allowed" : "hover:bg-purple-700"} bg-purple-600 text-white py-2 rounded`}
      >
        {submitting ? "Uploading..." : "Upload Song"}
      </button>
    </form>
  );
}
