import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Play, Shuffle, Clock3, Heart } from "lucide-react";
import PageLayout from "../components/PageLayout/PageLayout.jsx";
import "./LikedPage.css"; // reuse your same CSS
import "./PlaylistRowOverrides.css"; // minimal, playlist-scoped layout tweaks
import { usePlayer } from "../context/PlayerContext.jsx";
import { API_BASE_URL } from "../config/api";





export default function PlaylistPage() {
  const { id } = useParams(); // read playlist ID from URL
  const [tracks, setTracks] = useState([]);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const { playList, playSong, playShuffled } = usePlayer();

  // fetch playlist metadata
  async function fetchPlaylistInfo() {
    const res = await fetch(`${API_BASE_URL}/playlists/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPlaylistInfo(data);
      // resolve cover media id to a usable URL if present
      if (data?.cover_media_id) {
        try {
          const m = await fetch(`${API_BASE_URL}/media/${data.cover_media_id}`);
          if (m.ok) {
            const mj = await m.json();
            setCoverUrl(mj?.url || null);
          }
        } catch (e) {
          // ignore
        }
      } else {
        setCoverUrl(null);
      }
    }
  }

  // fetch all songs in playlist
  async function fetchPlaylistTracks() {
    const res = await fetch(`${API_BASE_URL}/playlists/${id}/tracks`);
    if (res.ok) {
      const data = await res.json();
      const formatted = data.map((row) => ({
        SongID: row.SongID,
        title: row.Title,
        album: row.Album || "Unknown Album",
        artist: row.ArtistName || row.Artist || "Unknown Artist",
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

  // Listen for cover updates made elsewhere and refresh header if needed
  useEffect(() => {
    function onCoverUpdated(e) {
      const d = e?.detail;
      if (!d || !playlistInfo) return;
      if (Number(d.PlaylistID) !== Number(playlistInfo.PlaylistID)) return;
      if (!d.cover_media_id) {
        setCoverUrl(null);
        setPlaylistInfo(prev => prev ? { ...prev, cover_media_id: null } : prev);
        return;
      }
      (async () => {
        try {
          const m = await fetch(`${API_BASE_URL}/media/${d.cover_media_id}`);
          if (!m.ok) return;
          const mj = await m.json();
          setCoverUrl(mj?.url || null);
          setPlaylistInfo(prev => prev ? { ...prev, cover_media_id: d.cover_media_id } : prev);
        } catch (e) {}
      })();
    }

    window.addEventListener('playlistCoverUpdated', onCoverUpdated);
    return () => window.removeEventListener('playlistCoverUpdated', onCoverUpdated);
  }, [playlistInfo]);

  // Play the whole playlist
  function handlePlayAll() {
    if (!tracks || tracks.length === 0) return;
    const list = tracks.map((t) => ({ SongID: t.SongID, Title: t.title, ArtistName: t.artist }));
    playList(list, 0);
  }

  // Shuffle-play the playlist
  function handleShuffleAll() {
    if (!tracks || tracks.length === 0) return;
    const list = tracks.map((t) => ({ SongID: t.SongID, Title: t.title, ArtistName: t.artist }));
    try { playShuffled?.(list); } catch (e) { playList(list, 0); }
  }

  return (
    <PageLayout>
      <div className="albumPage playlistPage">
        <section className="albumCard headerCard">
          <div className="likedHeaderLeft">
            <div className="likedCoverCircle">
              {playlistInfo?.IsLikedSongs ? (
                <Heart size={100} fill="#fff" color="#fff" strokeWidth={1.5} />
              ) : (
                // show cover image when available; otherwise leave the gradient background
                coverUrl ? (
                  <img src={coverUrl} alt="Playlist Cover" className="playlistCoverImg" />
                ) : null
              )}
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
            <button className="playButton" aria-label="Play" onClick={handlePlayAll}>
              <Play fill="currentColor" size={28} />
            </button>
            <button className="shuffleButton" aria-label="Shuffle" onClick={handleShuffleAll}>
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
              <div
                key={t.SongID || i}
                className="likedRow"
                role="button"
                tabIndex={0}
                onClick={() => playSong({ SongID: t.SongID, Title: t.title, ArtistName: t.artist })}
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
                <div className="col-duration flex items-center gap-2">{t.duration}</div>

              </div>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
