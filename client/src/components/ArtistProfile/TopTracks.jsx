import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./TopTracks.css";
import { API_BASE_URL } from "../../config/api";

export default function TopTracks({ title = "Top Tracks", artistId: artistIdProp }) {
  const params = useParams();
  const artistId = artistIdProp ?? params.id ?? params.artistId; // supports /artist/:id or /artist/:artistId
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId) {
      setTracks([]);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE_URL}/artists/${artistId}/top-tracks?limit=10`,
          { signal: ctrl.signal }
        );
        if (!res.ok) {
          setTracks([]);
          return;
        }
        const data = await res.json();
        setTracks(Array.isArray(data.tracks) ? data.tracks : []);
      } catch {
        setTracks([]);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    })();

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [artistId]);

  const hasTracks = tracks.length > 0;

  return (
    <section className="tt">
      <h2 className="tt__title">{title}</h2>

      {loading ? (
        <div className="tt__card">Loading top tracks...</div>
      ) : !hasTracks ? (
        <div className="tt__empty">🎶 No tracks yet 🎶</div>
      ) : (
        <div className="tt__card" role="region" aria-label={title}>
          <ul className="tt__list">
            {tracks.map((t, i) => {
              // Robustly read stream count regardless of backend alias
              const plays = Number(
                t.Streams ?? t.StreamCount ?? t.streams ?? t.playCount ?? 0
              );
              return (
                <li key={t.SongID ?? i} className="tt__row">
                  <span className="tt__art" aria-hidden="true">
                    {t.CoverURL ? (
                      <img src={t.CoverURL} alt={t.Title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                    ) : null}
                  </span>
                  <span className="tt__name">{t.Title}</span>
                  <span className="tt__dur">
                   {plays.toLocaleString()} {plays === 1 ? "play" : "plays"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
