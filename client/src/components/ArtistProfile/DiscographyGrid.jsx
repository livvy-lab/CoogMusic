import "./DiscographyGrid.css";
import { useRef, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Added useNavigate
import { API_BASE_URL } from "../../config/api";
import { usePlayer } from "../../context/PlayerContext";

export default function Discography({ artistId: artistIdProp }) {
  const params = useParams();
  const navigate = useNavigate(); // Hook for navigation
  const artistId = artistIdProp ?? params.id ?? params.artistId;

  const scrollRef = useRef(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [covers, setCovers] = useState({});
  const { playSong } = usePlayer();

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const amt = (scrollRef.current.clientWidth / 2) * (dir === "left" ? -1 : 1);
    scrollRef.current.scrollBy({ left: amt, behavior: "smooth" });
  };

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
            songId: r.SongID,
            albumId: r.AlbumID,
            title: r.AlbumTitle || r.Title || "Untitled",
            releaseDate: r.ReleaseDate,
            plays: Number(r.Streams ?? r.streams ?? 0),
            trackCount: r.TrackCount,
            coverMediaId: r.cover_media_id || r.CoverMediaID,
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
          // ignore
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

  // Resolve cover images for releases
  useEffect(() => {
    let alive = true;
    (async () => {
      const needed = releases
        .filter(r => r.coverMediaId && !(r.coverMediaId in covers))
        .map(r => r.coverMediaId);
      
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
      setCovers(prev => {
        const next = { ...prev };
        for (const [id, url] of results) {
          next[id] = url;
        }
        return next;
      });
    })();
    return () => { alive = false; };
  }, [releases]);

  // Handle Click: Play if Song, Navigate if Album
  async function handleReleaseClick(release) {
    if (release.songId) {
      // It's a Single -> Play the song directly
      try {
        const res = await fetch(`${API_BASE_URL}/songs/${release.songId}`);
        if (!res.ok) return;
        const song = await res.json();
        playSong(song);
      } catch (err) {
        console.error("Failed to play song:", err);
      }
    } else if (release.albumId) {
      // It's an Album -> Navigate to Album View
      navigate(`/albums/${release.albumId}`);
    }
  }

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

    return releases.map((r) => {
      const placeholderText = r.albumId ? "Album" : "Single";
      
      // Use resolved cover URL or fallback
      const coverUrl = r.coverMediaId && covers[r.coverMediaId] 
        ? covers[r.coverMediaId] 
        : null; // Null allows fallback logic inside the image tag or container

      // Fallback URL only if no media ID exists at all
      const finalSrc = coverUrl || `https://placehold.co/300x300/FFE8F5/895674?text=${placeholderText}`;

      return (
        <div 
          key={r.id} 
          className="nr__card"
          onClick={() => handleReleaseClick(r)} // Click handler restored
          style={{ cursor: 'pointer' }} // Pointer cursor restored
        >
          <div className="nr__img">
            <img 
              src={finalSrc} 
              alt={r.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} 
              onError={(e) => {
                 // If image breaks, hide it to show the nice background color
                 e.currentTarget.style.display = "none";
              }}
            />
          </div>
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
      );
    });
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