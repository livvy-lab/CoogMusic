import { useState, useEffect, useCallback } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout/PageLayout";
import EditAlbumModal from "../components/EditAlbumModal/EditAlbumModal";
import { Play, Shuffle, Clock3, Edit } from "lucide-react";
import "./AlbumView.css";
import { API_BASE_URL } from "../config/api";
import { getUser } from "../lib/userStorage";

export default function AlbumView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [albumData, setAlbumData] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coverCache, setCoverCache] = useState({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const { playList, playSong, playShuffled } = usePlayer();

  useEffect(() => {
    try {
      const stored = getUser();
      setCurrentUser(stored);
    } catch (err) {
      console.error("Error getting user:", err);
    }
  }, []);

  function handlePlayAll() {
    if (!tracks || tracks.length === 0) return;
    const list = tracks.map((t) => ({
      SongID: t.SongID,
      Title: t.title,
      ArtistName: t.artist,
    }));
    playList(list, 0);
  }

  function formatDuration(seconds) {
    if (!seconds || seconds === 0) return "0:00";
    const totalSeconds = Number(seconds) || 0;
    const mins = Math.floor(totalSeconds / 60);
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  const isOwnAlbum = () => {
    if (!currentUser || !albumData) return false;
    const userId = currentUser.artistId || currentUser.ArtistID;
    const albumArtistId = albumData.ArtistID;
    return userId === albumArtistId;
  };

  const fetchAlbumData = useCallback(async () => {
    try {
      setLoading(true);
      const albumRes = await fetch(`${API_BASE_URL}/albums/${id}`);
      if (!albumRes.ok) throw new Error("Album not found");
      const album = await albumRes.json();
      setAlbumData(album);

      if (album.cover_media_id) {
        try {
          const mediaRes = await fetch(
            `${API_BASE_URL}/media/${album.cover_media_id}`
          );
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            setCoverUrl(mediaData?.url || null);
          }
        } catch (e) {
          console.error("Error loading cover:", e);
        }
      }

      const tracksRes = await fetch(`${API_BASE_URL}/albums/${id}/tracks`);
      if (!tracksRes.ok) throw new Error("Failed to load tracks");
      const tracksData = await tracksRes.json();

      console.log("🎵 Raw tracks API response:", tracksData);

      const formatted = tracksData.map((row) => {
        const durationSecs = Number(row.DurationSeconds || row.duration_seconds || 0);
        console.log(`Track: "${row.Title}" - DurationSeconds: ${durationSecs}s (${formatDuration(durationSecs)})`);
        return {
          SongID: row.SongID,
          title: row.Title,
          artist: row.ArtistName || album.ArtistName || "Unknown Artist",
          artistId: row.ArtistID || album.ArtistID || null,
          trackNumber: row.TrackNumber || 0,
          durationSeconds: durationSecs,
          duration: formatDuration(durationSecs),
          cover_media_id: row.cover_media_id,
        };
      });

      formatted.sort((a, b) => a.trackNumber - b.trackNumber);
      setTracks(formatted);
    } catch (err) {
      console.error("❌ Error fetching album data:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAlbumData();
    }
  }, [id, fetchAlbumData]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const needed = tracks
        .map((t) => t.cover_media_id)
        .filter((id) => id && !(id in coverCache));
      const uniqueNeeded = [...new Set(needed)];
      if (!uniqueNeeded.length) return;

      const results = await Promise.all(
        uniqueNeeded.map(async (id) => {
          try {
            const r = await fetch(`${API_BASE_URL}/media/${id}`);
            if (!r.ok) return [id, null];
            const j = await r.json();
            return [id, j?.url || null];
          } catch {
            return [id, null];
          }
        })
      );

      if (!alive) return;
      setCoverCache((prev) => {
        const next = { ...prev };
        for (const [id, url] of results) {
          next[id] = url;
        }
        return next;
      });
    })();
    return () => {
      alive = false;
    };
  }, [tracks, coverCache]);

  const handleEditSuccess = async () => {
    setEditModalOpen(false);
    if (id) {
      await fetchAlbumData();
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="albumPage">
          <h2>Loading album...</h2>
        </div>
      </PageLayout>
    );
  }

  if (!albumData) {
    return (
      <PageLayout>
        <div className="albumPage">
          <h2>Album not found</h2>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="albumPage">
        {/* === HEADER === */}
        <section className="albumCard headerCard">
          <div className="albumHeaderLeft">
            <div className="albumCover">
              <img
                src={
                  coverUrl || "https://placehold.co/200x200/E6D8E2/782355?text=Album"
                }
                alt={`${albumData.Title} cover`}
                className="albumCoverImg"
                onError={(e) =>
                  (e.target.src =
                    "https://placehold.co/200x200/E6D8E2/782355?text=Album")
                }
              />
            </div>
            <div className="albumHeaderText">
              <p className="albumLabel">ALBUM</p>
              <h1 className="albumTitle">{albumData.Title}</h1>
              <p className="albumInfo">
                <button
                  className="artistLink"
                  onClick={() =>
                    albumData.ArtistID &&
                    navigate(`/artist/${albumData.ArtistID}`)
                  }
                >
                  {albumData.ArtistName || "Unknown Artist"}
                </button>
                {" • "}
                {albumData.ReleaseDate
                  ? new Date(albumData.ReleaseDate).getFullYear()
                  : ""}
                {" • "}
                {tracks.length} track{tracks.length === 1 ? "" : "s"}
              </p>
              {albumData.Description && (
                <div
                  style={{
                    marginTop: "13px",
                    fontSize: "1.09rem",
                    color: "#895674",
                    opacity: 0.95,
                    maxWidth: "540px",
                  }}
                  className="albumBio"
                >
                  {albumData.Description}
                </div>
              )}
            </div>
          </div>
          <div className="albumControls">
            <button
              className="playButton controlButton"
              aria-label="Play album"
              onClick={handlePlayAll}
            >
              <Play fill="currentColor" size={28} />
            </button>
            <button
              className="shuffleButton controlButton"
              aria-label="Shuffle"
              onClick={() => {
                if (!tracks || tracks.length === 0) return;
                const list = tracks.map((t) => ({
                  SongID: t.SongID,
                  Title: t.title,
                  ArtistName: t.artist,
                }));
                try {
                  playShuffled?.(list);
                } catch (e) {
                  playList(list, 0);
                }
              }}
            >
              <Shuffle size={24} />
            </button>
            {isOwnAlbum() && (
              <button
                className="controlButton editButton"
                aria-label="Edit album"
                onClick={() => setEditModalOpen(true)}
              >
                <Edit size={20} />
              </button>
            )}
          </div>
        </section>

        {/* === TRACK LIST === */}
        <section className="albumCard listCard">
          <div className="albumTableHeader">
            <div className="th th-num">#</div>
            <div className="th th-cover"></div>
            <div className="th th-title">Title</div>
            <div className="th th-dur">
              <Clock3 size={16} color="#782355" />
            </div>
          </div>
          <div className="tableBody">
            {tracks.length === 0 ? (
              <p className="noTracks">No tracks in this album.</p>
            ) : (
              tracks.map((t, i) => {
                const trackCoverUrl = t.cover_media_id && coverCache[t.cover_media_id]
                  ? coverCache[t.cover_media_id]
                  : null;
                return (
                  <div
                    key={t.SongID || i}
                    className="albumRow"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      try {
                        const list = (tracks || []).map((s) => ({
                          SongID: s.SongID,
                          Title: s.title,
                          ArtistName: s.artist,
                        }));
                        if (list.length > 0) {
                          playList(list, i);
                          return;
                        }
                      } catch (err) {
                        console.error("Error playing track:", err);
                      }
                      playSong({
                        SongID: t.SongID,
                        Title: t.title,
                        ArtistName: t.artist,
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const list = (tracks || []).map((s) => ({
                          SongID: s.SongID,
                          Title: s.title,
                          ArtistName: s.artist,
                        }));
                        if (list.length > 0) {
                          playList(list, i);
                          return;
                        }
                        playSong({
                          SongID: t.SongID,
                          Title: t.title,
                          ArtistName: t.artist,
                        });
                      }
                    }}
                  >
                    <div className="col-num">{t.trackNumber || i + 1}</div>
                    <div className="col-cover">
                      {trackCoverUrl ? (
                        <img src={trackCoverUrl} alt="track cover" className="trackCover" />
                      ) : (
                        <div className="trackCover trackCoverPlaceholder" />
                      )}
                    </div>
                    <div className="col-title">
                      <span className="songTitle">{t.title}</span>
                    </div>
                    <div className="col-duration">{t.duration}</div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
      {/* Edit Album Modal */}
      <EditAlbumModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        album={{
          AlbumID: albumData.AlbumID,
          title: albumData.Title,
          description: albumData.Description,
          artist_id: albumData.ArtistID,
          cover_media_id: albumData.cover_media_id,
        }}
      />
    </PageLayout>
  );
}
