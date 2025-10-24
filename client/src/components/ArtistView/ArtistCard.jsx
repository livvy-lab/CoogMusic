import "./ArtistCard.css";

export default function ArtistCard({
  name = "THE WEEKEND",
  followers = "100M",
  songs = 200,
  avatar = "/assets/artist-avatar.png",
  favorited = false,
  onToggleFavorite = () => {},
}) {
  return (
    <div className="artistCard">
      {/* Avatar */}
      <div className="artistCard__avatarWrap">
        <div className="artistCard__avatar">
          <img src={avatar} alt="" aria-hidden="true" />
        </div>
      </div>

      {/* Artist Info */}
      <div className="artistCard__info">
        <h1 className="artistCard__name">{name}</h1>
        <div className="artistCard__followers">{followers} followers</div>
      </div>

      {/* Song Count */}
      <div className="artistCard__songs">♪ {songs} songs</div>

      {/* Favorite Button */}
      <button
        type="button"
        className={`artistCard__fav${favorited ? " is-active" : ""}`}
        onClick={onToggleFavorite}
        aria-label={favorited ? "Unfavorite artist" : "Favorite artist"}
      >
        <svg
          viewBox="0 0 24 24"
          className="artistCard__favIcon"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}
