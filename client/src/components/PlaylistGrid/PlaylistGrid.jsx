import "./playlistgrid.css";

export default function PlaylistGrid() {
  // Try with >5 to test wrapping
  const playlists = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    title: "Ocean Vibes",
    author: "coolgirl<3",
    duration: "2 hours 13 minutes",
    tracks: 28,
    coverUrl:
      "https://images.unsplash.com/photo-1614624533237-3f5f9b1f3a9d?q=80&w=600&auto=format&fit=crop",
  }));

  return (
    <section className="plGrid">
      <h2 className="plGrid__title">Playlists</h2>

      <div className="plGrid__container">
        {playlists.map((p) => (
          <div className="pl" key={p.id}>
            <div className="pl__pill">
              <span className="pl__pillIcon">⏱</span>
              <span>{p.duration}</span>
            </div>
            <div className="pl__coverWrap">
              <img className="pl__cover" src={p.coverUrl} alt={p.title} />
            </div>
            <h3 className="pl__title">{p.title}</h3>
            <div className="pl__by">
              by <span className="pl__author">{p.author}</span>
            </div>
            <div className="pl__tracks">{p.tracks} tracks</div>
          </div>
        ))}
      </div>
    </section>
  );
}
