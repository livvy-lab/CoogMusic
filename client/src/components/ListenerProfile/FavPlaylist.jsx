import "./FavPlaylist.css";

export default function FavPlaylist({
  title = "Caught in my matcha run",
  description = "Girl i was otw to get matcha and i ran into drizzy",
  coverUrl = "",
  playlistUrl,            // optional: external link
  onOpen,                  // optional: callback to open a modal/page
}) {
  const isDisabled = !playlistUrl && !onOpen;

  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    if (onOpen) {
      e.preventDefault();
      onOpen();
    }
    // if playlistUrl exists and no onOpen, normal <a> navigation happens
  };

  return (
    <section className="playlistSection">
      <h2 className="playlistSection__title">Go-to Playlist</h2>

      <div className="playlistCard">
        <div className="playlistCard__body">
          {coverUrl ? (
            <img className="playlistCard__image" src={coverUrl} alt="Playlist cover" />
          ) : (
            <div className="playlistCard__placeholder" aria-hidden="true" />
          )}

          <div className="playlistCard__text">
            <h3 className="playlistCard__title">
              <a
                className="playlistCard__titleLink"
                href={playlistUrl || "#"}
                onClick={handleClick}
                aria-disabled={isDisabled ? "true" : undefined}
                title={isDisabled ? "Playlist coming soon" : "Open playlist"}
              >
                {title}
              </a>
            </h3>

            <p className="playlistCard__desc">{description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
