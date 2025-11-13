import { useEffect, useState } from "react";
import { useFavPins } from "../../context/FavoritesPinsContext";
import { usePlayer } from "../../context/PlayerContext";
import { API_BASE_URL } from "../../config/api";
import EditPlaylistModal from "../Playlist/EditPlaylistModal";
import "./JamCard.css";

const FALLBACK_COVER = "https://placehold.co/600x600/FFDDEE/895674?text=Album+Art";

export default function JamCard({ listenerId }) {
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pinnedPlaylist, setPinnedPlaylist] = useState(null);

  const favCtx = useFavPins?.() || {};
  const pinnedSongId = favCtx.pinnedSongId ?? null;

  const { current, playing, playSong, toggle } = usePlayer();
  const isCurrentSong = current?.SongID === song?.SongID;
  const isShowingPause = isCurrentSong && playing;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    const id = listenerId || stored?.listenerId || stored?.ListenerID;
    if (!id) {
      setError("No listener ID found");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/listeners/${id}/profile`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSong(data?.favorites?.pinnedSong || null);
        setPinnedPlaylist(data?.favorites?.pinnedPlaylist || null);
      } catch (e) {
        setError(e.message);
        setSong(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [listenerId, pinnedSongId]);

  const handlePlayClick = () => {
    if (!song) return;
    if (current?.SongID === song.SongID) {
      toggle();
    } else {
      playSong(song);
    }
  };

  const title = "Current Jam";
  const [coverUrl, setCoverUrl] = useState(FALLBACK_COVER);

  // Derive a stable display cover for the jam card. Prefer explicit cover fields,
  // then media id resolution, then stream endpoint fallback.
  useEffect(() => {
    let cancelled = false;
    async function resolveCover() {
      if (!song) {
        setCoverUrl(FALLBACK_COVER);
        return;
      }

      // prefer explicit URL fields (many possible spellings)
      const explicit = song?.CoverURL || song?.CoverUrl || song?.coverUrl || song?.ArtworkURL || song?.ArtworkUrl || song?.ImageURL || song?.ImageUrl || song?.cover || null;
      if (explicit) {
        setCoverUrl(explicit);
        return;
      }

      // try media id fields
      const mediaId = song?.cover_media_id || song?.coverMediaId || song?.coverMediaID || song?.coverMedia || song?.coverMediaId || song?.coverId || song?.coverId;
      if (mediaId) {
        try {
          const r = await fetch(`${API_BASE_URL}/media/${mediaId}`);
          if (r.ok) {
            const j = await r.json();
            if (!cancelled && j?.url) { setCoverUrl(j.url); return; }
          }
        } catch (e) {}
      }

      // fallback: try songs/:id/stream which may include coverUrl
      const sid = song?.SongID || song?.songId || song?.SongId;
      if (sid) {
        try {
          const r = await fetch(`${API_BASE_URL}/songs/${sid}/stream`);
          if (r.ok) {
            const j = await r.json();
            const c = j?.coverUrl || j?.CoverURL || j?.Cover || null;
            if (!cancelled && c) { setCoverUrl(c); return; }
          }
        } catch (e) {}
      }

      // last resort
      if (!cancelled) setCoverUrl(FALLBACK_COVER);
    }

    resolveCover();
    return () => { cancelled = true; };
  }, [song]);
  const track = loading
    ? "Loading…"
    : error
    ? "Error"
    : song
    ? song.Title || song.title || "Untitled"
    : "None pinned yet";
  const artist = loading
    ? ""
    : error
    ? error
    : song
    ? song.Artists || song.ArtistName || song.artistName || "Unknown Artist"
    : "Pin a song to show it here!";

  // ownership: allow edits only when viewer matches profile
  const stored = JSON.parse(localStorage.getItem("user") || "null");
  const viewerId = stored?.listenerId || stored?.ListenerID || null;
  const profileId = listenerId || viewerId;
  const isOwner = viewerId && profileId && Number(viewerId) === Number(profileId);
  const [showMenu, setShowMenu] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // refresh pinnedPlaylist when a playlistUpdated event fires for this playlist
  useEffect(() => {
    function onUpdated(e) {
      try {
        const pid = e?.detail?.PlaylistID || e?.detail?.PlaylistId || e?.detail?.PlaylistID;
        if (!pid || !pinnedPlaylist) return;
        if (Number(pid) === Number(pinnedPlaylist.PlaylistID)) {
          // re-fetch profile to pick up updated description (simple approach)
          (async () => {
            const id = profileId;
            if (!id) return;
            try {
              const r = await fetch(`${API_BASE_URL}/listeners/${id}/profile`);
              if (!r.ok) return;
              const d = await r.json();
              setPinnedPlaylist(d?.favorites?.pinnedPlaylist || null);
            } catch (err) { /* ignore */ }
          })();
        }
      } catch (err) {}
    }

    window.addEventListener('playlistUpdated', onUpdated);
    return () => window.removeEventListener('playlistUpdated', onUpdated);
  }, [pinnedPlaylist, profileId]);

  return (
    <aside className="jam">
      <div className="jam__header">
        <h3 className="jam__title">{title}</h3>
        {isOwner && pinnedPlaylist ? (
          <button
            className="jam__headerEdit"
            aria-label="Edit pinned playlist description"
            title="Edit playlist description"
            onClick={() => setModalOpen(true)}
          >
            ✏️
          </button>
        ) : null}
      </div>

      <div className="jam__artWrap">
          <img src={coverUrl} alt={`${track} cover`} className="jam__cover" />
        </div>

      <div className="jam__meta">
        <div className="jam__song">{track}</div>
            <div className="jam__controls">
              <button
                className="jam__control jam__play"
                onClick={handlePlayClick}
                aria-label={isShowingPause ? "Pause" : "Play"}
                disabled={!song || !!error || loading}
              >
                {/* Inline SVG icons for consistent styling */}
                {isShowingPause ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <rect x="5" y="4" width="4" height="16" fill="currentColor" />
                    <rect x="15" y="4" width="4" height="16" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M5 3v18l15-9L5 3z" fill="currentColor" />
                  </svg>
                )}
              </button>

              <div className="jam__menuWrap">
                <button
                  className="jam__control jam__menuBtn"
                  aria-label="More actions"
                  onClick={() => setShowMenu(s => !s)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <circle cx="5" cy="12" r="2" fill="currentColor" />
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                    <circle cx="19" cy="12" r="2" fill="currentColor" />
                  </svg>
                </button>

                {showMenu ? (
                  <div className="jam__menu" role="menu">
                    {pinnedPlaylist ? (
                      isOwner ? (
                        <button className="jam__menuItem" onClick={() => { setModalOpen(true); setShowMenu(false); }} role="menuitem">Edit playlist description</button>
                      ) : (
                        <div className="jam__menuItem jam__menuItem--disabled" aria-disabled>Playlist pinned</div>
                      )
                    ) : (
                      <div className="jam__menuItem jam__menuItem--disabled" aria-disabled>No pinned playlist</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            </div>

            {modalOpen && pinnedPlaylist ? (
              <EditPlaylistModal playlist={pinnedPlaylist} tracks={[]} onClose={() => setModalOpen(false)} onUpdated={(u) => {
                setPinnedPlaylist(u || pinnedPlaylist);
                setModalOpen(false);
              }} />
            ) : null}

    </aside>
  );
}
