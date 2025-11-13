import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout/PageLayout";
import { Play, Shuffle, Clock3, Heart } from "lucide-react";
import "./LikedPage.css";
import { API_BASE_URL } from "../../config/api";

export default function PlaylistView({ isLikedSongs = false, variant = "default" }) {

  const { id } = useParams(); // used for /playlist/:id
  const [tracks, setTracks] = useState([]);
  const navigate = useNavigate();
  const [playlistName, setPlaylistName] = useState("");
  const [playlistOwner, setPlaylistOwner] = useState("");
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState(null);

  // 🧠 fallback for local testing
  const storedListener = localStorage.getItem("listener");
  const listenerId = storedListener
    ? JSON.parse(storedListener).ListenerID
    : 6; // fallback to your test account

  // Fetch liked songs or playlist tracks
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let url;

  if (isLikedSongs) {
          // fetch liked songs
          url = `${API_BASE_URL}/listeners/${listenerId}/liked_songs`;
        } else {
          // fetch songs from a playlist
          url = `${API_BASE_URL}/playlists/${id}/tracks`;
        }

        const res = await fetch(url);
        const data = await res.json();

        // Handle liked songs
        if (isLikedSongs) {
          const formatted = data.map((row) => ({
            SongID: row.SongID,
            title: row.Title,
            artist: row.ArtistName || row.Artist || "Unknown Artist",
            artistId: row.ArtistID || row.ArtistId || null,
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
          // Handle playlist view
          const formatted = data.map((row) => ({
            SongID: row.SongID,
            title: row.Title,
            artist: row.ArtistName || row.Artist || "Unknown Artist",
            artistId: row.ArtistID || row.ArtistId || null,
            album: row.Album || "Unknown Album",
            added: new Date(row.ReleaseDate || Date.now()),
            duration: row.DurationSeconds
              ? `${Math.floor(row.DurationSeconds / 60)}:${String(
                  row.DurationSeconds % 60
                ).padStart(2, "0")}`
              : "0:00",
          }));
          setTracks(formatted);

          // If any tracks lack artist info, try to resolve them by fetching /songs/:id
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
                // ignore individual failures
              }
            }
          })();
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

    if (!isLikedSongs && id) {
      (async () => {
        try {
          const r = await fetch(`${API_BASE_URL}/playlists/${id}`);
          if (!r.ok) return;
          const j = await r.json();
          if (j?.Name) setPlaylistName(j.Name);
          if (j?.cover_media_id) {
            try {
              const m = await fetch(`${API_BASE_URL}/media/${j.cover_media_id}`);
              if (m.ok) {
                const mj = await m.json();
                setCoverUrl(mj?.url || null);
              }
            } catch (e) {}
          }
        } catch (e) {
          // ignore
        }
      })();
    }
  }, [id, isLikedSongs, listenerId]);

  // Listen for cover updates and refresh cover URL if this playlist changed
  useEffect(() => {
    function onCoverUpdated(e) {
      const d = e?.detail;
      if (!d) return;
      if (!id) return;
      if (Number(d.PlaylistID) !== Number(id)) return;
      if (!d.cover_media_id) {
        setCoverUrl(null);
        return;
      }
      (async () => {
        try {
          const m = await fetch(`${API_BASE_URL}/media/${d.cover_media_id}`);
          if (!m.ok) return;
          const mj = await m.json();
          setCoverUrl(mj?.url || null);
        } catch (e) {}
      })();
    }

    window.addEventListener('playlistCoverUpdated', onCoverUpdated);
    return () => window.removeEventListener('playlistCoverUpdated', onCoverUpdated);
  }, [id]);

  // 🔄 show loading spinner
  if (loading) {
    return (
      <PageLayout>
        <div className="albumPage">
          <h2>Loading your playlist...</h2>
        </div>
      </PageLayout>
    );
  }

  // 🎧 Render playlist or liked songs
return (
  <PageLayout>
    {/* 🎵 wrapper for scoping styles */}
    <div className={`playlistView ${variant}`}>
      <div className="albumPage">
        {/* 🎵 Header Section */}
        <section className="albumCard headerCard">
          <div className="likedHeaderLeft">
            <div className="likedCoverCircle">
              {isLikedSongs ? (
                <Heart size={100} fill="#fff" color="#fff" strokeWidth={1.5} />
              ) : (
                <img
                  src={coverUrl || "/default-cover.png"}
                  alt="Playlist Cover"
                  className="playlistCoverImg"
                />
              )}
            </div>

            <div className="likedHeaderText">
              <p className="playlistLabel">PLAYLIST</p>
              <h1 className="likedTitle">{playlistName}</h1>
              <p className="likedUser">
                {playlistOwner} • {tracks.length} track{tracks.length === 1 ? "" : "s"}
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

        {/* 💿 Track List Section */}
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
              <p className="noTracks">No tracks found.</p>
            ) : (
              tracks.map((t, i) => (
                <div key={t.SongID || i} className="likedRow">
                  <div className="col-num">{i + 1}</div>

                  <div className="col-heart">
                    <button className="heartBtn" aria-label="Like">
                      <Heart
                        size={18}
                        color="#782355"
                        strokeWidth={2}
                        fill={isLikedSongs ? "#782355" : "none"}
                      />
                    </button>
                  </div>

                  <div className="col-title">
                    <div className="songCoverPlaceholder" />
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
      </div> {/* end albumPage */}
    </div> {/* end playlistView */}
  </PageLayout>
);
}
