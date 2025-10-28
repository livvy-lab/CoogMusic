import { useEffect, useState } from "react";
import { useFavPins } from "../../context/FavoritesPinsContext";
import { API_BASE_URL } from "../../config/api";
import "./JamCard.css";
import { usePlayer } from "../../context/PlayerContext"; // adjust path if needed

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const FALLBACK_COVER =
  "https://placehold.co/600x600/FFDDEE/895674?text=Album+Art";

export default function JamCard({ listenerId }) {
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Listen for pin changes so the Current Jam updates immediately
  const favCtx = useFavPins?.() || {};
  const pinnedSongId = favCtx.pinnedSongId ?? null;

  const fallbackCover = "https://placehold.co/600x600/FFDDEE/895674?text=Album+Art";

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    const id = listenerId || stored?.listenerId || stored?.ListenerID;
    if (!id) {
      setError("No listener ID found");
      setLoading(false);
      return;
    }

    // Fetch profile (includes favorites.pinnedSong). We re-run when listenerId
    // or the global pinnedSongId changes so the UI stays in sync after pin ops.
    (async () => {
      try {
        setLoading(true);
        setError(null);
  const res = await fetch(`${API_BASE_URL}/listeners/${id}/profile`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Expecting favorites.pinnedSong to include at least { SongID, Title, Artists, CoverURL }
        const pinned = data?.favorites?.pinnedSong || null;
        setSong(pinned);
      } catch (e) {
        setError(e.message);
        setSong(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [listenerId, pinnedSongId]);



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

      {/* Album art */}
      <div className="jam__artWrap">
        <img src={cover} alt={`${track} cover`} className="jam__cover" />
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
          onClick={onPlayClick}
          aria-label={isShowingPause ? "Pause" : "Play"}
          disabled={!song || !!error || loading}
        >
          {isShowingPause ? "⏸" : "▶️"}
        </button>
      </div>
    </aside>
  );
}
