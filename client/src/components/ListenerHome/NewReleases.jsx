// client/src/components/NewReleases/NewReleases.jsx
import { useEffect, useRef, useState } from "react";
import "./NewReleases.css";
import { usePlayer } from "../../context/PlayerContext.jsx";

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
        const res = await fetch("http://localhost:3001/songs/latest?limit=10");
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
    if (song?.url) return song.url; // if backend already includes it
    try {
      const r = await fetch(`http://localhost:3001/songs/${encodeURIComponent(song.SongID)}/stream`);
      if (!r.ok) return null;
      const j = await r.json();
      return j?.url ?? null;
    } catch {
      return null;
    }
  }

  async function handlePlayCard(song) {
    const url = await resolveUrl(song);
    if (!url) return;
    playSong({
      SongID: song.SongID,
      Title: song.Title,
      ArtistName: song.ArtistName || "Unknown Artist",
      url,
      DurationSeconds: song.DurationSeconds ?? undefined,
    });
  }

  const totalSlots = 10;
  const realCards = songs.map((s) => ({
    key: s.SongID,
    song: s,
    img: "https://placehold.co/600x600/AF578A/ffffff?text=" + encodeURIComponent(s.Title || "Song"),
    alt: s.Title || "Song",
    placeholder: false,
  }));
  const placeholders = Array(Math.max(0, totalSlots - realCards.length))
    .fill(null)
    .map((_, i) => ({
      key: `ph-${i}`,
      song: null,
      img: "https://placehold.co/600x600/FFE8F5/895674?text=Coming+Soon",
      alt: "Coming Soon",
      placeholder: true,
    }));
  const cards = loading ? [] : [...realCards, ...placeholders];

  return (
    <section className="newRel">
      <h2 className="newRel__title">{title}</h2>

      <div className="newRel__rail" ref={railRef}>
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div className="newRel__card placeholder" key={`sk-${i}`}>
              <img
                className="newRel__img"
                src="https://placehold.co/600x600/f4d6e6/ffffff?text=Loading..."
                alt="Loading"
              />
            </div>
          ))
        ) : (
          cards.map((c) => (
            <div
              className={`newRel__card ${c.placeholder ? "placeholder" : ""}`}
              key={c.key}
              onClick={() => c.song && handlePlayCard(c.song)}
              role={c.placeholder ? undefined : "button"}
              tabIndex={c.placeholder ? -1 : 0}
              onKeyDown={(e) => {
                if (!c.song) return;
                if (e.key === "Enter" || e.key === " ") handlePlayCard(c.song);
              }}
            >
              <img className="newRel__img" src={c.img} alt={c.alt} />
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
