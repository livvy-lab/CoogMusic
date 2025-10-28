import { useState, useEffect } from "react";

export default function AlbumForm() {
  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [cover, setCover] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      const id = stored?.artistId ?? stored?.ArtistID ?? null;
      if (id) setArtistId(String(id));
    } catch {}
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    fd.append("artistId", artistId);
    if (releaseDate) fd.append("releaseDate", releaseDate);
    if (cover) fd.append("cover", cover);
    const r = await fetch("http://localhost:3001/upload/album", { method: "POST", body: fd });
    const data = await r.json();
    setResult(data);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Album title" />
      <input value={artistId} onChange={(e)=>setArtistId(e.target.value)} placeholder="ArtistID" />
      <input type="date" value={releaseDate} onChange={(e)=>setReleaseDate(e.target.value)} />
      <input type="file" accept="image/*" onChange={(e)=>setCover(e.target.files?.[0]||null)} />
      <button type="submit">Create album</button>
      {result && <pre>{JSON.stringify(result,null,2)}</pre>}
    </form>
  );
}
