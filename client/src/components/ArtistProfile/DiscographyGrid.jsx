import "./DiscographyGrid.css";
import { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function Discography() {
  const scrollRef = useRef(null);
  const { artistId } = useParams();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === "left" ? -clientWidth / 2 : clientWidth / 2;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  useEffect(() => {
    if (!artistId) {
      setAlbums([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/artists/${artistId}/discography`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Failed to load discography (${res.status})`);
        const data = await res.json();
        setAlbums(Array.isArray(data.albums) ? data.albums : []);
      } catch (err) {
        console.error("Discography fetch error:", err);
        setError("Could not load discography.");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [artistId]);

  // ──────────────── UI STATES ────────────────
  const renderCards = () => {
    if (loading) {
      return Array(4).fill(0).map((_, i) => (
        <div key={`ph-${i}`} className="nr__card placeholder">
          <div className="nr__img" />
        </div>
      ));
    }

    if (error) {
      return (
        <div className="nr__empty">
          ⚠️ {error}
        </div>
      );
    }

    if (!albums.length) {
      return (
        <div className="nr__empty">
          🎵 No albums yet 🎵
        </div>
      );
    }

    return albums.map((album) => (
      <div key={album.AlbumID} className="nr__card">
        <div className="nr__img" style={{ backgroundColor: "#d7b5c6" }} />
        <p className="nr__caption">
          {album.Title || "Untitled"}<br />
          <span className="nr__year">
            {album.ReleaseDate ? new Date(album.ReleaseDate).getFullYear() : "—"}
          </span>
        </p>
      </div>
    ));
  };

  // ──────────────── MAIN RENDER ────────────────
  return (
    <section className="nr">
      <h2 className="nr__title">Discography</h2>

      <div className="nr__rail" ref={scrollRef}>
        {renderCards()}
      </div>

      <div className="nr__controls">
        <button onClick={() => scroll("left")} aria-label="Scroll left">
          ‹
        </button>
        <button onClick={() => scroll("right")} aria-label="Scroll right">
          ›
        </button>
      </div>
    </section>
  );
}
