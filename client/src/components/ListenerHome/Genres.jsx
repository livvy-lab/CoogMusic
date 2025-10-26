import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Genres.css";

export default function Genres() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch("http://localhost:3001/genres");
        const data = await res.json();
        setGenres(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching genres:", err);
        setGenres([]);
      } finally {
        setLoading(false);
      }
    };
    fetchGenres();
  }, []);

  const onSelect = (genre) => {
    navigate(`/songs?genreId=${genre.GenreID}`);
  };

  const placeholders = Array(Math.max(0, 8 - genres.length)).fill(null);

  return (
    <section className="genres">
      <h2 className="genres__title">Genres</h2>

      <div className="genres__grid">
        {loading ? (
          Array(8)
            .fill(0)
            .map((_, i) => (
              <div className="genres__card genres__card--skeleton" key={`sk-${i}`}>
                <span className="genres__icon">🎵</span>
                <span className="genres__text">Loading...</span>
              </div>
            ))
        ) : (
          <>
            {genres.map((g) => (
              <button
                className="genres__card"
                key={g.GenreID}
                onClick={() => onSelect(g)}
              >
                <span className="genres__icon">🎵</span>
                <span className="genres__text">{g.Name}</span>
              </button>
            ))}
            {genres.length === 0 &&
              placeholders.map((_, i) => (
                <div className="genres__card genres__card--placeholder" key={`ph-${i}`}>
                  <span className="genres__icon">🎵</span>
                  <span className="genres__text">Coming Soon</span>
                </div>
              ))}
          </>
        )}
      </div>
    </section>
  );
}
