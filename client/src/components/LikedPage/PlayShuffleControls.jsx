import { Play, Shuffle } from "lucide-react";
import { useState, useRef } from "react";
import MusicPlayBar from "../MusicPlayBar/MusicPlayBar.jsx"; // Assuming the location of MusicPlayBar
import "./PlayShuffleControls.css";

export default function PlayShuffleControls({ onShuffle }) {
  const [currentSong, setCurrentSong] = useState(null);
  const audioRef = useRef(null);

  // onPlay function to set the current song and trigger play
  const onPlay = (song) => {
    setCurrentSong(song);

    const audio = audioRef.current;
    if (audio && song?.url) {
      audio.src = song.url; // Set the source of the audio element
      audio.play().catch((err) => {
        console.error("Error playing the audio: ", err);
      });
    }
  };

  return (
    <div className="likedControls">
      {/* Play button triggers the onPlay function */}
      <button className="playButton" onClick={() => onPlay(onShuffle)}>
        <Play fill="currentColor" />
      </button>
      {/* Shuffle button triggers onShuffle function */}
      <button className="shuffleButton" onClick={onShuffle}>
        <Shuffle />
      </button>

      {/* Include MusicPlayBar */}
      {currentSong && <MusicPlayBar song={currentSong} />}
      
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} preload="auto" />
    </div>
  );
}
