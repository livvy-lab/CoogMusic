import "./TopTracks.css";

export default function TopTracks({
  title = "Top Tracks",
  tracks = [
    { id: 1, name: "Dreamscape", duration: "3:45" },
    { id: 2, name: "Midnight", duration: "3:45" },
    { id: 3, name: "Sunset", duration: "3:45" },
    { id: 4, name: "Ethereal Bloom", duration: "4:02" },
    { id: 5, name: "Lunar Glow", duration: "3:58" },
    { id: 6, name: "Velvet Sky", duration: "3:41" },
    { id: 7, name: "Starlit Echo", duration: "3:47" },
    { id: 8, name: "Neon Mirage", duration: "3:55" },
    { id: 9, name: "Crimson Horizon", duration: "3:43" },
    { id: 10, name: "Midday Reverie", duration: "4:10" },
  ],
}) {
  return (
    <section className="tt">
      <h2 className="tt__title">{title}</h2>
      <div className="tt__card" role="region" aria-label={title}>
        <ul className="tt__list">
          {tracks.map((t) => (
            <li key={t.id} className="tt__row">
              <span className="tt__art" aria-hidden="true" />
              <span className="tt__name">{t.name}</span>
              <span className="tt__dur">{t.duration}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
