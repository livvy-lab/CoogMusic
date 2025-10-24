import "./Genres.css";

export default function Genres() {
  const genres = [
    "Rock",
    "Pop",
    "Hip-Hop",
    "R&B",
    "Indie",
    "Jazz",
    "Electronic",
    "Country",
    "Classical",
    "Alternative",
    "Soul",
    "Metal",
  ];

  return (
    <section className="genres">
      <h2 className="genres__title">Genres</h2>
      <div className="genres__grid">
        {genres.map((genre, index) => (
          <button className="genres__card" key={index}>
            <span className="genres__icon">🎸</span>
            <span className="genres__text">{genre}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
