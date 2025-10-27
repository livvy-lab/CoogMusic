import { useState } from "react";

export default function SongForm() {
  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [genreId, setGenreId] = useState("");
  const [explicit, setExplicit] = useState(false);
  const [trackNumber, setTrackNumber] = useState("");
  const [audio, setAudio] = useState(null);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    fd.append("artistId", artistId);
    if (albumId) fd.append("albumId", albumId);
    if (genreId) fd.append("genreId", genreId);
    if (trackNumber) fd.append("trackNumber", trackNumber);
    fd.append("explicit", explicit ? "1" : "0");
    if (audio) fd.append("audio", audio);
    const r = await fetch("http://localhost:3001/upload/song", { method: "POST", body: fd });
    const data = await r.json();
    setResult(data);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Song title" />
      <input value={artistId} onChange={(e)=>setArtistId(e.target.value)} placeholder="ArtistID" />
      <input value={albumId} onChange={(e)=>setAlbumId(e.target.value)} placeholder="AlbumID (optional)" />
      <input value={genreId} onChange={(e)=>setGenreId(e.target.value)} placeholder="GenreID (optional)" />
      <input value={trackNumber} onChange={(e)=>setTrackNumber(e.target.value)} placeholder="Track # (optional)" />
      <label><input type="checkbox" checked={explicit} onChange={(e)=>setExplicit(e.target.checked)} /> Explicit</label>
      <input type="file" accept="audio/*" onChange={(e)=>setAudio(e.target.files?.[0]||null)} />
      <button type="submit">Upload song</button>
      {result && <pre>{JSON.stringify(result,null,2)}</pre>}
    </form>
  );
}
