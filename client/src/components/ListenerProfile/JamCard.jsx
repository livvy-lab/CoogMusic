import { useEffect, useState } from "react";
import { useFavPins } from "../../context/FavoritesPinsContext";
import { usePlayer } from "../../context/PlayerContext";
import "./JamCard.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const FALLBACK_COVER = "https://placehold.co/600x600/FFDDEE/895674?text=Album+Art";

export default function JamCard({ listenerId }) {
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const favCtx = useFavPins?.() || {};
  const pinnedSongId = favCtx.pinnedSongId ?? null;

  const { current, playing, playSong, toggle } = usePlayer();
  const isCurrentSong = current?.SongID === song?.SongID;
  const isShowingPause = isCurrentSong && playing;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    const id = listenerId || stored?.listenerId || stored?.ListenerID;
    if (!id) {
      setError("No listener ID found");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/listeners/${id}/profile`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSong(data?.favorites?.pinnedSong || null);
      } catch (e) {
        setError(e.message);
        setSong(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [listenerId, pinnedSongId]);

  function onPlayClick() {
    if (!song) return;
    if (isShowingPause) toggle();
    else playSong(song);
  }

  const title = "Current Jam";
  const cover = song?.CoverURL || FALLBACK_COVER;
  const track = loading
    ? "Loading…"
    : error
    ? "Error"
    : song
    ? song.Title || "Untitled"
    : "None pinned yet";
  const artist = loading
    ? ""
    : error
    ? error
    : song
    ? song.Artists || "Unknown Artist"
    : "Pin a song to show it here!";

  return (
    <aside className="jam">
      <div className="jam__header">
        <h3 className="jam__title">{title}</h3>
      </div>

      <div className="jam__artWrap">
        <img src={cover} alt={`${track} cover`} className="jam__cover" />
      </div>

      <div className="jam__meta">
        <div className="jam__song">{track}</div>
        <div className="jam__artist">{artist}</div>
      </div>

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
