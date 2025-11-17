import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [coverUrl, setCoverUrl] = useState(FALLBACK_COVER);

  useEffect(() => {
    let cancelled = false;
    async function resolveCover() {
      if (!song) {
        setCoverUrl(FALLBACK_COVER);
        return;
      }
      const explicit = song?.CoverURL || song?.CoverUrl || song?.coverUrl || song?.ArtworkURL || song?.ArtworkUrl || song?.ImageURL || song?.ImageUrl || song?.cover || null;
      if (explicit) {
        setCoverUrl(explicit);
        return;
      }
      const mediaId = song?.cover_media_id || song?.coverMediaId || song?.coverMediaID || song?.coverMedia || song?.coverMediaId || song?.coverId || song?.coverId;
      if (mediaId) {
        try {
          const r = await fetch(`${API_BASE_URL}/media/${mediaId}`);
          if (r.ok) {
            const j = await r.json();
            if (!cancelled && j?.url) { setCoverUrl(j.url); return; }
          }
        } catch (e) {}
      }
      const sid = song?.SongID || song?.songId || song?.SongId;
      if (sid) {
        try {
          const r = await fetch(`${API_BASE_URL}/songs/${sid}/stream`);
          if (r.ok) {
            const j = await r.json();
            const c = j?.coverUrl || j?.CoverURL || j?.Cover || null;
            if (!cancelled && c) { setCoverUrl(c); return; }
          }
        } catch (e) {}
      }
      if (!cancelled) setCoverUrl(FALLBACK_COVER);
    }

    resolveCover();
    return () => { cancelled = true; };
  }, [song]);

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
          <img src={coverUrl} alt={`${track} cover`} className="jam__cover" />
      </div>

      <div className="jam__meta">
        <div className="jam__song">{track}</div>
        
        <div className="jam__artist">
          {artistId != null && !loading && !error ? (
            <Link to={`/artist/${artistId}`}>{artistName}</Link>
          ) : (
            <span>{artistName}</span>
          )}
        </div>
      </div>

      <div className="jam__controls">
        <button
          className="jam__control jam__play"
          onClick={onPlayClick}
          aria-label={isShowingPause ? "Pause" : "Play"}
          disabled={!song || !!error || loading}
        >
          {isShowingPause ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect x="5" y="4" width="4" height="16" fill="currentColor" />
              <rect x="15" y="4" width="4" height="16" fill="currentColor" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M5 3v18l15-9L5 3z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}