import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, Shuffle, Clock3, Heart, Pencil } from "lucide-react";
import PageLayout from "../components/PageLayout/PageLayout.jsx";
import "./LikedPage.css"; // reuse your same CSS
import "./PlaylistRowOverrides.css"; // minimal, playlist-scoped layout tweaks
import { usePlayer } from "../context/PlayerContext.jsx";
import { API_BASE_URL } from "../config/api";
import EditPlaylistModal from "../components/Playlist/EditPlaylistModal";

export default function PlaylistPage() {
  const { id } = useParams(); // read playlist ID from URL
  const [tracks, setTracks] = useState([]);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [playlistOwner, setPlaylistOwner] = useState(""); // New state for the owner name
  const [coverUrl, setCoverUrl] = useState(null);
  const navigate = useNavigate();
  const { playList, playSong, playShuffled } = usePlayer();
  const [editing, setEditing] = useState(false);

  // fetch playlist metadata AND owner name
  async function fetchPlaylistInfo() {
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylistInfo(data);

        let ownerName = "Unknown Owner";
        
        if (data.ArtistID) {
          // It's an artist playlist
          try {
            const ar = await fetch(`${API_BASE_URL}/artists/${data.ArtistID}`);
            const ad = await ar.json();
            ownerName = ad.ArtistName || ad.artistName || "Unknown Artist";
          } catch (e) { console.error(e); }
        } 
        else if (data.ListenerID) {
          // It's a listener playlist
          try {
            const lr = await fetch(`${API_BASE_URL}/listeners/${data.ListenerID}`);
            const ld = await lr.json();
            // Prioritize Username, then First+Last
            const uName = ld.Username || ld.username;
            const fName = ld.FirstName || ld.firstName;
            const lName = ld.LastName || ld.lastName;
            
            if (uName) {
              ownerName = uName;
            } else if (fName || lName) {
              ownerName = `${fName || ""} ${lName || ""}`.trim();
            } else {
              ownerName = `User ${data.ListenerID}`;
            }
          } catch (e) { console.error(e); }
        }
        setPlaylistOwner(ownerName);
        // --- FIX END ---

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
    } catch (err) {
      console.error("Error fetching playlist info:", err);
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
        artistId: row.ArtistID || row.ArtistId || null,
        duration: row.DurationSeconds
          ? `${Math.floor(row.DurationSeconds / 60)}:${String(
              row.DurationSeconds % 60
            ).padStart(2, "0")}`
          : "0:00",
        // Use the date the song was added to the playlist when available
        date: new Date(row.DateSongAdded || row.ReleaseDate || Date.now()).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      }));
      setTracks(formatted);

      // If artist info is missing for some rows, try to fetch per-song details and patch
      (async () => {
        const toResolve = formatted.filter(
          (f) => !f.artistId && (!f.artist || f.artist === "Unknown Artist")
        );
        for (const r of toResolve) {
          try {
            const s = await fetch(`${API_BASE_URL}/songs/${r.SongID}`);
            if (!s.ok) continue;
            const sj = await s.json();
            const name = sj?.ArtistName || sj?.Artist || null;
            const aid = sj?.ArtistID || sj?.ArtistId || null;
            if (name || aid) {
              setTracks((prev) =>
                prev.map((p) =>
                  p.SongID === r.SongID
                    ? { ...p, artist: name || p.artist, artistId: aid || p.artistId }
                    : p
                )
              );
            }
          } catch (e) {
            // ignore
          }
        }
      })();
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
                {/* UPDATED: Display resolved name instead of ID */}
                {playlistInfo
                  ? `${playlistOwner} • ${tracks.length} songs`
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
            {/* Edit button: shows modal to rename playlist, change cover and remove songs */}
            <button className="playlistEditBtn" aria-label="Edit playlist" onClick={() => setEditing(true)} title="Edit playlist">
              <Pencil size={22} color="#782355" strokeWidth={1.6} />
            </button>
          </div>
        </section>

        {editing && playlistInfo && (
          <EditPlaylistModal
            playlist={playlistInfo}
            tracks={tracks}
            onClose={() => setEditing(false)}
            onUpdated={(updatedPlaylist, updatedTracks) => {
              // update local state
              setPlaylistInfo(prev => prev ? { ...prev, ...updatedPlaylist } : prev);
              if (Array.isArray(updatedTracks)) setTracks(updatedTracks);
              // notify other components (playlist grid) about the update
              try {
                window.dispatchEvent(new CustomEvent('playlistUpdated', { detail: { ...updatedPlaylist } }));
              } catch (e) {}
            }}
          />
        )}

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
                onClick={() => {
                  // set full playlist queue so player next/prev work
                  try {
                    const list = (tracks || []).map((s) => ({ SongID: s.SongID, Title: s.title, ArtistName: s.artist }));
                    if (list.length > 0) { playList(list, i); return; }
                  } catch (e) {}
                  playSong({ SongID: t.SongID, Title: t.title, ArtistName: t.artist });
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') {
                  const list = (tracks || []).map((s) => ({ SongID: s.SongID, Title: s.title, ArtistName: s.artist }));
                  if (list.length > 0) { playList(list, i); return; }
                  playSong({ SongID: t.SongID, Title: t.title, ArtistName: t.artist });
                } }}
              >
                <div className="col-num">{i + 1}</div>
                <div className="col-title">
                  <div className="songInfo">
                    <span className="songTitle">{t.title}</span>
                      <span className="songArtist">
                      <button
                        className="artistLink"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            if (t.artistId) { navigate(`/artist/${t.artistId}`); return; }
                            const r = await fetch(`${API_BASE_URL}/songs/${t.SongID}`);
                            if (!r.ok) return;
                            const j = await r.json();
                            const artistId = j?.ArtistID || j?.ArtistId || j?.artistId || j?.artistID;
                            if (artistId) navigate(`/artist/${artistId}`);
                          } catch (err) {
                            console.error('Failed to navigate to artist', err);
                          }
                        }}
                      >
                        {t.artist}
                      </button>
                    </span>
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
