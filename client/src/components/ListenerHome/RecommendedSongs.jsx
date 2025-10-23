import "./RecommendedSongs.css";
import SongCard from "./SongCard";

const placeholderSongs = [
  {
    id: 1,
    image: "https://placehold.co/300x300/895674/ffffff?text=Song+1",
    title: "Placeholder Song 1",
    artist: "Sample Artist",
  },
  {
    id: 2,
    image: "https://placehold.co/300x300/AF578A/ffffff?text=Song+2",
    title: "Placeholder Song 2",
    artist: "Sample Artist",
  },
  {
    id: 3,
    image: "https://placehold.co/300x300/6e4760/ffffff?text=Song+3",
    title: "Placeholder Song 3",
    artist: "Sample Artist",
  },
];

export default function RecommendedSongs() {
  return (
    <div className="rsWrapper">
      <h2 className="rs__title">Songs for you</h2>
      <section className="rs">
        <div className="rs__tray">
          {placeholderSongs.map((s) => (
            <SongCard
              key={s.id}
              image={s.image}
              title={s.title}
              artist={s.artist}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
