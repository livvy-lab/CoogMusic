import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./FavoriteArtists.css";
import { API_BASE_URL } from "../../config/api";

export default function FavoriteArtists({ listenerId, onSelect }) {
  const [artists, setArtists] = useState([]);
  const [favCount, setFavCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    const id = listenerId || stored?.listenerId || stored?.ListenerID;
    if (!id) { setError("No listener ID found"); setLoading(false); return; }

    const ctrl = new AbortController();

    const normalize = (a) => {
      if (!a || typeof a !== "object") return null;
      const ArtistID = Number(a.ArtistID ?? a.artistId ?? a.id ?? NaN);
      const ArtistName = a.ArtistName ?? a.artistName ?? a.name ?? "—";
      const PFP = a.pfpSignedUrl ?? a.pfpUrl ?? a.PFP ?? null;
      return Number.isFinite(ArtistID) ? { ArtistID, ArtistName, PFP } : null;
    };

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/listeners/${id}/profile`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log("[FavoriteArtists] Raw data from /profile:", data);

        let favs = Array.isArray(data?.favorites?.artists) ? data.favorites.artists : [];
        if (!favs.length) {
          const r2 = await fetch(`${API_BASE_URL}/listeners/${id}/pins/artists`, { signal: ctrl.signal });
          if (r2.ok) {
            favs = await r2.json();
            console.log("[FavoriteArtists] Raw data from /pins/artists:", favs);
          }
        }
        const norm = favs.map(normalize).filter(Boolean);
        if (!alive) return;
        setFavCount(norm.length);
        const filled = [...norm];
        while (filled.length < 3) filled.push(null);
        setArtists(filled.slice(0, 3));
      } catch (e) {
        if (!alive) return;
        
        console.error("[FavoriteArtists] Failed to load data:", e);
        setError(e.message || "Failed to load");
        
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; ctrl.abort(); };
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

  const hasPins = favCount > 0;

  return (
    <section className="fa">
      <h2 className="playlistSection__title">Favorite Artists</h2>

      <div className="fa__grid">
        {hasPins ? (
          artists.map((a, i) => {
            if (!a) return (
              <div key={`empty-${i}`} className="fa__item" aria-label="Empty" title="Empty">
                <div className="fa__ring">
                  <div className="fa__placeholder" aria-hidden="true">?</div>
                </div>
                <span className="fa__name">—</span>
              </div>
            );
            const id = a.ArtistID;
            const name = a.ArtistName || "—";
            const pfp = a.PFP || null;
            const handleClick = (e) => { if (onSelect) onSelect(id, e); };
            return (
              <Link
                key={id}
                to={`/artist/${id}`}
                className="fa__item"
                aria-label={name}
                title={name}
                onClick={handleClick}
              >
                <div className="fa__ring">
                  {pfp ? (
                    <img className="fa__avatar" src={pfp} alt={name} />
                  ) : (
                    <div className="fa__placeholder" aria-hidden="true">
                      {name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>
                <span className="fa__name">{name}</span>
              </Link>
            );
          })
        ) : (
          <div className="fa__item" aria-label="No favorites yet" title="No favorites yet">
            <div className="fa__ring">
              <div className="fa__placeholder" aria-hidden="true">?</div>
            </div>
            <span className="fa__name">—</span>
          </div>
        )}
      </div>
    </section>
  );
}
