import PageLayout from "../components/PageLayout/PageLayout.jsx";
import { useMemo } from "react";
import { Play, Shuffle, Clock3, Heart } from "lucide-react";
import "./LikedPage.css"; // make sure your CSS filename matches this

export default function LikedSong() {
  // build tracks + sort newest first
  const tracks = useMemo(() => {
    const data = Array.from({ length: 40 }).map((_, i) => ({
      title: "Kill Bill",
      artist: "SZA",
      album: "SOS",
      added: new Date(2025, 9, 10 + (i % 7)), // October 10–16, 2025
      duration: "2:33",
    }));
    return data.sort((a, b) => b.added - a.added);
  }, []);

  return (
    <PageLayout>
      <div className="albumPage">
        {/* 🎵 Header Section */}
        <section className="albumCard headerCard">
          <div className="likedHeaderLeft">
            <div className="likedCoverCircle">
              <Heart size={100} fill="#fff" color="#fff" strokeWidth={1.5} />
            </div>

            <div className="likedHeaderText">
              <p className="playlistLabel">PLAYLIST</p>
              <h1 className="likedTitle">Liked Songs</h1>
              <p className="likedUser">coolgirl • {tracks.length} songs</p>
            </div>
          </div>

          <div className="likedControls">
            <button className="playButton" aria-label="Play">
              <Play fill="currentColor" size={28} />
            </button>
            <button className="shuffleButton" aria-label="Shuffle">
              <Shuffle size={24} />
            </button>
          </div>
        </section>

        {/* 💿 Track List Section */}
        <section className="albumCard listCard">
          {/* Table Header */}
          <div className="likedTableHeader">
            <div className="th th-num">#</div>
            <div className="th th-heart">
              <Heart size={18} fill="#782355" color="#782355" />
            </div>
            <div className="th th-title">Title</div>
            <div className="th th-album">Album</div>
            <div className="th th-date">Date added</div>
            <div className="th th-dur">
              <Clock3 size={16} color="#782355" />
            </div>
          </div>

          {/* Track Rows */}
          <div className="tableBody">
            {tracks.map((t, i) => (
              <div key={i} className="likedRow">
                <div className="col-num">{i + 1}</div>

                <div className="col-heart">
                  <button className="heartBtn" aria-label="Like">
                    <Heart
                      size={18}
                      color="#782355"
                      strokeWidth={2}
                      fill="none"
                    />
                  </button>
                </div>

                <div className="col-title">
                  <div className="songCoverPlaceholder" />
                  <div className="songInfo">
                    <span className="songTitle">{t.title}</span>
                    <span className="songArtist">{t.artist}</span>
                  </div>
                </div>

                <div className="col-album">{t.album}</div>
                <div className="col-date">
                  {t.added.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="col-duration">{t.duration}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
