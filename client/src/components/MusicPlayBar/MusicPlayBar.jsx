import React, { useState, useRef, useEffect } from 'react';
import { Range, getTrackBackground } from 'react-range';
import './MusicPlayBar.css';
import skipBackIcon from '../../assets/skip-back-icon.svg';
import playIcon from '../../assets/play-icon.svg';
import pauseIcon from '../../assets/pause-icon.svg';
import skipFwdIcon from '../../assets/skip-fwd-icon.svg';
import shuffleIcon from '../../assets/shuffle-icon.svg';
import repeatIcon from '../../assets/repeat-icon.svg';
import heartIcon from '../../assets/heart-icon.svg';
import volumeIcon from '../../assets/volume-icon.svg';
import lowVolumeIcon from '../../assets/low-volume-icon.svg';
import muteVolumeIcon from '../../assets/mute-volume-icon.svg';

const currentSong = {
  albumArt: "https://via.placeholder.com/60",
};

export default function MusicPlayBar() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [isSeeking, setIsSeeking] = useState(false);
  
  const [isVolumeSliderVisible, setIsVolumeSliderVisible] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false); // state for repeat functionality
  const [isLiked, setIsLiked] = useState(false);       // state for like functionality

  const audioRef = useRef(null);
  const volumeControlRef = useRef(null); 

  // effect to handle play/pause and load metadata (simplified for single file)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // set initial volume
    audio.volume = volume / 100;

    // sets the audio element's loop property
    audio.loop = isRepeating;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime);
      }
    };
    
    // if the song ends, and loop is false, set isPlaying to false.
    const handleSongEnd = () => {
        if (!isRepeating) {
            setIsPlaying(false);
            setCurrentTime(0); // reset time if not looping
        }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleSongEnd);

    if (isPlaying) {
      audio.play().catch(e => console.error("Audio playback error:", e));
    } else {
      audio.pause();
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleSongEnd);
    };
  }, [isPlaying, isSeeking, volume, isRepeating]);


  // close slider when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (volumeControlRef.current && !volumeControlRef.current.contains(event.target)) {
        setIsVolumeSliderVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [volumeControlRef]);

  // handlers for the audio element
  const handleProgressChange = (e) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    audioRef.current.currentTime = newTime;
  };


  const formatTime = (time) => {
    if (isNaN(time) || !time) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const getVolumeIcon = () => {
    if (volume === 0) return muteVolumeIcon;
    if (volume <= 50) return lowVolumeIcon;
    return volumeIcon;
  };

  const getProgressFillStyle = () => {
    const percentage = duration ? (currentTime / duration) * 100 : 0;
    return {
      background: `linear-gradient(to right, #895674 ${percentage}%, #FFE8F5 ${percentage}%)`
    };
  };

  return (
    <div className="music-player-bar">
      <audio 
        ref={audioRef} 
        src="https://cs1.mp3.pm/download/226459992/bW1YekhUMHRLajh3a0M5SzZybFVBbXJUTlZ6QWlPR3Z6bjFSZnp6M3BNanpjNFI1OEp4OW85VUxsejZXT08rYnY0bG5sWlhycmpsWWhOZzZ2R2lqYUl1OHFJZ3cwcmxXNXRDVy9uY2h4ZS9ucnV5aUpyZkdvbzYzR3Fmbk9xUjM/runami_-_twice_-_moonlight_sunrise_pluggnb_flip_rxi_(mp3.pm).mp3"
      />

      <div className="player-controls-left">
        <button className="control-btn"><img src={skipBackIcon} alt="Skip Back" /></button>
        <button className="control-btn play-pause-btn" onClick={() => setIsPlaying(!isPlaying)}>
          {/* play/pause logic */}
          <img src={isPlaying ? playIcon : pauseIcon} alt="Play/Pause" />
        </button>
        <button className="control-btn"><img src={skipFwdIcon} alt="Skip Forward" /></button>
      </div>

      <div className="progress-section">
        <button className="control-btn small-btn"><img src={shuffleIcon} alt="Shuffle" /></button>
        
        {/* repeat Button: toggles isRepeating state */}
        <button 
          className={`control-btn small-btn ${isRepeating ? 'is-active' : ''}`}
          onClick={() => setIsRepeating(!isRepeating)}
        >
          <img src={repeatIcon} alt="Repeat" />
        </button>
        
        <span className="time-stamp">{formatTime(currentTime)}</span>
        <input 
          type="range" 
          className="progress-bar"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleProgressChange}
          onMouseDown={() => setIsSeeking(true)}
          onMouseUp={() => setIsSeeking(false)}
          style={getProgressFillStyle()}
        />
        <span className="time-stamp">{formatTime(duration)}</span>
        
        <div className="volume-control" ref={volumeControlRef}>
          <button 
            className="control-btn small-btn"
            onClick={() => setIsVolumeSliderVisible(!isVolumeSliderVisible)}
          >
            <img src={getVolumeIcon()} alt="Volume"/>
          </button>
          
          <div 
            className={`volume-slider-container ${isVolumeSliderVisible ? 'is-visible' : ''}`}
          >
            <Range
              direction="to top"
              values={[volume]}
              step={1}
              min={0}
              max={100}
              onChange={(values) => setVolume(values[0])}
              renderTrack={({ props, children }) => (
                <div
                  {...props}
                  className="volume-track"
                  style={{
                    ...props.style,
                    background: getTrackBackground({
                      values: [volume],
                      colors: ['#FFE8F5', '#895674'],
                      min: 0,
                      max: 100,
                      direction: 'to top'
                    }),
                  }}
                >
                  {children}
                </div>
              )}
              renderThumb={({ props }) => (
                <div {...props} className="volume-thumb" />
              )}
            />
          </div>
        </div>
        
        {/* heart Button: toggles isLiked state */}
        <button 
            className={`control-btn small-btn ${isLiked ? 'is-active' : ''}`}
            onClick={() => setIsLiked(!isLiked)}
        >
            <img src={heartIcon} alt="Like" />
        </button>
      </div>

      <div className="player-controls-right">
        <img src={currentSong.albumArt} alt="Album Art" className="album-art" />
      </div>
    </div>
  );
}
