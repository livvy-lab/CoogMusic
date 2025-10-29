import { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";
import { useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout/PageLayout";
import { Play, Shuffle, Clock3, Heart } from "lucide-react";
import "./LikedPage.css";

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

  const { playList, playSong, playShuffled } = usePlayer();

  // Unlike handler for liked songs view
  async function unlikeSong(songId) {
    try {
      const res = await fetch(`http://localhost:3001/listeners/${listenerId}/liked_songs/toggle`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId })
      });
      if (!res.ok) throw new Error('toggle-failed');
      const data = await res.json();
      // dispatch event so other components update
      try { window.dispatchEvent(new CustomEvent('likedChanged', { detail: { songId, liked: data.liked } })); } catch (e) {}
      if (!data.liked) setTracks((prev) => prev.filter((t) => t.SongID !== songId));
    } catch (err) {
      console.error('Error toggling liked song:', err);
    }
  }

  // play whole list
  function handlePlayAll() {
    if (!tracks || tracks.length === 0) return;
    const list = tracks.map((t) => ({ SongID: t.SongID, Title: t.title, ArtistName: t.artist }));
    playList(list, 0);
  }

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let url;

        if (isLikedSongs) {
          url = `http://localhost:3001/listeners/${listenerId}/liked_songs`;
        } else {
          url = `http://localhost:3001/playlists/${id}/tracks`;
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
            <button className="playButton" aria-label="Play" onClick={handlePlayAll}>
              <Play fill="currentColor" size={28} />
            </button>
            <button className="shuffleButton" aria-label="Shuffle" onClick={() => {
              if (!tracks || tracks.length === 0) return;
              const list = tracks.map((t) => ({ SongID: t.SongID, Title: t.title, ArtistName: t.artist }));
              try { playShuffled?.(list); } catch (e) { playList(list, 0); }
            }}>
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
                <div
                  key={t.SongID || i}
                  className="likedRow"
                  onClick={() => playSong({ SongID: t.SongID, Title: t.title, ArtistName: t.artist })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') playSong({ SongID: t.SongID, Title: t.title, ArtistName: t.artist }); }}
                >
                  <div className="col-num">{i + 1}</div>
                  <div className="col-heart">
                    {isLikedSongs ? (
                      <button
                        className="heartBtn"
                        onClick={(e) => { e.stopPropagation(); unlikeSong(t.SongID); }}
                        aria-label={isLikedSongs ? 'Unlike' : 'Like'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Heart size={16} color="#782355" fill="#782355" />
                      </button>
                    ) : (
                      <Heart size={16} color="#782355" fill="none" />
                    )}
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
