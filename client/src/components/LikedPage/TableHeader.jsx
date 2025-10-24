import { Clock3 } from "lucide-react";
import "./TableHeader.css";

export default function TableHeader() {
  return (
    <div className="likedTableHeader">
      <div className="th-num">#</div>
      <div className="th-heart">♥</div>
      <div className="th-title">Title</div>
      <div className="th-album">Album</div>
      <div className="th-date">Date added</div>
      <div className="th-dur">
        <Clock3 size={16} />
      </div>
    </div>
  );
}
