import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Genres.css";

export default function Genres() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:3001/genres");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setGenres(Array.isArray(data) ? data : []);
      } catch (e) {
        setError("Failed to fetch genres");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = (Array.isArray(genres) ? genres : []).filter(
    g => g?.Name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Loading genres...</div>;
  if (error) return <div>{error}</div>;

  return (
    <section className="genres">
      <h2 className="genres__title">Genres</h2>


      <div className="genres__grid">
        {filtered.map(g => (
          <button
            className="genres__card"
            key={g.GenreID}
            onClick={() => navigate(`/genre/${g.GenreID}`)}
          >
        {filtered.map(g => (
          <button
            className="genres__card"
            key={g.GenreID}
            onClick={() => navigate(`/genre/${g.GenreID}`)}
          >
            <span className="genres__icon">🎸</span>
            <span className="genres__text">{g.Name}</span>
            <span className="genres__text">{g.Name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
