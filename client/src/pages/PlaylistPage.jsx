import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Play, Shuffle, Clock3, Heart } from "lucide-react";
import PageLayout from "../components/PageLayout/PageLayout.jsx";
import "./LikedPage.css"; // reuse your same CSS
import AddToPlaylistMenu from "../components/Playlist/AddToPlaylistMenu";





export default function PlaylistPage() {
  const { id } = useParams(); // read playlist ID from URL
  const [tracks, setTracks] = useState([]);
  const [playlistInfo, setPlaylistInfo] = useState(null);

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
        title: row.Title,
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

  return (
    <PageLayout>
      <div className="albumPage">
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

          <div className="likedControls">
            <button className="playButton" aria-label="Play">
              <Play fill="currentColor" size={28} />
            </button>
            <button className="shuffleButton" aria-label="Shuffle">
              <Shuffle size={24} />
            </button>
          </div>
        </section>

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
              <div key={i} className="likedRow">
                <div className="col-num">{i + 1}</div>
                <div className="col-title">
                  <div className="songInfo">
                    <span className="songTitle">{t.title}</span>
                    <span className="songArtist">{t.album}</span>
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
