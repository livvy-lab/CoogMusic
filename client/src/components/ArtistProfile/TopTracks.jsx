import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./TopTracks.css";

export default function TopTracks({ title = "Top Tracks", artistId: artistIdProp }) {
  const params = useParams();
  const artistId = artistIdProp ?? params.id ?? params.artistId; // supports /artists/:id or /artists/:artistId
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No artist ID → show empty state
    if (!artistId) {
      setTracks([]);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000); // safety timeout

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/artists/${artistId}/top-tracks?limit=10`, {
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setTracks([]); // fall back to empty
          return;
        }
        const data = await res.json();
        setTracks(Array.isArray(data.tracks) ? data.tracks : []);
      } catch {
        setTracks([]); // fall back to empty
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
            {tracks.map((t, i) => (
              <li key={t.SongID ?? i} className="tt__row">
                <span className="tt__art" aria-hidden="true" />
                <span className="tt__name">{t.Title}</span>
                <span className="tt__dur">
                  {t.StreamCount ? `${t.StreamCount.toLocaleString()} plays` : "0 plays"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
