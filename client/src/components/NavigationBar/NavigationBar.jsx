import { useState } from "react";
import "./NavigationBar.css";

export default function NavigationBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className={`nav ${open ? "nav--open" : ""}`}>
        <div className="navBrand">
          <button className="navBurger" onClick={() => setOpen(false)}>✕</button>
          <div className="logo">Coogs<br />Music</div>
        </div>

        <nav className="navSection">
          <div className="navTitle">Dashboard</div>
          <a className="navLink">⌂ Home</a>
        </nav>

        <nav className="navSection">
          <div className="navTitle">Social</div>
          <a className="navLink">👤 My Profile</a>
          <a className="navLink">✏️ Edit Profile</a>
          <a className="navLink">👥 Friends</a>
        </nav>

        <nav className="navSection">
          <div className="navTitle">Library</div>
          <a className="navLink">❤ Favorite Songs</a>
          <a className="navLink">🎧 Playlists</a>
        </nav>
      </aside>

      <header className="topbar">
        <button className="navBurger" onClick={() => setOpen(true)}>☰</button>
      </header>
    </>
  );
}
