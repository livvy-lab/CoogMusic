import "./SongGrid.css";

const mockSongs = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  cover: `https://placehold.co/600x600/895674/fff?text=Song+${i + 1}`,
  title: "don’t want to break up",
  artist: "Ariana Grande",
}));

export default function SongGrid() {
  return (
    <section className="songGrid">
      <h2 className="songGrid__title">Pop</h2>
      <div className="songGrid__container">
        {mockSongs.map((s) => (
          <div className="songCard" key={s.id}>
            <div className="songCard__frame">
              <img src={s.cover} alt={s.title} className="songCard__art" />
            </div>
            <div className="songCard__meta">
              <div className="songCard__title">{s.title}</div>
              <div className="songCard__artist">{s.artist}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
