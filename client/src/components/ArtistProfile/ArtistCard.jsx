import { useEffect, useMemo, useState } from "react";
import "./ArtistCard.css";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

function PlaceholderCard() {
  return (
    <div className="artistCard">
      <div className="artistCard__avatarWrap">
        <div className="artistCard__avatar">
          <img src="/assets/artist-avatar.png" alt="" aria-hidden="true" />
        </div>
      </div>
      <div className="artistCard__info">
        <h1 className="artistCard__name">Unknown Artist</h1>
        <div className="artistCard__followers">This artist hasn’t started creating yet.</div>
      </div>
      <div className="artistCard__songs">♪ 0 songs</div>
    </div>
  );
}

export default function ArtistCard({ artistId }) {
  const [artist, setArtist] = useState(null);
  const [favorited, setFavorited] = useState(false);
  const [state, setState] = useState({ loading: false, notFound: false });

  const listenerId = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      return u?.listenerId ?? u?.ListenerID ?? null;
    } catch { return null; }
  }, []);

  useEffect(() => {
    if (artistId === undefined || artistId === null || Number.isNaN(Number(artistId))) {
      setArtist(null);
      setState({ loading: false, notFound: true });
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      setState({ loading: true, notFound: false });
      try {
        const r = await fetch(`${API_BASE}/artists/${artistId}/profile`, { signal: ctrl.signal });
        if (r.status === 404) { setArtist(null); setState({ loading: false, notFound: true }); return; }
        if (!r.ok) throw new Error();
        const data = await r.json();
        setArtist(data);
        setState({ loading: false, notFound: false });
      } catch {
        setArtist(null);
        setState({ loading: false, notFound: true });
      }
    })();
    return () => ctrl.abort();
  }, [artistId]);

  useEffect(() => {
    if (!listenerId || !artistId) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/listeners/${listenerId}/pins/artists`);
        if (!r.ok) return;
        const pins = await r.json();
        if (!alive) return;
        setFavorited(pins.some(p => Number(p.ArtistID) === Number(artistId)));
      } catch {}
    })();
    return () => { alive = false; };
  }, [listenerId, artistId]);

  async function togglePin() {
    if (!listenerId || !artistId) return;
    if (!favorited) {
      const r = await fetch(`${API_BASE}/listeners/${listenerId}/pins/artists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: Number(artistId) })
      });
      if (r.ok) setFavorited(true);
    } else {
      const r = await fetch(`${API_BASE}/listeners/${listenerId}/pins/artists/${artistId}`, { method: "DELETE" });
      if (r.ok) setFavorited(false);
    }
  }

  if (state.loading) return <div className="artistCard">Loading…</div>;
  if (state.notFound) return <PlaceholderCard />;

  return (
    <div className="artistCard">
      <div className="artistCard__avatarWrap">
        <div className="artistCard__avatar">
          <img
            src={artist?.pfpSignedUrl || artist?.pfpUrl || "/assets/artist-avatar.png"}
            alt={artist?.ArtistName || "Artist"}
          />
        </div>
      </div>
      <div className="artistCard__info">
        <h1 className="artistCard__name">{artist?.ArtistName || "Unknown Artist"}</h1>
        <div className="artistCard__followers">
          {Number(artist?.FollowerCount || 0).toLocaleString()} followers
        </div>
      </div>
      <div className="artistCard__songs">♪ {artist?.SongCount || 0} songs</div>
      <button
        type="button"
        className={`artistCard__fav${favorited ? " is-active" : ""}`}
        onClick={togglePin}
        aria-label={favorited ? "Unpin artist" : "Pin artist"}
        title={favorited ? "Unpin" : "Pin to profile"}
      >
        <svg viewBox="0 0 24 24" className="artistCard__favIcon" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
