import { Play, Shuffle } from "lucide-react";
import "./PlayShuffleControls.css";

export default function PlayShuffleControls({ onPlay, onShuffle }) {
  return (
    <div className="likedControls">
      <button className="playButton" onClick={onPlay}><Play fill="currentColor" /></button>
      <button className="shuffleButton" onClick={onShuffle}><Shuffle /></button>
    </div>
  );
}
