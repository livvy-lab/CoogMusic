import { useState } from "react";
import blankCover from "../../assets/blank-cover.jpg";
import { HeartIcon as SolidHeart } from "@heroicons/react/24/solid";
import { HeartIcon as OutlineHeart } from "@heroicons/react/24/outline";
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
        className={`heartBtn ${liked ? "liked" : ""}`}
        aria-label={liked ? "Unlike" : "Like"}
        onClick={toggleLike}
      >
        {liked ? (
          <SolidHeart
            className="trackHeart"
            style={{ color: "#782355", width: 22, height: 22 }}
          />
        ) : (
          <OutlineHeart
            className="trackHeart"
            style={{ color: "#782355", width: 22, height: 22 }}
          />
        )}
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
