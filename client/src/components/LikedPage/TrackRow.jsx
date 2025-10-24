import { useState } from "react";
import { Heart } from "lucide-react";
import blankCover from "../../assets/blank-cover.jpg";
import "./TrackRow.css";

export default function TrackRow({ index, track }) {
  // 💜 Since it's the Liked Songs page, start as liked
  const [liked, setLiked] = useState(true);

  const toggleLike = () => setLiked(!liked);

  return (
    <div className="likedRow">
      {/* Track number */}
      <div className="trackIndex">{index}</div>

      {/* Heart toggle */}
      <button
        className={`heartBtn ${liked ? "active" : ""}`}
        aria-label={liked ? "Unlike" : "Like"}
        onClick={toggleLike}
      >
        <Heart
          size={18}
          stroke="#782355"
          fill={liked ? "#782355" : "none"}
          strokeWidth={2}
          className="trackHeart"
        />
      </button>

      {/* Album cover */}
      <div className="trackCover">
        <img src={blankCover} alt="album cover" />
      </div>

      {/* Song title & artist */}
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
