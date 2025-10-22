import "./ProfileCard.css";

export default function ProfileCard() {
  return (
    <section className="pc">
      <div className="pc__avatarWrap">
        {/* Placeholder circle for image */}
        <div className="pc__avatarPlaceholder"></div>
      </div>

      <div className="pc__details">
        <h2 className="pc__heading">About coolgirl&lt;3</h2>
        <div className="pc__meta">
          <span>Major: Computer Science</span>
          <span>Minor: Business Administration</span>
        </div>
        <p className="pc__bio">
          Super awesome cool girl who loves music and is super cool and
          nonchalant she is so cool and awesome
        </p>
        <div className="pc__stats">
          <button>20 followers</button>
          <button>20 following</button>
          <button>5 playlists</button>
        </div>
      </div>

      <div className="pc__songs">
        🎵 1,500 songs
      </div>
    </section>
  );
}
