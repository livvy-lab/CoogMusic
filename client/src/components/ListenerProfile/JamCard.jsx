import { useEffect, useState } from "react";
import "./JamCard.css";

export default function JamCard({ listenerId }) {
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fallbackCover = "https://placehold.co/600x600/FFDDEE/895674?text=Album+Art";

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    const id = listenerId || stored?.listenerId;
    if (!id) {
      setError("No listener ID found");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`http://localhost:3001/listeners/${id}/profile`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSong(data.favorites?.pinnedSong || null);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [listenerId]);

  const handleTogglePlay = () => setIsPlaying(p => !p);

  // derive text, but KEEP consistent structure
  const title  = "Current Jam";
  const cover  = song?.CoverURL || fallbackCover;     // always an <img>
  const track  = loading ? "Loading…" : error ? "Error" : song ? (song.Title || "Untitled") : "None pinned yet";
  const artist = loading ? "" : error ? error : song ? (song.Artists || "Unknown Artist") : "Pin a song to show it here!";

  return (
    <aside className="jam">
      <div className="jam__header">
        <h3 className="jam__title">{title}</h3>
      </div>

      {/* Volume button OUTSIDE album art */}
      <button className="jam__volume" aria-label="Volume">🔊</button>

      {/* Album art: always render an <img> to keep size */}
      <div className="jam__artWrap">
        <img
          src={cover}
          alt={`${track} cover`}
          className="jam__cover"
        />
      </div>

      {/* Song details */}
      <div className="jam__meta">
        <div className="jam__song">{track}</div>
        <div className="jam__artist">{artist}</div>
      </div>

      {/* Player controls */}
      <div className="jam__controls">
        <button
          className="jam__control jam__play"
          onClick={handleTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          disabled={!song || !!error || loading}
        >
          {isPlaying ? "⏸" : "▶️"}
        </button>
      </div>
    </aside>
  );
}
