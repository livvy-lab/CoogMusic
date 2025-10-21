import "./FavPlaylist.css";

export default function FavPlaylist() {
  return (
    <section className="fp">
      <img
        src="https://via.placeholder.com/120x90.png?text=Playlist"
        alt="Playlist cover"
        className="fp__cover"
      />
      <div className="fp__body">
        <div className="fp__title">Caught in my matcha run</div>
        <p className="fp__desc">
          Girl I was otw to get matcha and I ran into drizzy
        </p>
      </div>
    </section>
  );
}
