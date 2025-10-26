import { useEffect, useRef, useState } from "react";
import "./NewReleases.css";

export default function NewReleases({ title = "New releases" }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState({});
  const railRef = useRef(null);

  const scrollByPage = (dir) => {
    const rail = railRef.current;
    if (!rail) return;
    const page = rail.clientWidth * 0.95;
    rail.scrollBy({ left: dir * page, behavior: "smooth" });
  };

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("http://localhost:3001/songs/latest?limit=10");
        const data = await res.json();
        setSongs(Array.isArray(data) ? data : []);
      } catch {
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  async function handlePlay(songId) {
    try {
      const res = await fetch("http://localhost:3001/plays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setStreams((prev) => ({ ...prev, [songId]: Number(data.streams) || 0 }));
    } catch {}
  }

  const totalSlots = 10;
  const realCards = songs.map((s) => ({
    key: s.SongID,
    songId: s.SongID,
    img: "https://placehold.co/600x600/AF578A/ffffff?text=" + encodeURIComponent(s.Title || "Song"),
    alt: s.Title || "Song",
    placeholder: false,
  }));
  const placeholders = Array(Math.max(0, totalSlots - realCards.length))
    .fill(null)
    .map((_, i) => ({
      key: `ph-${i}`,
      songId: null,
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
          Array(5)
            .fill(0)
            .map((_, i) => (
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
              onClick={() => c.songId && handlePlay(c.songId)}
            >
              <img className="newRel__img" src={c.img} alt={c.alt} />
              {!c.placeholder && streams[c.songId] !== undefined && (
                <div className="newRel__badge">{streams[c.songId]} streams</div>
              )}
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
