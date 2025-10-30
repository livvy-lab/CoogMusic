// client/src/components/SongGrid/SongGrid.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";
import { useFavPins } from "../../context/FavoritesPinsContext";
import SongActions from "../Songs/SongActions";                    // ✅ actions UI
import "./SongGrid.css";
import { API_BASE_URL } from "../../config/api";

export default function SongGrid() {
  const { genreId } = useParams();
  const { playSong } = usePlayer();
  const { setVisibleIds } = useFavPins?.() || { setVisibleIds: () => {} }; // tolerate missing provider

  const [songs, setSongs] = useState([]);
  const [genreName, setGenreName] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [streams, setStreams] = useState({});

  useEffect(() => {
    async function fetchSongs() {
      try {
        setLoading(true);
        setError("");
  const res = await fetch(`${API_BASE_URL}/genres/${encodeURIComponent(genreId)}/songs`);
        if (res.status === 404) { setSongs([]); setGenreName("Unknown Genre"); return; }
        if (!res.ok) throw new Error();
        const data = await res.json();
        const list = Array.isArray(data.songs) ? data.songs : [];
        setSongs(list);
        setGenreName(data.genre?.GenreName || "Unknown Genre");
        const initial = {};
        for (const s of list) initial[s.SongID] = Number(s.Streams || 0);
        setStreams(initial);
      } catch {
        setError("Failed to load songs");
      } finally {
        setLoading(false);
      }
    }
    if (genreId) fetchSongs();
  }, [genreId]);

  // ✅ hydrate visible IDs for context status (favorites/pins)
  useEffect(() => {
    setVisibleIds(songs.map(s => s.SongID).filter(Boolean));
  }, [songs, setVisibleIds]);

  async function handlePlay(song) {
    await playSong(song);
    const u = JSON.parse(localStorage.getItem("user") || "null");
    const listenerId = Number(u?.listenerId ?? u?.ListenerID ?? u?.listenerID ?? NaN);
    setStreams(prev => ({ ...prev, [song.SongID]: (prev[song.SongID] ?? 0) + 1 }));
    if (!Number.isFinite(listenerId)) return;
    try {
  const res = await fetch(`${API_BASE_URL}/plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.SongID, listenerId, msPlayed: 0 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.streams === "number") {
        setStreams(prev => ({ ...prev, [song.SongID]: data.streams }));
      }
    } catch {}
  }

  if (loading) return (
    <section className="songGrid">
      <h2 className="songGrid__title">{genreName}</h2>
      <div className="songGrid__container">Loading songs...</div>
    </section>
  );

  if (error) return (
    <section className="songGrid">
      <h2 className="songGrid__title">{genreName}</h2>
      <div className="songGrid__container error">{error}</div>
    </section>
  );

  if (!songs.length) return (
    <section className="songGrid">
      <h2 className="songGrid__title">{genreName}</h2>
      <div className="songGrid__container comingSoon">🎶 Coming Soon 🎶</div>
    </section>
  );

  return (
    <section className="songGrid">
      <h2 className="songGrid__title">{genreName}</h2>
      <div className="songGrid__container">
        {songs.map((s) => {
          const names = (s.ArtistName || "Unknown Artist").split(", ").filter(Boolean);
          const ids = (s.ArtistIDs || "").split(",").map(x => Number(x)).filter(Boolean);
          const hasLinkedArtists = ids.length === names.length && ids.length > 0;

          return (
            // ⬇️ change wrapper to div so inner buttons can render/click
            <div
              className="songCard"
              key={s.SongID}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if (e.target.closest && e.target.closest(".songActions")) return; // don't play when clicking actions
                handlePlay(s);
              }}
              onKeyDown={(e) => {
                if (e.target.closest && e.target.closest(".songActions")) return;
                if (e.key === "Enter" || e.key === " ") handlePlay(s);
              }}
            >
              <div className="songCard__frame">
                <img
                  src={`https://placehold.co/600x600/895674/fff?text=${encodeURIComponent(s.Title)}`}
                  alt={s.Title}
                  className="songCard__art"
                />
              </div>
              <div className="songCard__meta">
                <div className="songCard__title">{s.Title}</div>
                <div className="songCard__artist">
                  {hasLinkedArtists
                    ? names.map((name, i) => (
                        <span key={ids[i]}>
                          <Link to={`/artist/${ids[i]}`}>{name}</Link>
                          {i < names.length - 1 ? ", " : ""}
                        </span>
                      ))
                    : (names.join(", ") || "Unknown Artist")}
                </div>
                <div className="songCard__streams">
                  {streams[s.SongID] !== undefined ? `${streams[s.SongID]} streams` : "Click to play"}
                </div>

                {/* ✅ actions row */}
                <div className="songCard__actionsRow">
                  <SongActions songId={s.SongID} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
