import "./FavoriteArtists.css";

const items = [drake, drake, drake];

export default function FavoriteArtists() {
  return (
    <div className="fa">
      {items.map((src, i) => (
        <div key={i} className="fa__item">
          <img src={src} alt="" />
        </div>
      ))}
    </div>
  );
}
