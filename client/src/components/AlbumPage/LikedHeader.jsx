import { Heart } from "lucide-react";
import "./LikedHeader.css";

export default function LikedHeader({ title = "Liked Songs", owner = "coolgirl", count = 0 }) {
  return (
    <div className="likedHeader">
      <div className="likedInfo">
        <div className="likedCover">
          <Heart className="likedIcon" />
        </div>
        <div>
          <p className="playlistLabel">PLAYLIST</p>
          <h1 className="likedTitle">{title}</h1>
          <p className="likedUser">{owner} • {count} songs</p>
        </div>
      </div>
    </div>
  );
}
