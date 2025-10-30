import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout/PageLayout";
import { Play, Shuffle, Clock3, Heart } from "lucide-react";
import "./LikedPage.css";
import { API_BASE_URL } from "../config/api";

export default function PlaylistView({ isLikedSongs = false }) {
  const { id } = useParams();
  const [tracks, setTracks] = useState([]);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistOwner, setPlaylistOwner] = useState("");
  const [loading, setLoading] = useState(true);

  const storedListener = localStorage.getItem("listener");
  const listenerId = storedListener
    ? JSON.parse(storedListener).ListenerID
    : 6;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let url;

        if (isLikedSongs) {
          url = `${API_BASE_URL}/listeners/${listenerId}/liked_songs`;
        } else {
          url = `${API_BASE_URL}/playlists/${id}/tracks`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (isLikedSongs) {
          const formatted = data.map((row) => ({
            SongID: row.SongID,
            title: row.Title,
            artist: row.Artist || "Unknown Artist",
            album: row.Album || "Unknown Album",
            added: new Date(row.LikedDate || Date.now()),
            duration: row.DurationSeconds
              ? `${Math.floor(row.DurationSeconds / 60)}:${String(
                  row.DurationSeconds % 60
                ).padStart(2, "0")}`
              : "0:00",
          }));
          setTracks(formatted.sort((a, b) => b.added - a.added));
          setPlaylistName("Liked Songs");
          setPlaylistOwner("You");
        } else {
          const formatted = data.map((row) => ({
            SongID: row.SongID,
            title: row.Title,
            artist: row.Artist || "Unknown Artist",
            album: row.Album || "Unknown Album",
            added: new Date(row.ReleaseDate || Date.now()),
            duration: row.DurationSeconds
              ? `${Math.floor(row.DurationSeconds / 60)}:${String(
                  row.DurationSeconds % 60
                ).padStart(2, "0")}`
              : "0:00",
          }));
          setTracks(formatted);
          setPlaylistName("Study Vibes");
          setPlaylistOwner("You");
        }
      } catch (err) {
        console.error("❌ Error fetching playlist data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, isLikedSongs, listenerId]);

  if (loading) {
    return (
      <PageLayout>
        <div className="albumPage">
          <h2>Loading your playlist...</h2>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="albumPage">
        {/* === HEADER === */}
        <section className="albumCard headerCard">
          <div className="likedHeaderLeft">
            <div className="likedCoverCircle">
              {isLikedSongs ? (
                <Heart size={120} fill="#fff" color="#fff" strokeWidth={1.5} />
              ) : (
                <img
                  src="/default-cover.png"
                  alt="Playlist Cover"
                  className="playlistCoverImg"
                />
              )}
            </div>

            <div className="likedHeaderText">
              <p className="playlistLabel">PLAYLIST</p>
              <h1 className="likedTitle">{playlistName}</h1>
              <p className="likedUser">
                {playlistOwner} • {tracks.length} songs
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

        {/* === TABLE === */}
        <section className="albumCard listCard">
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

          <div className="tableBody">
            {tracks.length === 0 ? (
              <p className="noTracks">No songs found.</p>
            ) : (
              tracks.map((t, i) => (
                <div key={t.SongID || i} className="likedRow">
                  <div className="col-num">{i + 1}</div>
                  <div className="col-heart">
                    <Heart
                      size={16}
                      color="#782355"
                      fill={isLikedSongs ? "#782355" : "none"}
                    />
                  </div>
                  <div className="col-title">
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
              ))
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
