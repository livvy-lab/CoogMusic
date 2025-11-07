import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./NavigationBar.css";
import { getUser, clearUser } from "../../lib/userStorage";

export default function NavigationBar() {
  const navigate = useNavigate();
  const user = useMemo(() => getUser(), []);
  const isArtist = (user?.accountType || "").toLowerCase() === "artist";
  const isAdmin = (user?.accountType || "").toLowerCase() === "admin";

  const handleLogout = () => {
    clearUser();
    navigate("/login");
  };

  return (
    <>
      {/* Invisible hover trigger area on the left edge */}
      <div className="navHoverTrigger" />
      
      <aside className="nav">
        <div className="navBrand">
          <div className="logo">
            Coogs<br />Music
          </div>
        </div>

        <nav className="navSection">
          <div className="navTitle">Dashboard</div>
          <Link className="navLink" to="/home">🏠 Home</Link>
          <Link className="navLink" to="/subscription">⭐ Subscription</Link>
          <Link className="navLink" to={isArtist ? "/artist-analytics" : "/listener-analytics"}>
            📈 My Analytics
          </Link>
        </nav>

        {isAdmin && (
          <nav className="navSection">
            <div className="navTitle">Admin</div>
            <Link className="navLink" to="/report-review">🛠️ Admin Report Review</Link>
          </nav>
        )}

        <nav className="navSection">
          <div className="navTitle">Social</div>
          <Link className="navLink" to="/profile">👤 My Profile</Link>
          <Link className="navLink" to="/edit-profile">✏️ Edit Profile</Link>
          <Link className="navLink" to="/follows">👥 Connections</Link>
        </nav>

        <nav className="navSection">
          <div className="navTitle">Library</div>
          <Link className="navLink" to="/likedsongs">🤍 Favorite Tracks</Link>
          <Link className="navLink" to="/me/playlists">🎧 Playlists</Link>
        </nav>

        {isArtist && (
          <nav className="navSection">
            <div className="navTitle">Artist</div>
            <Link className="navLink" to="/my-ads">📢 My Ads</Link>
            <Link className="navLink" to="/buy-ads">📣 Upload Ad</Link>
            <Link className="navLink" to="/upload/song">🎵 Upload Song</Link>
            <Link className="navLink" to="/upload/album">💿 Create Album</Link>
          </nav>
        )}

        {/* Logout Section - Always at bottom */}
        <nav className="navSection navSection--logout">
          <button className="navLink logoutBtn" onClick={handleLogout}>
            🚪 Log Out
          </button>
        </nav>

      </aside>
    </>
  );
}
