import { useEffect, useState } from "react";
import "./RecommendedSongs.css";
import SongCard from "./SongCard";
import { getUser } from "../../lib/userStorage";

export default function RecommendedSongs() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    const id = user?.listenerId ?? user?.ListenerID;
    if (!id) {
      setSongs([]);
      setLoading(false);
      return;
    }
    const fetchSongs = async () => {
      try {
        const res = await fetch(
          `http://localhost:3001/listen_history/latest?listenerId=${encodeURIComponent(id)}`
        );
        if (!res.ok) {
          setSongs([]);
          return;
        }
        const data = await res.json();
        setSongs(Array.isArray(data) ? data : []);
      } catch {
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  async function handlePlay(songId) {
    try {
      if (!songId) return;
      await fetch("http://localhost:3001/plays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });
    } catch {}
  }

  const totalSlots = 3;
  const filledSlots = Array.isArray(songs) ? songs.length : 0;
  const emptySlots = Math.max(0, totalSlots - filledSlots);

  const cardsToShow = [
    ...(Array.isArray(songs) ? songs : []).map((s, i) => ({
      key: s.SongID ?? `${s.Title ?? "Untitled"}-${s.Artist ?? "Unknown"}-${i}`,
      songId: s.SongID ?? null,
      image: s.CoverURL || "https://placehold.co/300x300/895674/ffffff?text=Song",
      title: s.Title ?? "Untitled",
      artist: s.Artist ?? "Unknown",
      placeholder: false,
    })),
    ...Array.from({ length: emptySlots }, (_, i) => ({
      key: `placeholder-${i}`,
      songId: null,
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
            <p>Log in to see recommendations.</p>
          ) : (
            cardsToShow.map((s) => (
              <div
                key={s.key}
                onClick={() => s.songId && handlePlay(s.songId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && s.songId) {
                    handlePlay(s.songId);
                  }
                }}
                className="rs__item"
              >
                <SongCard image={s.image} title={s.title} artist={s.artist} />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
