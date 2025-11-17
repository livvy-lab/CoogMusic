import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext.jsx";
import { Play, Shuffle, Clock3, Heart } from "lucide-react";
import PageLayout from "../components/PageLayout/PageLayout.jsx";
import "./LikedPage.css";
import { API_BASE_URL } from "../config/api";
import { getUser } from "../lib/userStorage";
import { useFavPins } from "../context/FavoritesPinsContext";

export default function LikedPage() {
  const [tracks, setTracks] = useState([]);
  // derive listener id from same helper other components use
  const user = getUser();
  const listenerId = user?.listenerId ?? user?.ListenerID ?? 6;

  const { playList, playSong, playShuffled } = usePlayer();
  const favCtx = useFavPins() || {};
  const navigate = useNavigate();
  const location = useLocation();

  // --- Fetch liked songs
  async function fetchLikedSongs() {
    try {
      console.log(`🎵 [LikedPage] Fetching liked songs for listenerId: ${listenerId}`);
      console.log(`🎵 [LikedPage] Current user:`, user);
  const res = await fetch(`${API_BASE_URL}/listeners/${listenerId}/liked_songs`);
      console.log(`🎵 [LikedPage] Response status:`, res.status);
      if (!res.ok) throw new Error("Failed to fetch liked songs");
      const data = await res.json();

      console.log("✅ [LikedPage] Raw liked songs data:", data);

      // Format results for UI
      // helper to turn a possibly-relative media path into a full URL
      const normalizeUrl = (u) => {
        if (!u) return null;
        try {
          // absolute URL
          const parsed = new URL(u);
          return parsed.href;
        } catch (e) {
          // relative path -> prefix with API_BASE_URL
          if (u.startsWith('/')) return `${API_BASE_URL.replace(/\/$/, '')}${u}`;
          // otherwise return as-is
          return u;
        }
      };

      const formatted = data.map((row) => ({
        SongID: row.SongID,
        title: row.Title,
        artist: row.ArtistName || "Unknown Artist",
        coverUrl: normalizeUrl(
          row.CoverURL || row.CoverUrl || row.coverUrl || row.ArtworkURL || row.ArtworkUrl || row.ImageURL || row.ImageUrl || row.Cover || row.Thumbnail || null
        ),
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

      // Backend already orders by LikedDate DESC, so use that order directly
      setTracks(formatted);

      // If backend provided media IDs (not direct URLs) attempt to resolve them
      // to actual URLs using the /media/:id endpoint. We do this asynchronously
      // and patch the tracks state when URLs are available so thumbnails show up.
      (async () => {
        try {
          // 1) Resolve any explicit media IDs present on the raw rows
          const neededIds = Array.from(
            new Set(
              (data || [])
                .map(r => r.cover_media_id || r.CoverMediaID || r.coverMediaId || r.MediaID || r.media_id)
                .filter(Boolean)
            )
          ).filter(Boolean);

          const idToUrl = {};
          if (neededIds.length) {
            const entries = await Promise.all(
              neededIds.map(async (id) => {
                try {
                  const r = await fetch(`${API_BASE_URL}/media/${id}`);
                  if (!r.ok) return [id, null];
                  const j = await r.json();
                  return [id, normalizeUrl(j?.url || null)];
                } catch (e) {
                  return [id, null];
                }
              })
            );
            Object.assign(idToUrl, Object.fromEntries(entries));
          }

          console.debug('LikedPage: resolved media urls', idToUrl);

          // 2) If a liked_songs row didn't include any cover fields, try fetching
          //    /songs/:id/stream which returns a coverUrl (signed or canonical) for that song.
          const songIdsNeedingCover = (formatted || [])
            .filter(t => !t.coverUrl)
            .map(t => t.SongID)
            .filter(Boolean);

          const songIdToCover = {};
          if (songIdsNeedingCover.length) {
            // fetch in parallel, but be resilient to failures
            const songEntries = await Promise.all(
              songIdsNeedingCover.map(async (sid) => {
                try {
                  const r = await fetch(`${API_BASE_URL}/songs/${sid}/stream`);
                  if (!r.ok) return [sid, null];
                  const j = await r.json();
                  // `coverUrl` is returned by the stream endpoint when available
                  return [sid, normalizeUrl(j?.coverUrl || j?.CoverURL || j?.Cover || null)];
                } catch (e) {
                  return [sid, null];
                }
              })
            );
            Object.assign(songIdToCover, Object.fromEntries(songEntries));
            console.debug('LikedPage: resolved song stream cover urls', songIdToCover);
          }

          // Merge all discovered URLs into the track list: prefer existing coverUrl, then song stream cover, then media-id resolved URL
          const patched = formatted.map(t => {
            if (t.coverUrl) return t; // keep direct URL
            const raw = (data || []).find(r => Number(r.SongID) === Number(t.SongID));

            // 1) Check if we resolved a song-level cover URL
            const songCover = songIdToCover[t.SongID];
            if (songCover) return { ...t, coverUrl: songCover };

            // 2) Otherwise check cover media id mapping
            const mid = raw && (raw.cover_media_id || raw.CoverMediaID || raw.coverMediaId || raw.MediaID || raw.media_id);
            if (mid && idToUrl[mid]) return { ...t, coverUrl: idToUrl[mid] };

            return t;
          });

          console.debug('LikedPage: patched tracks with media/song urls', patched.filter(p => p.coverUrl));
          setTracks(patched);
        } catch (e) {
          console.error('LikedPage: error resolving covers', e);
        }
      })();
      console.log("🎵 [LikedPage] Formatted tracks:", formatted);
    } catch (err) {
      console.error("❌ [LikedPage] Error fetching liked songs:", err);
    }
  }

  // --- Unlike a song
  async function unlikeSong(songId) {
    try {
      // Use FavoritesPinsContext as the single source of truth so the playbar updates immediately
      const toggledToLiked = await (favCtx.toggleFavorite?.(Number(songId)));

      // If it was unliked (toggledToLiked === false), remove from this page
      if (toggledToLiked === false) {
        setTracks((prev) => prev.filter((t) => t.SongID !== songId));
      }

      // Also broadcast for any components that still listen to the event
      try { window.dispatchEvent(new CustomEvent('likedChanged', { detail: { songId, liked: !!toggledToLiked } })); } catch (e) {}
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
    console.log('🎵 [LikedPage] listenerId changed, fetching...', listenerId);
    if (listenerId) {
      fetchLikedSongs();
    }
  }, [listenerId]);

  // Refetch when navigating TO this page
  useEffect(() => {
    console.log('🎵 [LikedPage] Component mounted or location changed, fetching...');
    if (listenerId) {
      fetchLikedSongs();
    }
  }, [location.pathname]);

  // Refetch when navigating back to this page
  useEffect(() => {
    const handleFocus = () => {
      console.log('🎵 [LikedPage] Window focused, refetching...');
      if (listenerId) {
        fetchLikedSongs();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [listenerId]);

  // update list when likes change elsewhere (music bar)
  useEffect(() => {
    function onLikedChanged(e) {
      console.log('🎵 [LikedPage] likedChanged event received:', e.detail);
      const { songId, liked } = e.detail || {};
      if (!songId) return;
      if (!liked) {
        // remove from list if present
        setTracks((prev) => prev.filter((t) => t.SongID !== songId));
      } else {
        // refresh whole list (safe and simple)
        console.log('🎵 [LikedPage] Song was liked, refetching list...');
        fetchLikedSongs();
      }
    }
    window.addEventListener('likedChanged', onLikedChanged);
    return () => window.removeEventListener('likedChanged', onLikedChanged);
  }, [listenerId]);

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
            <div className="th th-heart" title="Liked">
              <Heart size={16} fill="#782355" color="#782355" />
            </div>
            <div className="th th-title">Title</div>
            <div className="th th-album">Album</div>
            <div className="th th-date">Date Liked</div>
            <div className="th th-dur">
              <Clock3 size={16} color="#782355" />
            </div>
          </div>

          <div className="tableBody">
            {tracks.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#aaa" }}>
                <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No liked songs yet</p>
                <p style={{ fontSize: "0.9rem" }}>Start liking songs by clicking the ♥ icon while browsing</p>
              </div>
            ) : (
                      tracks.map((t, i) => (
                        <div
                          key={t.SongID}
                          className="likedRow"
                          onClick={() => {
                            // set full liked-songs queue so prev/next work as expected
                            try {
                              const list = (tracks || []).map((s) => ({ SongID: s.SongID, Title: s.title, ArtistName: s.artist }));
                              if (list.length > 0) { playList(list, i); return; }
                            } catch (e) {
                              // fallback to playing single song
                            }
                            playSong({ SongID: t.SongID, Title: t.title, ArtistName: t.artist });
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') {
                            try {
                              const list = (tracks || []).map((s) => ({ SongID: s.SongID, Title: s.title, ArtistName: s.artist }));
                              if (list.length > 0) { playList(list, i); return; }
                            } catch (err) {}
                            playSong({ SongID: t.SongID, Title: t.title, ArtistName: t.artist });
                          } }}
                        >
                          <div className="col-num">{i + 1}</div>

                          <div className="col-heart">
                            <button
                              className="heartBtn"
                              onClick={(e) => { e.stopPropagation(); unlikeSong(t.SongID); }}
                              aria-label="Unlike song"
                              title="Unlike"
                              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <Heart size={16} fill="#782355" color="#782355" />
                            </button>
                          </div>

                          <div className="col-cover">
                            {t.coverUrl ? (
                              <img src={t.coverUrl} alt="cover" className="songCoverTiny" />
                            ) : (
                              <div className="songCoverTiny songCoverPlaceholder" aria-hidden="true"></div>
                            )}
                          </div>

                          <div className="col-title">
                            <div className="songInfo">
                              <span className="songTitle">{t.title}</span>
                              {/* artist name: clickable and accessible; fetch song to resolve artist id then navigate */}
                              <span className="songArtist">
                                <button
                                  className="artistLink"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      // prefer preloaded artistId if available
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
