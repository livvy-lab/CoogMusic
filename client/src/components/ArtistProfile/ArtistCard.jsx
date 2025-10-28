// client/src/components/ArtistCard/ArtistCard.jsx
import { useEffect, useState } from "react";
import "./ArtistCard.css";

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
        const res = await fetch(`http://localhost:3001/artists/${artistId}/profile`, { signal: ctrl.signal });
        if (res.status === 404) { setArtist(null); setState({ loading: false, notFound: true }); return; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setArtist(data);
        setState({ loading: false, notFound: false });
      } catch {
        setArtist(null);
        setState({ loading: false, notFound: true });
      }
    })();
    return () => ctrl.abort();
  }, [artistId]);

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
        onClick={() => setFavorited(!favorited)}
        aria-label={favorited ? "Unfavorite artist" : "Favorite artist"}
      >
        <svg viewBox="0 0 24 24" className="artistCard__favIcon" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
