import { Heart, Clock3 } from "lucide-react";
import "./TableHeader.css";

export default function TableHeader() {
  return (
    <div className="likedTableHeader">
      <div className="th th-num">#</div>
      <div className="th th-heart"><Heart size={16} /></div>
      <div className="th th-title">Title</div>
      <div className="th th-album">Album</div>
      <div className="th th-date">Date added</div>
      <div className="th th-dur"><Clock3 size={16} /></div>

    </div>
  );
}
