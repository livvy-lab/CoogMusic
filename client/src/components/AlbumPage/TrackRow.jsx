import { useState } from "react";
import { Heart } from "lucide-react";
import blankCover from "../../assets/blank-cover.jpg";
import "./TrackRow.css";

export default function TrackRow({ index, track }) {
  const [liked, setLiked] = useState(false);

  const toggleLike = () => setLiked(!liked);

  return (
    <div className="likedRow">
      <div className="trackIndex">{index}</div>

      {/* Heart toggle button */}
      <button
        className={`heartBtn ${liked ? "active" : ""}`}
        aria-label="Like"
        onClick={toggleLike}
      >
        <Heart
          size={18}
          stroke="#6e4760"
          fill={liked ? "#6e4760" : "none"} // filled if liked
          strokeWidth={2}
        />
      </button>

      {/* Album cover */}
      <div className="trackCover">
        <img src={blankCover} alt="album cover" />
      </div>

      {/* Song title and artist */}
      <div className="trackInfo">
        <div className="trackTitle">{track.title}</div>
        <div className="trackArtist">{track.artist}</div>
      </div>

      <div className="trackAlbum">{track.album}</div>
      <div className="trackDate">{track.added}</div>
      <div className="trackDuration">{track.duration}</div>
    </div>
  );
}
