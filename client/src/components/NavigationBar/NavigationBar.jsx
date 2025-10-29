import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./NavigationBar.css";
import { getUser, clearUser } from "../../lib/userStorage";

export default function NavigationBar() {
  const [open, setOpen] = useState(false);
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
      <aside className={`nav ${open ? "nav--open" : ""}`}>
        <div className="navBrand">
          <button className="navBurger closeBtn" onClick={() => setOpen(false)}>
            ✕
          </button>
          <div className="logo">
            Coogs<br />Music
          </div>
        </div>

        <nav className="navSection">
          <div className="navTitle">Dashboard</div>
          <Link className="navLink" to="/home" onClick={() => setOpen(false)}>🏠 Home</Link>
          <Link className="navLink" to="/subscription" onClick={() => setOpen(false)}>⭐ Subscription</Link>
          <Link className="navLink" to={isArtist ? "/artist-analytics" : "/listener-analytics"} onClick={() => setOpen(false)}>
            📈 My Analytics
          </Link>
        </nav>

        {isAdmin && (
          <nav className="navSection">
            <div className="navTitle">Admin</div>
            <Link className="navLink" to="/report-review" onClick={() => setOpen(false)}>🛠️ Admin Report Review</Link>
          </nav>
        )}

        <nav className="navSection">
          <div className="navTitle">Social</div>
          <Link className="navLink" to="/profile" onClick={() => setOpen(false)}>👤 My Profile</Link>
          <Link className="navLink" to="/edit-profile" onClick={() => setOpen(false)}>✏️ Edit Profile</Link>
          <Link className="navLink" to="/follows" onClick={() => setOpen(false)}>👥 Connections</Link>
        </nav>

        <nav className="navSection">
          <div className="navTitle">Library</div>
          <Link className="navLink" to="/likedsongs" onClick={() => setOpen(false)}>🤍 Favorite Songs</Link>
          <Link className="navLink" to="/me/playlists" onClick={() => setOpen(false)}>🎧 Playlists</Link>
        </nav>

        {isArtist && (
          <nav className="navSection">
            <div className="navTitle">Artist</div>
            <Link className="navLink" to="/my-ads" onClick={() => setOpen(false)}>📢 My Ads</Link>
            <Link className="navLink" to="/buy-ads" onClick={() => setOpen(false)}>📣 Upload Ad</Link>
            <Link className="navLink" to="/upload/song" onClick={() => setOpen(false)}>🎵 Upload Song</Link>
            <Link className="navLink" to="/upload/album" onClick={() => setOpen(false)}>💿 Create Album</Link>
          </nav>
        )}

        {/* Logout Section - Always at bottom */}
        <nav className="navSection navSection--logout">
          <button className="navLink logoutBtn" onClick={handleLogout}>
            🚪 Log Out
          </button>
        </nav>

      </aside>

      {!open && (
        <header className="topbar">
          <button className="navBurger openBtn" onClick={() => setOpen(true)}>
            ☰
          </button>
        </header>
      )}
    </>
  );
}
