import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./SongGrid.css";

export default function SongGrid() {
  const { genreId } = useParams();
  const [songs, setSongs] = useState([]);
  const [genreName, setGenreName] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSongs() {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/genres/${genreId}/songs`);
        if (res.status === 404) {
          setSongs([]);
          setGenreName("Unknown Genre");
          return;
        }
        if (!res.ok) throw new Error(`Failed to fetch songs for genre ${genreId}`);

        const data = await res.json();
        setSongs(Array.isArray(data.songs) ? data.songs : []);
        setGenreName(data.genre?.GenreName || "Unknown Genre");
      } catch (err) {
        setError("Failed to load songs");
      } finally {
        setLoading(false);
      }
    }

    if (genreId) fetchSongs();
  }, [genreId]);

  if (loading)
    return (
      <section className="songGrid">
        <h2 className="songGrid__title">{genreName}</h2>
        <div className="songGrid__container">Loading songs...</div>
      </section>
    );

  if (error)
    return (
      <section className="songGrid">
        <h2 className="songGrid__title">{genreName}</h2>
        <div className="songGrid__container error">{error}</div>
      </section>
    );

  if (!songs.length)
    return (
      <section className="songGrid">
        <h2 className="songGrid__title">{genreName}</h2>
        <div className="songGrid__container comingSoon">🎶 Coming Soon 🎶</div>
      </section>
    );

  return (
    <section className="songGrid">
      <h2 className="songGrid__title">{genreName}</h2>
      <div className="songGrid__container">
        {songs.map((s) => (
          <div className="songCard" key={s.SongID}>
            <div className="songCard__frame">
              <img
                src={`https://placehold.co/600x600/895674/fff?text=${encodeURIComponent(
                  s.Title
                )}`}
                alt={s.Title}
                className="songCard__art"
              />
            </div>
            <div className="songCard__meta">
              <div className="songCard__title">{s.Title}</div>
              <div className="songCard__artist">
                {s.ArtistName || "Unknown Artist"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
