import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./NewReleases.css";
import { usePlayer } from "../../context/PlayerContext.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function NewReleases({ title = "New releases" }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const railRef = useRef(null);
  const { playSong } = usePlayer();

  const scrollByPage = (dir) => {
    const rail = railRef.current;
    if (!rail) return;
    const page = rail.clientWidth * 0.95;
    rail.scrollBy({ left: dir * page, behavior: "smooth" });
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/songs/latest?limit=10`);
        const data = await res.json();
        setSongs(Array.isArray(data) ? data : []);
      } catch {
        setSongs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function resolveUrl(song) {
    if (song?.url) return song.url;
    try {
      const r = await fetch(`${API_BASE}/songs/${encodeURIComponent(song.SongID)}/stream`);
      if (!r.ok) return null;
      const j = await r.json();
      return j?.url ?? null;
    } catch {
      return null;
    }
  }

  async function handlePlay(song) {
    const url = await resolveUrl(song);
    if (!url) return;
    playSong({
      SongID: song.SongID,
      Title: song.Title,
      ArtistName: song.ArtistName || song.Artist || "Unknown Artist",
      url,
      DurationSeconds: song.DurationSeconds ?? undefined,
    });
  }

  const totalSlots = 10;
  const realCards = songs.map((s) => ({
    key: String(s.SongID ?? s.songId ?? `${s.Title}-${s.ArtistID ?? s.artistId ?? Math.random()}`),
    song: s,
    img:
      s.coverUrl ||
      `https://placehold.co/600x600/AF578A/ffffff?text=${encodeURIComponent(s.Title || "Song")}`,
    alt: s.Title || "Song",
    title: s.Title || "Untitled",
    artistName: s.ArtistName || s.artistName || s.Artist || "Unknown Artist",
    artistId: s.ArtistID ?? s.artistId ?? s.ArtistId ?? null,
    placeholder: false,
  }));

  const placeholders = Array(Math.max(0, totalSlots - realCards.length))
    .fill(null)
    .map((_, i) => ({
      key: `ph-${i}`,
      song: null,
      img: "https://placehold.co/600x600/FFE8F5/895674?text=Coming+Soon",
      alt: "Coming Soon",
      title: "Coming Soon",
      artistName: "—",
      artistId: null,
      placeholder: true,
    }));

  const cards = loading ? [] : [...realCards, ...placeholders];

  return (
    <section className="newRel newRel--polaroid">
      <h2 className="newRel__title">{title}</h2>

      <div className="newRel__rail" ref={railRef}>
        {loading ? (
          Array(5)
            .fill(0)
            .map((_, i) => (
              <div className="newRel__card placeholder" key={`sk-${i}`}>
                <img
                  className="newRel__img"
                  src="https://placehold.co/600x600/f4d6e6/ffffff?text=Loading..."
                  alt="Loading"
                />
                <div className="newRel__meta">
                  <div className="newRel__song">Loading…</div>
                  <div className="newRel__artist"> </div>
                </div>
              </div>
            ))
        ) : (
          cards.map((c) => (
            <div
              className={`newRel__card ${c.placeholder ? "placeholder" : ""}`}
              key={c.key}
              // ⬇ no onClick here – so links inside can navigate freely
              role={c.placeholder ? undefined : "group"}
              tabIndex={c.placeholder ? -1 : 0}
            >
              {/* Clicking image plays */}
              <img
                className="newRel__img"
                src={c.img}
                alt={c.alt}
                onClick={() => c.song && handlePlay(c.song)}
                onKeyDown={(e) => {
                  if (!c.song) return;
                  if (e.key === "Enter" || e.key === " ") handlePlay(c.song);
                }}
                role={c.placeholder ? undefined : "button"}
                tabIndex={c.placeholder ? -1 : 0}
                aria-label={c.song ? `Play ${c.title} by ${c.artistName}` : undefined}
              />

              <div className="newRel__meta">
                {/* (Optional) make the title click-to-play as well */}
                <div
                  className="newRel__song"
                  onClick={() => c.song && handlePlay(c.song)}
                  onKeyDown={(e) => {
                    if (!c.song) return;
                    if (e.key === "Enter" || e.key === " ") handlePlay(c.song);
                  }}
                  role={c.placeholder ? undefined : "button"}
                  tabIndex={c.placeholder ? -1 : 0}
                >
                  {c.title}
                </div>

                {/* Artist name links to profile */}
                {c.artistId ? (
                  <Link
                    to={`/artist/${c.artistId}`}
                    className="newRel__artistLink"
                  >
                    {c.artistName}
                  </Link>
                ) : (
                  <div className="newRel__artist">{c.artistName}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="newRel__controls">
        <button onClick={() => scrollByPage(-1)}>‹</button>
        <button onClick={() => scrollByPage(1)}>›</button>
      </div>
    </section>
  );
}
