import "./FavoriteArtists.css";

export default function FavoriteArtists({

  artists = [
    // demo data — replace with your real array
    { id: 1, name: "Drake" },
    { id: 2, name: "Drake" },
    { id: 3, name: "Drake" },
  ],
  onSelect, // optional: (artist) => void
}) {
  return (
    <section className="fa">
      <h2 className="playlistSection__title">Favorite Artists</h2>
      <div className="fa__grid">
        {artists.map((a) => (
          <button
            className="fa__item"
            key={a.id ?? a.name}
            onClick={() => onSelect?.(a)}
            type="button"
            aria-label={a.name}
            title={a.name}
          >
            <div className="fa__ring">
              {a.imageUrl ? (
                <img className="fa__avatar" />
              ) : (
                <div className="fa__placeholder" aria-hidden="true">
                  {a.name?.[0] ?? "♪"}
                </div>
              )}
            </div>
            <span className="fa__name">{a.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
