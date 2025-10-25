import { useEffect, useState } from "react";
import "./FavoriteArtists.css";

export default function FavoriteArtists({ listenerId, onSelect }) {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    const id = listenerId || stored?.listenerId;
    if (!id) {
      setError("No listener ID found");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`http://localhost:3001/listeners/${id}/profile`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const favs = data.favorites?.artists || [];

        // Always show 3 slots: fill empty with null placeholders
        const filled = [...favs];
        while (filled.length < 3) filled.push(null);
        setArtists(filled);
      } catch (e) {
        console.error("[FavoriteArtists] fetch error", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [listenerId]);

  if (loading) {
    return (
      <section className="fa">
        <h2 className="playlistSection__title">Favorite Artists</h2>
        <p>Loading...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="fa">
        <h2 className="playlistSection__title">Favorite Artists</h2>
        <p style={{ color: "red" }}>Error: {error}</p>
      </section>
    );
  }

  return (
    <section className="fa">
      <h2 className="playlistSection__title">Favorite Artists</h2>
      <div className="fa__grid">
        {artists.map((a, i) => (
          <button
            key={a?.ArtistID ?? `placeholder-${i}`}
            className="fa__item"
            type="button"
            onClick={() => a && onSelect?.(a)}
            aria-label={a?.ArtistName || "Empty"}
            title={a?.ArtistName || "Empty"}
            disabled={!a}
          >
            <div className="fa__ring">
              {a?.PFP ? (
                <img className="fa__avatar" src={a.PFP} alt={a.ArtistName} />
              ) : (
                <div className="fa__placeholder" aria-hidden="true">
                  {a?.ArtistName?.[0] ?? "?"}
                </div>
              )}
            </div>
            <span className="fa__name">{a?.ArtistName || "—"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
