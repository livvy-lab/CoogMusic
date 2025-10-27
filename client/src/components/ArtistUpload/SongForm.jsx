import { useState } from "react";

export default function SongForm() {
  const [title, setTitle] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [genreId, setGenreId] = useState("");
  const [explicit, setExplicit] = useState(false);
  const [duration, setDuration] = useState("");
  const [audio, setAudio] = useState(null);
  const [songId, setSongId] = useState(null);
  const token = localStorage.getItem("token") || "";

  async function submit(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    if (albumId) fd.append("albumId", albumId);
    if (genreId) fd.append("genreId", genreId);
    fd.append("explicit", explicit ? "1" : "0");
    if (duration) fd.append("duration", duration);
    if (audio) fd.append("audio", audio);
    const r = await fetch("http://localhost:3001/upload/song", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await r.json();
    setSongId(data.songId || null);
  }

  async function deleteSong() {
    if (!songId) return;
    await fetch(`http://localhost:3001/upload/song/${songId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setSongId(null);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Song title" />
      <input value={albumId} onChange={e=>setAlbumId(e.target.value)} placeholder="AlbumID (optional)" />
      <input value={genreId} onChange={e=>setGenreId(e.target.value)} placeholder="GenreID (optional)" />
      <label><input type="checkbox" checked={explicit} onChange={e=>setExplicit(e.target.checked)} /> Explicit</label>
      <input value={duration} onChange={e=>setDuration(e.target.value)} placeholder="mm:ss" />
      <input type="file" accept="audio/*" onChange={e=>setAudio(e.target.files?.[0]||null)} />
      <button type="submit">Upload</button>
      {songId && <button type="button" onClick={deleteSong}>Delete This Song</button>}
    </form>
  );
}
