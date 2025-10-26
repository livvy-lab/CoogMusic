import { useEffect, useState } from "react";
import "./RecommendedSongs.css";
import SongCard from "./SongCard";
import { getUser } from "../../lib/userStorage";

export default function RecommendedSongs() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user || !user.ListenerID) {
      console.error("No listener ID found in user storage");
      setLoading(false);
      return;
    }

    const fetchSongs = async () => {
      try {
        const res = await fetch(
          `http://localhost:3001/listen_history/latest?listenerId=${user.ListenerID}`
        );
        const data = await res.json();
        setSongs(data);
      } catch (err) {
        console.error("Error fetching songs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, []);

  // Determine how many cards to show
  const totalSlots = 3;
  const filledSlots = songs.length;
  const emptySlots = totalSlots - filledSlots;

  // Build array that includes both real songs and placeholders
  const cardsToShow = [
    ...songs.map((s) => ({
      key: s.SongID,
      image: s.CoverURL || "https://placehold.co/300x300/895674/ffffff?text=Song",
      title: s.Title,
      artist: s.Artist,
      placeholder: false,
    })),
    ...Array(emptySlots)
      .fill(null)
      .map((_, i) => ({
        key: `placeholder-${i}`,
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
          ) : (
            cardsToShow.map((s) => (
              <SongCard
                key={s.key}
                image={s.image}
                title={s.title}
                artist={s.artist}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
