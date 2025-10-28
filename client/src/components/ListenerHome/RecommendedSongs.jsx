import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./RecommendedSongs.css";
import SongCard from "./SongCard";
import { getUser } from "../../lib/userStorage";
import { usePlayer } from "../../context/PlayerContext";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const PLACEHOLDER = "https://placehold.co/300x300/895674/ffffff?text=Song";

export default function RecommendedSongs() {
  const [songs, setSongs] = useState([]);
  const [covers, setCovers] = useState({});
  const [loading, setLoading] = useState(true);
  const { playSong } = usePlayer();

  async function loadLatest() {
    const user = getUser();
    const id = user?.listenerId ?? user?.ListenerID;
    if (!id) { setSongs([]); return; }
    const res = await fetch(`${API_BASE}/listen_history/latest?listenerId=${encodeURIComponent(id)}`);
    const data = res.ok ? await res.json() : [];
    setSongs(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    (async () => { setLoading(true); await loadLatest(); setLoading(false); })();
  }, []);

  useEffect(() => {
    let abort = false;
    (async () => {
      const needed = [...new Set((songs || []).map(s => s.coverMediaId).filter(Boolean))]
        .filter(id => !(id in covers));
      if (!needed.length) return;
      const entries = await Promise.all(
        needed.map(async (id) => {
          try {
            const r = await fetch(`${API_BASE}/media/${id}`);
            if (!r.ok) return [id, PLACEHOLDER];
            const j = await r.json();
            return [id, j?.url || PLACEHOLDER];
          } catch { return [id, PLACEHOLDER]; }
        })
      );
      if (!abort) {
        setCovers(prev => {
          const next = { ...prev };
          for (const [id, url] of entries) next[id] = url;
          return next;
        });
      }
    })();
    return () => { abort = true; };
  }, [songs]);

  async function handlePlay(song) {
    if (!song?.SongID) return;
    const u = getUser();
    const listenerId = u?.listenerId ?? u?.ListenerID;
    if (!listenerId) return;

    await playSong(song);

    await fetch(`${API_BASE}/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId: song.SongID, listenerId, msPlayed: 30000 }),
    });

    await loadLatest();
  }

  const uniqueSongs = Array.isArray(songs)
    ? songs.filter((s, i, arr) => s.SongID && arr.findIndex(t => t.SongID === s.SongID) === i)
    : [];

  const totalSlots = 3;
  const filledSlots = uniqueSongs.length;
  const emptySlots = Math.max(0, totalSlots - filledSlots);

  const cardsToShow = [
    ...uniqueSongs.map((s) => ({
      key: String(s.SongID),
      song: s,
      songId: s.SongID ?? null,
      artistId: s.ArtistID ?? s.artistId ?? s.ArtistId ?? null,
      image: s.coverMediaId ? (covers[s.coverMediaId] || PLACEHOLDER) : PLACEHOLDER,
      title: s.Title ?? "Untitled",
      artist: s.Artist ?? s.ArtistName ?? "Unknown",
      placeholder: false,
    })),
    ...Array.from({ length: emptySlots }, (_, i) => ({
      key: `ph-${i}`,
      song: null,
      songId: null,
      artistId: null,
      image: "https://placehold.co/300x300/FFE8F5/895674?text=Coming+Soon",
      title: "No song yet",
      artist: "—",
      placeholder: true,
    })),
  ];

  return (
    <div className="rsWrapper">
      <h2 className="rs__title">Songs for you</h2>
      <section className="rs">
        <div className="rs__tray">
          {loading ? (
            <p>Loading...</p>
          ) : cardsToShow.length === 0 ? (
            <p>No recent listens yet—play something!</p>
          ) : (
            cardsToShow.map((s) => (
              <div
                key={s.key}
                className="rs__item"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  // let links inside navigate; only play when clicking non-link areas
                  if (e.target.closest("a")) return;
                  if (s.song) handlePlay(s.song);
                }}
                onKeyDown={(e) => {
                  if (e.target.closest && e.target.closest("a")) return;
                  if ((e.key === "Enter" || e.key === " ") && s.song) handlePlay(s.song);
                }}
              >
                <SongCard image={s.image} title={s.title} />
                <div className="rs__meta">
                  {s.artistId ? (
                    <Link
                      to={`/artist/${s.artistId}`}
                      className="rs__artistLink"
                    >
                      {s.artist}
                    </Link>
                  ) : (
                    <span className="rs__artistText">{s.artist}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
