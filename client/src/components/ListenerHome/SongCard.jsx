export default function SongCard({ image, title, artist }) {
    return (
      <div className="sc">
        <img className="sc__img" src={image} alt={title} />
        <div className="sc__title">{title}</div>
        <div className="sc__artist">{artist}</div>
      </div>
    );
  }
  