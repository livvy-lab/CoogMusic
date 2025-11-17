import "./AlbumGrid.css";
import { useRef, useEffect, useState } from "react";
import { API_BASE_URL } from "../../config/api";
import { useNavigate } from "react-router-dom";

export default function AlbumGrid({ artistId }) {
  const scrollRef = useRef(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [covers, setCovers] = useState({});
  const navigate = useNavigate();

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const amt = (scrollRef.current.clientWidth / 2) * (dir === "left" ? -1 : 1);
    scrollRef.current.scrollBy({ left: amt, behavior: "smooth" });
  };

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), 10000);

    if (!artistId || Number.isNaN(Number(artistId))) {
      setAlbums([]);
      setLoading(false);
      setError("");
      alive = false;
      controller.abort("invalid artistId");
      clearTimeout(timeout);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `${API_BASE_URL}/artists/${artistId}/albums`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        const mapped = (Array.isArray(data) ? data : [])
          .map((a) => ({
            albumId: a.AlbumID,
            title: a.Title || "Untitled",
            releaseDate: a.ReleaseDate,
            trackCount: a.TrackCount,
            coverMediaId: a.cover_media_id,
          }))
          .sort((a, b) => {
            const da = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
            const db = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
            return db - da;
          });

        if (!alive) return;
        setAlbums(mapped);
      } catch (err) {
        if (alive) {
          setError("Could not load albums.");
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

  useEffect(() => {
    let alive = true;
    (async () => {
      const needed = albums
        .filter((a) => a.coverMediaId && !(a.coverMediaId in covers))
        .map((a) => a.coverMediaId);

      if (!needed.length) return;

      const results = await Promise.all(
        needed.map(async (id) => {
          try {
            const r = await fetch(`${API_BASE_URL}/media/${id}`);
            if (!r.ok) return [id, null];
            const j = await r.json();
            return [id, j?.url || null];
          } catch {
            return [id, null];
          }
        })
      );
      if (!alive) return;
      setCovers((prev) => {
        const next = { ...prev };
        for (const [id, url] of results) {
          next[id] = url;
        }
        return next;
      });
    })();
    return () => {
      alive = false;
    };
  }, [albums]);

  const renderAlbums = () => {
    if (loading) {
      return Array.from({ length: 4 }, (_, i) => (
        <div key={`ph-${i}`} className="alb__card placeholder">
          <div className="alb__img" />
        </div>
      ));
    }
    if (error) return <div className="alb__empty">⚠️ {error}</div>;
    if (!albums.length) return <div className="alb__empty">No albums yet</div>;

    return albums.map((a) => {
      const coverUrl =
        a.coverMediaId && covers[a.coverMediaId]
          ? covers[a.coverMediaId]
          : "https://placehold.co/300x300/FFE8F5/895674?text=Album";

      return (
        <div
          key={a.albumId}
          className="alb__card"
          tabIndex={0}
          onClick={() => navigate(`/albums/${a.albumId}`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/albums/${a.albumId}`);
            }
          }}
        >
          <div className="alb__img">
            <img
              src={coverUrl}
              alt={a.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "12px",
              }}
            />
          </div>
          <p className="alb__caption">
            {a.title}
            <br />
            <span className="alb__year">
              {a.releaseDate ? new Date(a.releaseDate).getFullYear() : "—"}
            </span>
            {" · "}
            <span className="alb__tracks">
              {a.trackCount
                ? `${a.trackCount} track${a.trackCount === 1 ? "" : "s"}`
                : ""}
            </span>
          </p>
        </div>
      );
    });
  };

  return (
    <section className="alb">
      <h2 className="alb__title">Albums</h2>

      <div className="alb__rail" ref={scrollRef}>
        {renderAlbums()}
      </div>

      <div className="alb__controls">
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
