// client/src/pages/PlaylistPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Clock3, Heart } from "lucide-react";
import PageLayout from "../components/PageLayout/PageLayout.jsx";
import "./LikedPage.css"; // reuse existing style
import AddToPlaylistMenu from "../components/Playlist/AddToPlaylistMenu";
import { usePlayer } from "../context/PlayerContext";
import PlayShuffleControls from "../components/LikedPage/PlayShuffleControls";

export default function PlaylistPage() {
  const { id } = useParams(); // read playlist ID from URL
  const [tracks, setTracks] = useState([]);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const { playSong } = usePlayer();

  // fetch playlist metadata
  async function fetchPlaylistInfo() {
    const res = await fetch(`http://localhost:3001/playlists/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPlaylistInfo(data);
    }
  }

  // fetch all songs in playlist
  async function fetchPlaylistTracks() {
    const res = await fetch(`http://localhost:3001/playlists/${id}/tracks`);
    if (res.ok) {
      const data = await res.json();
      const formatted = data.map((row) => ({
        SongID: row.SongID,
        title: row.Title,
        artist: row.ArtistName || "Unknown Artist",
        album: row.Album || "Unknown Album",
        duration: row.DurationSeconds
          ? `${Math.floor(row.DurationSeconds / 60)}:${String(
              row.DurationSeconds % 60
            ).padStart(2, "0")}`
          : "0:00",
        date: new Date(row.ReleaseDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      }));
      setTracks(formatted);
    }
  }

  useEffect(() => {
    fetchPlaylistInfo();
    fetchPlaylistTracks();
  }, [id]);

  // ✅ When Play button clicked, pop up bottom Music Bar
  const handlePlayClick = () => {
    if (tracks.length > 0) {
      playSong({
        SongID: tracks[0].SongID || 999,
        Title: playlistInfo?.Name || "Playlist",
        ArtistName: "Various Artists",
        url: "", // no real audio yet
      });
    } else {
      playSong({
        SongID: 999,
        Title: playlistInfo?.Name || "Empty Playlist",
        ArtistName: "—",
        url: "",
      });
    }
  };

  const handleShuffleClick = () => {
    console.log("Shuffle clicked!");
    handlePlayClick();
  };

  return (
    <PageLayout>
      <div className="albumPage">
        {/* ===== HEADER ===== */}
        <section className="albumCard headerCard">
          <div className="likedHeaderLeft">
            <div className="likedCoverCircle">
              <Heart size={100} fill="#fff" color="#fff" strokeWidth={1.5} />
            </div>

            <div className="likedHeaderText">
              <p className="playlistLabel">PLAYLIST</p>
              <h1 className="likedTitle">
                {playlistInfo ? playlistInfo.Name : "Loading..."}
              </h1>
              <p className="likedUser">
                {playlistInfo
                  ? `User ${playlistInfo.ListenerID} • ${tracks.length} songs`
                  : ""}
              </p>
            </div>
          </div>

          {/* ✅ Reused component for buttons */}
          <PlayShuffleControls
            onPlay={handlePlayClick}
            onShuffle={handleShuffleClick}
          />
        </section>

        {/* ===== TRACK LIST ===== */}
        <section className="albumCard listCard">
          <div className="likedTableHeader">
            <div className="th th-num">#</div>
            <div className="th th-title">Title</div>
            <div className="th th-album">Album</div>
            <div className="th th-date">Date Added</div>
            <div className="th th-dur">
              <Clock3 size={16} color="#782355" />
            </div>
          </div>

          <div className="tableBody">
            {tracks.map((t, i) => (
              <div
                key={i}
                className="likedRow"
                onClick={() =>
                  playSong({
                    SongID: t.SongID,
                    Title: t.title,
                    ArtistName: t.artist,
                    url: "",
                  })
                }
                style={{ cursor: "pointer" }}
              >
                <div className="col-num">{i + 1}</div>
                <div className="col-title">
                  <div className="songInfo">
                    <span className="songTitle">{t.title}</span>
                    <span className="songArtist">{t.artist}</span>
                  </div>
                </div>
                <div className="col-album">{t.album}</div>
                <div className="col-date">{t.date}</div>
                <div className="col-duration flex items-center gap-2">
                  {t.duration}
                  <AddToPlaylistMenu songId={t.SongID} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
