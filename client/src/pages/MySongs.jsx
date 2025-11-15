import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout/PageLayout";
import "./MySongs.css";
import { API_BASE_URL } from "../config/api";
import { getUser } from "../lib/userStorage";
import { usePlayer } from "../context/PlayerContext";

function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function createSongKey(title, album) {
  const cleanTitle = title?.trim().toLowerCase() || "unknown_title";
  let cleanAlbum = album?.trim().toLowerCase() || "single";
  if (cleanAlbum === "null" || cleanAlbum === "") {
    cleanAlbum = "single";
  }
  return `${cleanTitle}::${cleanAlbum}`;
}

export default function MySongs() {
  const [tracks, setTracks] = useState([]);
  const [artistInfo, setArtistInfo] = useState({ id: null, name: "You" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { playSong } = usePlayer();
  const [covers, setCovers] = useState({});

  const [isInitLoading, setIsInitLoading] = useState(true);
  const [startDate, setStartDate] = useState(null);

  useEffect(() => {
    try {
      const stored = getUser() || null;
      if (stored?.artistId || stored?.ArtistID) {
        setArtistInfo({
          id: stored.artistId ?? stored.ArtistID,
          name: stored.username || "You",
        });
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error loading user info", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const artistId = getUser()?.artistId;
    if (!artistId) {
      setIsInitLoading(false);
      return;
    }
    fetch(`${API_BASE_URL}/analytics/artist/${artistId}/init`)
      .then((r) => r.json())
      .then((data) => {
        setStartDate(data.firstReleaseDate?.slice(0, 10) || todayOffset(-30));
      })
      .catch((err) => {
        console.error("Failed to fetch first release date, using default.", err);
        setStartDate(todayOffset(-30));
      })
      .finally(() => {
        setIsInitLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!artistInfo.id || isInitLoading || !startDate) return;

    async function fetchData() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          startDate: startDate,
          endDate: todayOffset(0),
          sort: "songTitle",
          order: "asc",
        }).toString();
        
        const songListUrl = `${API_BASE_URL}/artists/${artistInfo.id}/songs`;
        const analyticsUrl = `${API_BASE_URL}/analytics/artist/${artistInfo.id}/summary?${params}`;

        const [songListRes, analyticsRes] = await Promise.all([
          fetch(songListUrl),
          fetch(analyticsUrl),
        ]);

        if (!songListRes.ok) throw new Error("Failed to fetch song list");
        if (!analyticsRes.ok) throw new Error("Failed to fetch analytics");

        const songListData = await songListRes.json();
        const analyticsData = await analyticsRes.json();

        const analyticsMap = new Map();
        if (analyticsData.songs) {
          for (const song of analyticsData.songs) {
            const key = createSongKey(song.songTitle, song.album);
            analyticsMap.set(key, {
              streams: song.totalStreams,
              likes: song.totalLikes,
            });
          }
        }

        const formatted = songListData.map((row) => {
          const key = createSongKey(row.Title, row.AlbumName);
          const analytics = analyticsMap.get(key);
          
          const dateStr = row.ReleaseDate 
            ? String(row.ReleaseDate).slice(0, 10) 
            : null;
          
          return {
            SongID: row.SongID,
            title: row.Title,
            artist: row.ArtistName || "Unknown Artist",
            artistId: row.ArtistID || null,
            album: row.AlbumName,
            added: new Date(dateStr ? `${dateStr}T00:00:00Z` : Date.now()),
            duration: row.DurationSeconds
              ? `${Math.floor(row.DurationSeconds / 60)}:${String(
                  row.DurationSeconds % 60
                ).padStart(2, "0")}`
              : "0:00",
            streams: analytics ? analytics.streams : 0,
            likes: analytics ? analytics.likes : 0,
            cover_media_id: row.cover_media_id || null,
          };
        });

        setTracks(formatted);
      } catch (err) {
        console.error("Error fetching combined artist songs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [artistInfo.id, isInitLoading, startDate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const needed = tracks
        .map((s) => s.cover_media_id)
        .filter((id) => id && !(id in covers));
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
      setCovers((prev) => {
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
  }, [tracks, covers]);

  const filteredTracks = useMemo(() => {
    if (!search) return tracks;
    return tracks.filter((t) =>
      t.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [tracks, search]);

  const handlePlay = (track) => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/songs/${track.SongID}`);
        if (!res.ok) throw new Error("Song not found");
        const fullSongData = await res.json();
        playSong(fullSongData);
      } catch (err) {
        console.error("Failed to play song:", err);
      }
    })();
  };

  const handleTakeDown = async (songId, songTitle, e) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to take down "${songTitle}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/songs/${songId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to take down song");

      // Remove from local state
      setTracks((prev) => prev.filter((t) => t.SongID !== songId));
      alert(`"${songTitle}" has been taken down successfully.`);
    } catch (err) {
      console.error("Error taking down song:", err);
      alert("Failed to take down song. Please try again.");
    }
  };

  if ((loading || isInitLoading) && !tracks.length) {
    return (
      <PageLayout>
        <div className="albumPage">
          <h2>Loading your songs...</h2>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <h1 className="my-songs-page-title">My Songs</h1>
      <div className="playlistView">
        <div className="albumPage">
          <section className="albumCard listCard">
            <div className="list-controls-header">
              <input
                type="text"
                placeholder="Search your songs..."
                className="my-songs-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="my-songs-total">
                Total Songs: {filteredTracks.length}
              </span>
            </div>

            <div className="tableBody">
              {(loading || isInitLoading) && <p className="noTracks">Loading...</p>}
              {!loading && !isInitLoading && filteredTracks.length === 0 ? (
                <p className="noTracks">
                  {search
                    ? "No songs match your search."
                    : "You haven't uploaded any songs yet."}
                </p>
              ) : (
                filteredTracks.map((t, i) => {
                  const coverUrl = t.cover_media_id && covers[t.cover_media_id]
                    ? covers[t.cover_media_id]
                    : null;
                  return (
                    <div
                      key={t.SongID || i}
                      className="my-song-row"
                      onClick={() => handlePlay(t)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="ms-title-image-wrap">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={t.title}
                            className="ms-cover-image"
                          />
                        ) : (
                          <div className="ms-cover-image" />
                        )}
                        <div className="ms-info">
                          <span className="ms-title">{t.title}</span>
                        </div>
                      </div>

                      <div className="ms-meta-info">
                        <span className="ms-meta-item">
                          <strong>Album:</strong> {t.album}
                        </span>
                        <span className="ms-meta-item">
                          <strong>Uploaded:</strong> {t.added.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="ms-meta-item">
                          <strong>Likes:</strong> {t.likes}
                        </span>
                        <span className="ms-meta-item">
                          <strong>Streams:</strong> {t.streams}
                        </span>
                        <span className="ms-meta-item">
                          <strong>Length:</strong> {t.duration}
                        </span>
                      </div>

                      <button
                        className="ms-take-down-btn"
                        onClick={(e) => handleTakeDown(t.SongID, t.title, e)}
                        title="Take down this song"
                      >
                        Take Down
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}