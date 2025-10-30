import "./DiscographyGrid.css";
import { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";

export default function Discography({ artistId: artistIdProp }) {
  const params = useParams();
  const artistId = artistIdProp ?? params.id ?? params.artistId;

  const scrollRef = useRef(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const amt = (scrollRef.current.clientWidth / 2) * (dir === "left" ? -1 : 1);
    scrollRef.current.scrollBy({ left: amt, behavior: "smooth" });
  };

  // helper: detect any abort flavor (AbortError, Safari code 20, custom reason)
  const isAbort = (err) =>
    err?.name === "AbortError" ||
    err?.code === 20 ||
    err === "cleanup" ||
    err === "timeout";

  useEffect(() => {
    let alive = true;

    if (!artistId) {
      setReleases([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), 10000);

    (async () => {
      try {
        if (!alive) return;
        setLoading(true);
        setError("");

        const res = await fetch(
          `${API_BASE_URL}/artists/${artistId}/discography`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        const all = [
          ...(Array.isArray(data.albums) ? data.albums : []),
          ...(Array.isArray(data.singles) ? data.singles : []),
        ];

        const merged = all
          .map((r) => ({
            id: r.AlbumID || r.SongID,
            title: r.AlbumTitle || r.Title || "Untitled",
            releaseDate: r.ReleaseDate,
            plays: Number(r.Streams ?? r.streams ?? 0),
            trackCount: r.TrackCount,
          }))
          .sort((a, b) => {
            const da = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
            const db = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
            return db - da;
          });

        if (!alive) return;
        setReleases(merged);
      } catch (err) {
        if (isAbort(err) || !alive) {
          // ignore silent aborts
        } else {
          console.error("Discography fetch error:", err);
          if (alive) setError("Could not load discography.");
        }
      } finally {
        clearTimeout(timeout);
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      clearTimeout(timeout);
      controller.abort("cleanup");
    };
  }, [artistId]);

  const renderCards = () => {
    if (loading) {
      return Array.from({ length: 6 }, (_, i) => (
        <div key={`ph-${i}`} className="nr__card placeholder">
          <div className="nr__img" />
        </div>
      ));
    }

    if (error) return <div className="nr__empty">⚠️ {error}</div>;
    if (!releases.length) return <div className="nr__empty">🎵 No releases yet 🎵</div>;

    return releases.map((r) => (
      <div key={r.id} className="nr__card">
        <div className="nr__img" style={{ backgroundColor: "#d7b5c6" }} />
        <p className="nr__caption">
          {r.title}
          <br />
          <span className="nr__year">
            {r.releaseDate ? new Date(r.releaseDate).getFullYear() : "—"}
          </span>
          {" · "}
          <span className="nr__tracks">
            {r.trackCount
              ? `${r.trackCount} ${r.trackCount === 1 ? "track" : "tracks"}`
              : `${r.plays.toLocaleString()} ${r.plays === 1 ? "play" : "plays"}`}
          </span>
        </p>
      </div>
    ));
  };

  return (
    <section className="nr">
      <h2 className="nr__title">Discography</h2>

      <div className="nr__rail" ref={scrollRef}>
        {renderCards()}
      </div>

      <div className="nr__controls">
        <button onClick={() => scroll("left")} aria-label="Scroll left">‹</button>
        <button onClick={() => scroll("right")} aria-label="Scroll right">›</button>
      </div>
    </section>
  );
}
