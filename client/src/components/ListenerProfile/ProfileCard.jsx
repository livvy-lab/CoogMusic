import "./ProfileCard.css";

export default function ProfileCard() {
  return (
    <section className="pc">
      <div className="pc__avatarWrap">
        <img src={avatar} alt="" className="pc__avatar" />
      </div>
      <div className="pc__about">
        <div className="pc__heading">About coolgirl&lt;3</div>
        <div className="pc__meta">
          <span>Major: Computer Science</span>
          <span>Minor: Business Administration</span>
        </div>
        <p className="pc__bio">
          Super awesome cool girl who loves music and is super cool and nonchalant.
        </p>
        <div className="pc__stats">
          <button>20 followers</button>
          <button>20 following</button>
          <button>5 playlists</button>
        </div>
      </div>
      <div className="pc__songs">🎵 1,500 songs</div>
    </section>
  );
}
