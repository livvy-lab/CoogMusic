import "./JamCard.css";

export default function JamCard({
  title = "coolgirl<3’s jam",
  coverUrl,
  track = "NOKIA",
  artist = "Drake",
  isPlaying = false,
  onTogglePlay,
}) {
  const fallback = "https://placehold.co/600x600/FFDDEE/895674?text=Album+Art";

  return (
    <aside className="jam">
      <div className="jam__header">
        <h3 className="jam__title">{title}</h3>
      </div>

      {/* Volume button OUTSIDE album art */}
      <button className="jam__volume" aria-label="Volume">🔊</button>

      {/* Album art */}
      <div className="jam__artWrap">
        <img
          src={coverUrl || fallback}
          alt={`${track} cover`}
          className="jam__cover"
        />
      </div>

      {/* Song details */}
      <div className="jam__meta">
        <div className="jam__song">{track}</div>
        <div className="jam__artist">{artist}</div>
      </div>

      {/* Player controls */}
      <div className="jam__controls">
        <button
          className="jam__control jam__play"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶️"}
        </button>
      </div>
    </aside>
  );
}
