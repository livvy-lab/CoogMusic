import { useState } from "react";

export default function AlbumForm() {
  const [title, setTitle] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [cover, setCover] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [result, setResult] = useState(null);

  function addFiles(files) {
    const next = [...tracks];
    for (const f of files) next.push({ key: crypto.randomUUID(), file: f, title: f.name, genreId: "", explicit: false, duration: "" });
    setTracks(next);
  }
  function move(i, d) {
    const j = i + d; if (j < 0 || j >= tracks.length) return;
    const c = [...tracks]; [c[i], c[j]] = [c[j], c[i]]; setTracks(c);
  }
  function remove(i) { const c = [...tracks]; c.splice(i,1); setTracks(c); }
  function update(i, patch) { const c = [...tracks]; c[i] = { ...c[i], ...patch }; setTracks(c); }

  async function submit(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    if (releaseDate) fd.append("releaseDate", releaseDate);
    if (cover) fd.append("cover", cover);
    const order = tracks.map(t => t.key);
    fd.append("order", JSON.stringify(order));
    for (const t of tracks) {
      fd.append(t.key, t.file);
      fd.append(`${t.key}_meta`, JSON.stringify({ title: t.title, genreId: t.genreId || null, explicit: !!t.explicit, duration: t.duration }));
    }
    const r = await fetch("http://localhost:3001/upload/album-batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      body: fd
    });
    const data = await r.json();
    setResult(data);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Album title" />
      <input type="date" value={releaseDate} onChange={e=>setReleaseDate(e.target.value)} />
      <input type="file" accept="image/*" onChange={e=>setCover(e.target.files?.[0]||null)} />
      <input type="file" accept="audio/*" multiple onChange={e=>addFiles([...e.target.files])} />
      <div className="flex flex-col gap-2">
        {tracks.map((t,i)=>(
          <div key={t.key} className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={()=>move(i,-1)}>↑</button>
            <button type="button" onClick={()=>move(i,1)}>↓</button>
            <input value={t.title} onChange={e=>update(i,{title:e.target.value})} placeholder="Song title" />
            <input value={t.genreId} onChange={e=>update(i,{genreId:e.target.value})} placeholder="GenreID" />
            <label><input type="checkbox" checked={t.explicit} onChange={e=>update(i,{explicit:e.target.checked})}/> Explicit</label>
            <input value={t.duration} onChange={e=>update(i,{duration:e.target.value})} placeholder="mm:ss" />
            <button type="button" onClick={()=>remove(i)}>✕</button>
          </div>
        ))}
      </div>
      <button type="submit">Create Album</button>
      {result && <pre>{JSON.stringify(result,null,2)}</pre>}
    </form>
  );
}
