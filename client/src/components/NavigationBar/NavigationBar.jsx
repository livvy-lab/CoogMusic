import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./NavigationBar.css";
import { getUser, clearUser } from "../../lib/userStorage";

export default function NavigationBar() {
  const navigate = useNavigate();
  const user = useMemo(() => getUser(), []);
  const isArtist = (user?.accountType || "").toLowerCase() === "artist";

  // Open the sidebar by default for artists (desktop layout in Figma)
  const [open, setOpen] = useState(() => !!isArtist);

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
        </nav>

        <nav className="navSection">
          <div className="navTitle">Social</div>
          <Link className="navLink" to="/profile" onClick={() => setOpen(false)}>👤 My Profile</Link>
          <Link className="navLink" to="/edit-profile" onClick={() => setOpen(false)}>✏️ Edit Profile</Link>
          <Link className="navLink" to="/friends" onClick={() => setOpen(false)}>👥 Friends</Link>
        </nav>

        <nav className="navSection">
          <div className="navTitle">Library</div>
          <Link className="navLink" to="/likedsongs" onClick={() => setOpen(false)}>🤍 Favorite Songs</Link>
          <Link className="navLink" to="/me/playlists" onClick={() => setOpen(false)}>🎧 Playlists</Link>
        </nav>

        {isArtist && (
          <nav className="navSection">
            <div className="navTitle">Artist</div>
            <Link className="navLink" to="/artist-dashboard" onClick={() => setOpen(false)}>🏁 Dashboard</Link>
            <Link className="navLink" to="/artists" onClick={() => setOpen(false)}>🎤 Artists</Link>
            <Link className="navLink" to="/upload/song" onClick={() => setOpen(false)}>⬆️ Upload Music</Link>
            <Link className="navLink" to="/upload/album" onClick={() => setOpen(false)}>💿 Create Album</Link>
            <Link className="navLink" to="/buy-ads" onClick={() => setOpen(false)}>📣 Promote My Music</Link>
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
