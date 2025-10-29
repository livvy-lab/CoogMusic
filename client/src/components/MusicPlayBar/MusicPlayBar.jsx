// client/src/components/MusicPlayBar/MusicPlayBar.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Range, getTrackBackground } from "react-range";
import { usePlayer } from "../../context/PlayerContext.jsx";
import "./MusicPlayBar.css";

import skipBackIcon from "../../assets/skip-back-icon.svg";
// note: asset files were named inconsistently (play-icon contains pause bars and vice versa).
// Swap imports so the variables match their visual meaning: `playIcon` should be the triangle,
// and `pauseIcon` should be the bars.
import playIcon from "../../assets/pause-icon.svg";
import pauseIcon from "../../assets/play-icon.svg";
import skipFwdIcon from "../../assets/skip-fwd-icon.svg";
import shuffleIcon from "../../assets/shuffle-icon.svg";
import repeatIcon from "../../assets/repeat-icon.svg";
import heartIcon from "../../assets/heart-icon.svg";
import volumeIcon from "../../assets/volume-icon.svg";
import lowVolumeIcon from "../../assets/low-volume-icon.svg";
import muteVolumeIcon from "../../assets/mute-volume-icon.svg";

export default function MusicPlayBar() {
  const {
    current,            // { SongID, Title, ArtistName, url, mime }
    playing,            // boolean
    duration,           // seconds
    currentTime,        // seconds
    volume,             // 0..1
      toggle,             // play/pause
      shuffleMode,
      toggleShuffle,
      next,
      prev,
      seek,               // (seconds) => void
    setVolumePercent,   // (0..1) => void
      toggleLikeCurrent,
      audioRef,
  } = usePlayer();

  // keep hooks order stable (don’t early return)
  const [isSeeking, setIsSeeking] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [volOpen, setVolOpen] = useState(false);
  const volumeRef = useRef(null);

  const hidden = !current;

  const fmt = (t) => {
    if (!t || Number.isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const volPct = Math.round((volume ?? 0) * 100);
  const volIcon = volPct === 0 ? muteVolumeIcon : volPct <= 50 ? lowVolumeIcon : volumeIcon;

  const progressStyle = useMemo(() => {
    const pct = duration ? (currentTime / duration) * 100 : 0;
    return { background: `linear-gradient(to right, #895674 ${pct}%, #FFE8F5 ${pct}%)` };
  }, [currentTime, duration]);

  // When the current song changes, fetch whether it's liked by this listener
  useEffect(() => {
    let mounted = true;
    async function checkLiked() {
      setIsLiked(false);
      if (!current?.SongID) return;
      const stored = localStorage.getItem('listener');
      const listenerId = stored ? JSON.parse(stored).ListenerID : 6;
      try {
        const res = await fetch(`http://localhost:3001/listeners/${listenerId}/liked_songs`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const found = Array.isArray(data) && data.some((r) => r.SongID === current.SongID);
        setIsLiked(Boolean(found));
      } catch (err) {
        // ignore
      }
    }
    checkLiked();
    return () => { mounted = false; };
  }, [current]);

  return (
    <div
      className="music-player-bar"
      style={{ display: hidden ? "none" : "flex" }}
      aria-hidden={hidden ? "true" : "false"}
    >
      <div className="player-controls-left">
        <button className="control-btn" aria-label="Previous" onClick={() => prev?.()}>
          <img src={skipBackIcon} alt="" />
        </button>

        {/* Play/pause: show PAUSE icon while playing, PLAY icon when paused */}
        {(() => {
          const isPlaying = audioRef?.current ? !audioRef.current.paused && !audioRef.current.ended : playing;
          return (
            <button
              className="control-btn play-pause-btn"
              onClick={toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
        {/* use the original image assets so the button color/shape stays the same */}
        <img src={isPlaying ? pauseIcon : playIcon} alt="" />
            </button>
          );
        })()}

        <button className="control-btn" aria-label="Next" onClick={() => next?.()}>
          <img src={skipFwdIcon} alt="" />
        </button>
      </div>

      <div className="progress-section">
        <button className={`control-btn small-btn ${shuffleMode ? 'is-active' : ''}`} aria-label="Shuffle" onClick={() => toggleShuffle?.()}>
          <img src={shuffleIcon} alt="" />
        </button>

        <button
          className={`control-btn small-btn ${isRepeating ? "is-active" : ""}`}
          onClick={() => setIsRepeating((v) => !v)}
          aria-pressed={isRepeating}
          aria-label="Repeat"
        >
          <img src={repeatIcon} alt="" />
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
          aria-label="Seek"
        />

        <span className="time-stamp">{fmt(duration)}</span>

        <div className="volume-control" ref={volumeRef}>
          <button
            className="control-btn small-btn"
            onClick={() => setVolOpen((v) => !v)}
            aria-expanded={volOpen}
            aria-label="Volume"
          >
            <img src={volIcon} alt="" />
          </button>

          <div className={`volume-slider-container ${volOpen ? "is-visible" : ""}`}>
            <Range
              direction="to top"
              values={[volPct]}
              step={1}
              min={0}
              max={100}
              onChange={(vals) => setVolumePercent((vals[0] || 0) / 100)}
              renderTrack={({ props, children }) => {
                // pull key out so React doesn’t warn about spreading it
                const { key, ...trackProps } = props;
                return (
                  <div
                    key={key}
                    {...trackProps}
                    className="volume-track"
                    style={{
                      ...trackProps.style,
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
                );
              }}
              renderThumb={({ props }) => {
                const { key, ...thumbProps } = props;
                return <div key={key} {...thumbProps} className="volume-thumb" />;
              }}
            />
          </div>
        </div>

        <button
          className={`control-btn small-btn ${isLiked ? "is-active" : ""}`}
          onClick={async () => {
            // Optimistic UI
            setIsLiked((v) => !v);
            try {
              if (typeof toggleLikeCurrent === 'function') {
                const res = await toggleLikeCurrent();
                // if backend returned liked state, ensure UI matches
                if (res && typeof res.liked === 'boolean') setIsLiked(Boolean(res.liked));
              } else {
                // fallback: direct fetch + dispatch
                const stored = localStorage.getItem('listener');
                const listenerId = stored ? JSON.parse(stored).ListenerID : 6;
                if (current?.SongID) {
                  const res = await fetch(`http://localhost:3001/listeners/${listenerId}/liked_songs/toggle`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId: current.SongID })
                  });
                  if (res.ok) {
                    const data = await res.json();
                    window.dispatchEvent(new CustomEvent('likedChanged', { detail: { songId: current.SongID, liked: data.liked } }));
                    setIsLiked(Boolean(data.liked));
                  }
                }
              }
            } catch (err) {
              // if something fails, flip back
              setIsLiked((v) => !v);
            }
          }}
          aria-pressed={isLiked}
          aria-label="Like"
        >
          <img src={heartIcon} alt="" />
        </button>
      </div>

      <div className="player-controls-right">
        <div className="album-art" />
        <div className="meta">
          <div className="title">{current?.Title || "Untitled"}</div>
          <div className="artist">{current?.ArtistName || "Unknown Artist"}</div>
        </div>
      </div>
    </div>
  );
}
