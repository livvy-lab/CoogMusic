import { useState } from "react";
import { Link } from "react-router-dom";
import "./NavigationBar.css";

export default function NavigationBar() {
  const [open, setOpen] = useState(false);

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
          <Link className="navLink" to="/favorites" onClick={() => setOpen(false)}>🤍 Favorite Songs</Link>
          <Link className="navLink" to="/playlists" onClick={() => setOpen(false)}>🎧 Playlists</Link>
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
