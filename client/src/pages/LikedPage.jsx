import { useEffect, useState } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";
import { Play, Shuffle, Clock3, Heart } from "lucide-react";
import PageLayout from "../components/PageLayout/PageLayout.jsx";
import "./LikedPage.css";
import { API_BASE_URL } from "../config/api";
import { getUser } from "../lib/userStorage";

export default function LikedPage() {
  const [tracks, setTracks] = useState([]);
  // derive listener id from same helper other components use
  const user = getUser();
  const listenerId = user?.listenerId ?? user?.ListenerID ?? 6;

  const { playList, playSong, playShuffled } = usePlayer();

  // --- Fetch liked songs
  async function fetchLikedSongs() {
    try {
  const res = await fetch(`${API_BASE_URL}/listeners/${listenerId}/liked_songs`);
      if (!res.ok) throw new Error("Failed to fetch liked songs");
      const data = await res.json();

      console.log("✅ Raw liked songs data:", data);

      // Format results for UI
      const formatted = data.map((row) => ({
        SongID: row.SongID,
        title: row.Title,
        artist: row.ArtistName || "Unknown Artist",
        album: row.Album || "Unknown Album",
        duration: row.DurationSeconds
          ? `${Math.floor(row.DurationSeconds / 60)}:${String(row.DurationSeconds % 60).padStart(2, "0")}`
          : "0:00",
        date: row.LikedDate
          ? new Date(row.LikedDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "N/A",
      }));

      // sort newest first
      formatted.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTracks(formatted);
      console.log("🎵 Formatted tracks:", formatted);
    } catch (err) {
      console.error("❌ Error fetching liked songs:", err);
    }
  }

  // --- Unlike a song
  async function unlikeSong(songId) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/listeners/${listenerId}/liked_songs/toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId }),
        }
      );
      if (!res.ok) throw new Error("Toggle failed");
      const data = await res.json();

      // Notify other parts of the app that liked state changed
      try {
        window.dispatchEvent(new CustomEvent('likedChanged', { detail: { songId, liked: data.liked } }));
      } catch (e) {}

      // If the backend reports the song is now unliked, remove it from this page
      if (!data.liked) {
        setTracks((prev) => prev.filter((t) => t.SongID !== songId));
      }
    } catch (err) {
      console.error("Error unliking song:", err);
    }
  }

  // --- Handle play button: play the whole liked list
  function handlePlayAll() {
    if (!tracks || tracks.length === 0) return;
    // map to minimal song objects PlayerContext expects
    const list = tracks.map((t) => ({ SongID: t.SongID, Title: t.title, ArtistName: t.artist }));
    playList(list, 0);
  }

  useEffect(() => {
    fetchLikedSongs();
  }, []);

  // update list when likes change elsewhere (music bar)
  useEffect(() => {
    function onLikedChanged(e) {
      const { songId, liked } = e.detail || {};
      if (!songId) return;
      if (!liked) {
        // remove from list if present
        setTracks((prev) => prev.filter((t) => t.SongID !== songId));
      } else {
        // refresh whole list (safe and simple)
        fetchLikedSongs();
      }
    }
    window.addEventListener('likedChanged', onLikedChanged);
    return () => window.removeEventListener('likedChanged', onLikedChanged);
  }, []);

  return (
    <PageLayout>
      <div className="albumPage">
        {/* Header */}
        <section className="albumCard headerCard">
          <div className="likedHeaderLeft">
              <div className="likedCoverCircle">
                <Heart size={100} fill="#fff" color="#fff" strokeWidth={1.5} />
              </div>
            <div className="likedHeaderText">
              <p className="playlistLabel">PLAYLIST</p>
              <h1 className="likedTitle">Liked Songs</h1>
              <p className="likedUser">
                {tracks.length
                  ? `${tracks.length} track${tracks.length > 1 ? "s" : ""}`
                  : "No tracks"}
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
              // use playShuffled if available
              try { playShuffled?.(list); } catch (e) { playList(list, 0); }
            }}>
              <Shuffle size={24} />
            </button>
          </div>
        </section>

        {/* Table */}
        <section className="albumCard listCard">
          <div className="likedTableHeader">
            <div className="th th-num">#</div>
            <div className="th th-title">Title</div>
            <div className="th th-album">Album</div>
            <div className="th th-date">Date Liked</div>
            <div className="th th-dur">
              <Clock3 size={16} color="#782355" />
            </div>
          </div>

          <div className="tableBody">
            {tracks.length === 0 ? (
              <p style={{ padding: "1rem", color: "#aaa" }}>No liked songs found.</p>
            ) : (
                      tracks.map((t, i) => (
                        <div
                          key={t.SongID}
                          className="likedRow"
                          onClick={() => playSong({ SongID: t.SongID, Title: t.title, ArtistName: t.artist })}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') playSong({ SongID: t.SongID, Title: t.title, ArtistName: t.artist }); }}
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
                  <div className="col-duration">
                    {t.duration}
                    <button
                      onClick={(e) => { e.stopPropagation(); unlikeSong(t.SongID); }}
                      style={{
                        background: "none",
                        border: "none",
                        marginLeft: "10px",
                        cursor: "pointer",
                      }}
                      aria-label="Unlike song"
                    >
                      <Heart size={18} fill="#a94486" color="#a94486" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
