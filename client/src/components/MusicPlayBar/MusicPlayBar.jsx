import React, { useMemo, useRef, useState } from "react";
import { Range, getTrackBackground } from "react-range";
import { usePlayer } from "../../context/PlayerContext.jsx";
import "./MusicPlayBar.css";
import skipBackIcon from "../../assets/skip-back-icon.svg";
import playIcon from "../../assets/play-icon.svg";
import pauseIcon from "../../assets/pause-icon.svg";
import skipFwdIcon from "../../assets/skip-fwd-icon.svg";
import shuffleIcon from "../../assets/shuffle-icon.svg";
import repeatIcon from "../../assets/repeat-icon.svg";
import heartIcon from "../../assets/heart-icon.svg";
import volumeIcon from "../../assets/volume-icon.svg";
import lowVolumeIcon from "../../assets/low-volume-icon.svg";
import muteVolumeIcon from "../../assets/mute-volume-icon.svg";

export default function MusicPlayBar() {
  const {
    current,        // { SongID, Title, ArtistName, url, mime }
    playing,        // boolean
    duration,       // seconds (number)
    currentTime,    // seconds (number)
    volume,         // 0..1
    toggle,         // play/pause
    seek,           // (seconds) => void
    setVolumePercent, // (0..1) => void
  } = usePlayer();

  // Hide the bar until a song is selected
  if (!current) return null;

  const [isSeeking, setIsSeeking] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [volOpen, setVolOpen] = useState(false);
  const volumeRef = useRef(null);

  function fmt(t) {
    if (!t || Number.isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  const volPct = Math.round((volume ?? 0) * 100);
  const volIcon = volPct === 0 ? muteVolumeIcon : volPct <= 50 ? lowVolumeIcon : volumeIcon;

  const progressStyle = useMemo(() => {
    const pct = duration ? (currentTime / duration) * 100 : 0;
    return { background: `linear-gradient(to right, #895674 ${pct}%, #FFE8F5 ${pct}%)` };
  }, [currentTime, duration]);

  return (
    <div className="music-player-bar">
      <div className="player-controls-left">
        <button className="control-btn"><img src={skipBackIcon} alt="Back" /></button>
        <button className="control-btn play-pause-btn" onClick={toggle}>
          <img src={playing ? pauseIcon : playIcon} alt="Play/Pause" />
        </button>
        <button className="control-btn"><img src={skipFwdIcon} alt="Fwd" /></button>
      </div>

      <div className="progress-section">
        <button className="control-btn small-btn">
          <img src={shuffleIcon} alt="Shuffle" />
        </button>

        <button
          className={`control-btn small-btn ${isRepeating ? "is-active" : ""}`}
          onClick={() => setIsRepeating(!isRepeating)}
        >
          <img src={repeatIcon} alt="Repeat" />
        </button>

        <span className="time-stamp">{fmt(currentTime)}</span>

        <input
          type="range"
          className="progress-bar"
          min="0"
          max={duration || 0}
          value={isSeeking ? undefined : currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          onMouseDown={() => setIsSeeking(true)}
          onMouseUp={() => setIsSeeking(false)}
          onTouchStart={() => setIsSeeking(true)}
          onTouchEnd={() => setIsSeeking(false)}
          style={progressStyle}
        />

        <span className="time-stamp">{fmt(duration)}</span>

        <div className="volume-control" ref={volumeRef}>
          <button className="control-btn small-btn" onClick={() => setVolOpen((v) => !v)}>
            <img src={volIcon} alt="Volume" />
          </button>

          <div className={`volume-slider-container ${volOpen ? "is-visible" : ""}`}>
            <Range
              direction="to top"
              values={[volPct]}
              step={1}
              min={0}
              max={100}
              onChange={(vals) => setVolumePercent((vals[0] || 0) / 100)}
              renderTrack={({ props, children }) => (
                <div
                  {...props}
                  className="volume-track"
                  style={{
                    ...props.style,
                    background: getTrackBackground({
                      values: [volPct],
                      colors: ["#FFE8F5", "#895674"],
                      min: 0,
                      max: 100,
                      direction: "to top",
                    }),
                  }}
                >
                  {children}
                </div>
              )}
              renderThumb={({ props }) => <div {...props} className="volume-thumb" />}
            />
          </div>
        </div>

        <button
          className={`control-btn small-btn ${isLiked ? "is-active" : ""}`}
          onClick={() => setIsLiked((v) => !v)}
        >
          <img src={heartIcon} alt="Like" />
        </button>
      </div>

      <div className="player-controls-right">
        {/* You can wire album art later from your DB/Media table */}
        <div className="album-art" />
        <div className="meta">
          <div className="title">{current.Title}</div>
          <div className="artist">{current.ArtistName}</div>
        </div>
      </div>
    </div>
  );
}
