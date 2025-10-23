import "./FavPlaylist.css";

export default function FavPlaylist() {
  return (
    <div className="playlistCard">
      <div className="playlistCard__body">
        <img
          className="playlistCard__image"
        />
        <div className="playlistCard__text">
          <h3 className="playlistCard__title">Caught in my matcha run</h3>
          <p className="playlistCard__desc">
            Girl i was otw to get matcha and i ran into drizzy
          </p>
        </div>
      </div>
    </div>
  );
}
