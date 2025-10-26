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
        const res = await fetch(`http://localhost:3001/listen_history/latest?listenerId=${encodeURIComponent(id)}`);
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

  const totalSlots = 3;
  const filledSlots = Array.isArray(songs) ? songs.length : 0;
  const emptySlots = Math.max(0, totalSlots - filledSlots);

  const cardsToShow = [
    ...(Array.isArray(songs) ? songs : []).map((s, i) => ({
      key: s.SongID ?? `${s.Title ?? "Untitled"}-${s.Artist ?? "Unknown"}-${i}`,
      image: s.CoverURL || "https://placehold.co/300x300/895674/ffffff?text=Song",
      title: s.Title ?? "Untitled",
      artist: s.Artist ?? "Unknown",
    })),
    ...Array.from({ length: emptySlots }, (_, i) => ({
      key: `placeholder-${i}`,
      image: "https://placehold.co/300x300/FFE8F5/895674?text=Coming+Soon",
      title: "No song yet",
      artist: "—",
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
              <SongCard key={s.key} image={s.image} title={s.title} artist={s.artist} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}