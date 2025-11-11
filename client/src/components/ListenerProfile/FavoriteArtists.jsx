import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./FavoriteArtists.css";
import { API_BASE_URL } from "../../config/api";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function FavoriteArtists({ listenerId }) {
  const [artists, setArtists] = useState([]); // always an array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    const id = listenerId || stored?.listenerId || stored?.ListenerID;

    if (!id) {
      setError("No listener ID found");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/listeners/${id}/pins/artists`);
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${txt}`);
        }
        // defensive JSON parsing
        let data = [];
        try {
          data = await res.json();
        } catch {
          data = [];
        }
        if (!alive) return;

        // ensure array
        setArtists(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        console.error("[FavoriteArtists] fetch error:", e);
        setError(e.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
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

  const hasPins = artists.length > 0;

  return (
    <section className="fa">
      <h2 className="playlistSection__title">Favorite Artists</h2>

      <div className="fa__grid">
        {hasPins ? (
          artists.map((a, i) => {
            // extra guard in case backend returns odd data
            if (!a || typeof a !== "object") return null;
            const id = Number(a.ArtistID);
            const name = a.ArtistName || "—";
            const pfp = a.PFP || null;

            return (
              <Link
                key={id || `artist-${i}`}
                to={id ? `/artist/${id}` : "#"}
                className="fa__item"
                aria-label={name}
                title={name}
              >
                <div className="fa__ring">
                  {pfp ? (
                    <img className="fa__avatar" src={pfp} alt={name} />
                  ) : (
                    <div className="fa__placeholder" aria-hidden="true">
                      {name?.[0] ?? "?"}
                    </div>
                  )}
                </div>
                <span className="fa__name">{name}</span>
              </Link>
            );
          })
        ) : (
          // exactly one placeholder if there are NO pinned artists
          <div className="fa__item" aria-label="Empty" title="Empty">
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
