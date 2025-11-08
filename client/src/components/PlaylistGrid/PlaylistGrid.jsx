import "./PlaylistGrid.css";
import { useEffect, useState } from "react";
import { getUser } from "../../lib/userStorage";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";
import EditPlaylistCoverModal from "../Playlist/EditPlaylistCoverModal";

export default function PlaylistGrid({
  listenerId,
  showPrivate = false,
  showLikedFallback = false,
  authorName = "you",
}) {
  const [playlists, setPlaylists] = useState([]);
  const [covers, setCovers] = useState({});
  const [likedCount, setLikedCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinnedId, setPinnedId] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openCoverModalFor, setOpenCoverModalFor] = useState(null);
  const navigate = useNavigate();
  const currentUser = getUser();
  const currentUserId = currentUser?.listenerId ?? currentUser?.ListenerID ?? null;

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;
    try {
  const res = await fetch(`${API_BASE_URL}/playlists/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete playlist");
      setPlaylists(prev => prev.filter(p => p.PlaylistID !== id));
      setOpenMenuId(null);
    } catch {}
  }

  function handleEdit(id) {
    const playlist = playlists.find(p => p.PlaylistID === id);
    const newName = prompt(`Rename playlist "${playlist?.Name || "Untitled"}":`, playlist?.Name || "");
    if (!newName || newName === playlist?.Name) return;
  // server expects PUT for updates; only update local state on success and notify other listeners
  (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Name: newName }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Failed to rename playlist');
      setPlaylists(prev => prev.map(p => (p.PlaylistID === id ? { ...p, Name: newName } : p)));
      setOpenMenuId(null);
      try { window.dispatchEvent(new CustomEvent('playlistUpdated', { detail: { PlaylistID: id, Name: newName } })); } catch (e) {}
    } catch (err) {
      alert(err.message || 'Could not rename playlist');
    }
  })();
  }

  useEffect(() => {
    let aborted = false;

    async function load() {
      if (!listenerId) {
        setPlaylists([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE_URL}/playlists?listenerId=${encodeURIComponent(listenerId)}`
        );
        const data = res.ok ? await res.json() : [];

        const resPinned = await fetch(
          `${API_BASE_URL}/listeners/${encodeURIComponent(listenerId)}`
        );
        if (resPinned.ok) {
          const pinned = await resPinned.json();
              if (!aborted) setPinnedId(pinned?.PinnedPlaylistID ?? null);
        }

        const visible = (Array.isArray(data) ? data : []).filter(
          p => Number(p.IsDeleted) === 0 && (showPrivate || Number(p.IsPublic) === 1)
        );
        if (!aborted) setPlaylists(visible);
      } catch {
        if (!aborted) setPlaylists([]);
      } finally {
        setLoading(false);
      }

      if (!showLikedFallback) return;

      try {
        // server exposes liked songs as GET /listeners/:id/liked_songs
        const res = await fetch(`${API_BASE_URL}/listeners/${encodeURIComponent(listenerId)}/liked_songs`);
        if (res.ok) {
          const d = await res.json();
          try { console.debug("PlaylistGrid: fetched liked_songs for listener", listenerId, "count", Array.isArray(d) ? d.length : 'bad', d?.slice?.(0,5)); } catch (e) {}
          if (!aborted) setLikedCount(Array.isArray(d) ? d.length : 0);
          return;
        }
      } catch {}

      // on failure, ensure we at least show 0
      if (!aborted) setLikedCount(0);
    }

    load();
    return () => {
      aborted = true;
    };
  }, [listenerId, showPrivate, showLikedFallback]);

  // Update playlist entry when cover changed by modal
  function handleCoverUpdated(updated) {
    setPlaylists(prev => prev.map(p => (p.PlaylistID === updated.PlaylistID ? { ...p, cover_media_id: updated.cover_media_id } : p)));
    // if we resolved the media URL earlier, clear it so effect can re-resolve
    setCovers(prev => {
      const next = { ...prev };
      if (updated.cover_media_id == null) {
        // remove any entries that pointed to previous id for this playlist
        return next;
      }
      return next;
    });
    setOpenCoverModalFor(null);
  }

  // Listen for playlistCreated or playlistCoverUpdated events to update UI immediately
  useEffect(() => {
    function onCreated(e) {
      const pl = e?.detail;
      if (!pl || !pl.PlaylistID) return;
      setPlaylists(prev => [pl, ...prev]);
    }

    function onCoverUpdated(e) {
      const d = e?.detail;
      if (!d || !d.PlaylistID) return;
      setPlaylists(prev => prev.map(p => p.PlaylistID === d.PlaylistID ? { ...p, cover_media_id: d.cover_media_id } : p));
      // clear caches for media so it will be resolved
      if (d.cover_media_id) {
        setCovers(prev => { const next = { ...prev }; delete next[d.cover_media_id]; return next; });
      }
    }

    function onUpdated(e) {
      const d = e?.detail;
      if (!d || !d.PlaylistID) return;
      setPlaylists(prev => prev.map(p => p.PlaylistID === d.PlaylistID ? { ...p, ...d } : p));
    }

    window.addEventListener('playlistCreated', onCreated);
    window.addEventListener('playlistCoverUpdated', onCoverUpdated);
    window.addEventListener('playlistUpdated', onUpdated);
    return () => {
      window.removeEventListener('playlistCreated', onCreated);
      window.removeEventListener('playlistCoverUpdated', onCoverUpdated);
      window.removeEventListener('playlistUpdated', onUpdated);
    };
  }, []);

  // Keep likedCount authoritative by re-fetching when liked state changes elsewhere
  useEffect(() => {
    if (!showLikedFallback) return;
    let aborted = false;
    async function refresh() {
      try {
        const res = await fetch(`${API_BASE_URL}/listeners/${encodeURIComponent(listenerId)}/liked_songs`);
        if (!res.ok) { if (!aborted) setLikedCount(0); return; }
        const d = await res.json();
        if (!aborted) setLikedCount(Array.isArray(d) ? d.length : 0);
      } catch (e) {
        if (!aborted) setLikedCount(0);
      }
    }

    function onLikedChanged() {
      try { console.debug('PlaylistGrid: likedChanged event received', listenerId); } catch (e) {}
      // Always refresh the authoritative list when any liked state changes
      refresh();
    }

    window.addEventListener('likedChanged', onLikedChanged);
    return () => {
      window.removeEventListener('likedChanged', onLikedChanged);
      aborted = true;
    };
  }, [listenerId, showLikedFallback]);

  // Resolve any cover_media_id → URL
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const needed = [...new Set((playlists || []).map(p => p.cover_media_id).filter(Boolean))]
          .filter(id => !(id in covers));
        if (!needed.length) return;
        const entries = await Promise.all(
          needed.map(async (id) => {
            try {
              const r = await fetch(`${API_BASE_URL}/media/${id}`);
              if (!r.ok) return [id, null];
              const j = await r.json();
              return [id, j?.url || null];
            } catch { return [id, null]; }
          })
        );
        if (aborted) return;
        setCovers(prev => {
          const next = { ...prev };
          for (const [id, url] of entries) next[id] = url;
          return next;
        });
      } catch (e) {
        // ignore
      }
    })();
    return () => { aborted = true; };
  }, [playlists]);

  async function pinPlaylist(playlistId) {
    if (!listenerId || !playlistId) return;
    setPinLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/listeners/${listenerId}/pins/playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to pin playlist");
      setPinnedId(playlistId);
    } catch (e) {
      alert(e.message || "Could not pin playlist.");
    } finally {
      setPinLoading(false);
    }
  }

  // Clears the pinned playlist for the listener. If playlistId is provided, it will set that
  // playlist as pinned by calling the POST /pins/playlist endpoint (use pinPlaylist for that).
  async function unpinPlaylist(playlistId = null) {
    if (!listenerId) return;
    setPinLoading(true);
    try {
      if (playlistId) {
        // If caller passed a playlistId, treat as pin operation (backwards compatible)
        const res = await fetch(`${API_BASE_URL}/listeners/${listenerId}/pins/playlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to pin playlist");
        setPinnedId(playlistId);
      } else {
        // Clear the pinned playlist using the dedicated DELETE endpoint
        const res = await fetch(`${API_BASE_URL}/listeners/${listenerId}/pins/playlist`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to clear pinned playlist");
        }
        setPinnedId(null);
      }
    } catch (e) {
      alert(e.message || "Could not update pinned playlist.");
    } finally {
      setPinLoading(false);
    }
  }

  const hasPlaylists = playlists.length > 0;

  return (
    <section className="plGrid">
      <h2 className="plGrid__title">Playlists</h2>

      <div className="plGrid__container">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div className="pl pl--placeholder" key={`sk-${i}`}>
              <div className="pl__pill">
                <span className="pl__pillIcon">⏱</span>
                <span>Loading…</span>
              </div>
              <div className="pl__coverWrap">
                <div className="pl__cover pl__cover--skeleton" />
              </div>
              <h3 className="pl__title">Loading…</h3>
              <div className="pl__by">
                by <span className="pl__author">—</span>
              </div>
              <div className="pl__tracks">—</div>
            </div>
          ))
        ) : (
          <>
            {showLikedFallback && (
              <div
                className="pl pl--liked"
                onClick={() => navigate('/likedsongs')}
                style={{ cursor: 'pointer' }}
              >
                <div className="pl__pill">
                  <span className="pl__pillIcon">♥</span>
                  <span>
                    {likedCount == null ? "—" : likedCount} {likedCount === 1 ? "track" : "tracks"}
                  </span>
                </div>
                <div className="pl__coverWrap">
                  <div className="pl__cover pl__cover--liked" role="img" aria-label="Liked Songs cover" />
                </div>
                <h3 className="pl__title">Liked Songs</h3>
                <div className="pl__by">
                  by <span className="pl__author">{authorName}</span>
                </div>
                <div className="pl__tracks">
                  {likedCount == null ? "—" : likedCount} {likedCount === 1 ? "track" : "tracks"}
                </div>
              </div>
            )}

            {hasPlaylists ? (
              playlists.map(p => {
                const tracks = Number(p.TrackCount) || 0;
                const title = p.Name ?? "Untitled Playlist";
                const coverUrl = p.CoverURL || (p.cover_media_id ? (covers[p.cover_media_id] || "https://placehold.co/600x600/FFE8F5/895674?text=Playlist") : "https://placehold.co/600x600/FFE8F5/895674?text=Playlist");
                const isPinned = pinnedId === p.PlaylistID;
                const isPublic = Number(p.IsPublic) === 1;

                return (
                  <div
                    className={`pl ${isPinned ? "pl--pinned" : ""}`}
                    key={p.PlaylistID}
                    onClick={() => navigate(`/playlist/${p.PlaylistID}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="pl__pinRow">
                      {!isPinned ? (
                        <button
                          className="pl__pinBtn"
                          title={(!isPublic && Number(currentUserId) !== Number(p.ListenerID)) ? "Private playlists can only be pinned by the owner" : "Pin to profile"}
                          disabled={pinLoading || (!isPublic && Number(currentUserId) !== Number(p.ListenerID))}
                          onClick={e => { e.stopPropagation(); pinPlaylist(p.PlaylistID); }}
                        >
                          📌 Pin
                        </button>
                      ) : (
                        <button
                          className="pl__pinBtn pl__pinBtn--active"
                          title="Unpin from profile"
                          disabled={pinLoading}
                          onClick={e => { e.stopPropagation(); unpinPlaylist(); }}
                        >
                          ✖ Unpin
                        </button>
                      )}

                      {/* Privacy toggle shown only to playlist owner */}
                      {Number(currentUserId) === Number(p.ListenerID) && (
                        <button
                          className="pl__privacyBtn"
                          title={isPublic ? 'Make private' : 'Make public'}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              // If attempting to make private, verify subscription
                              if (isPublic) {
                                const subRes = await fetch(`${API_BASE_URL}/subscriptions/listener/${currentUserId}`);
                                if (!subRes.ok) {
                                  alert('Only subscribers can make playlists private.');
                                  return;
                                }
                                const subData = await subRes.json();
                                if (!subData?.IsActive) {
                                  if (window.confirm('Private playlists are for subscribers only. Go to subscription page?')) {
                                    navigate('/subscription');
                                  }
                                  return;
                                }
                              }

                              const newPublic = isPublic ? 0 : 1;
                              const res = await fetch(`${API_BASE_URL}/playlists/${p.PlaylistID}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ IsPublic: newPublic }),
                              });
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) throw new Error(data.error || 'Failed to update playlist');
                              setPlaylists(prev => prev.map(x => x.PlaylistID === p.PlaylistID ? { ...x, IsPublic: Number(newPublic) } : x));
                            } catch (err) {
                              alert(err.message || 'Could not change privacy');
                            }
                          }}
                        >
                          {isPublic ? '🔓 Public' : '🔒 Private'}
                        </button>
                      )}
                    </div>

                    <div className="playlistOptions">
                      <button
                        className="playlistOptionsBtn"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === p.PlaylistID ? null : p.PlaylistID);
                        }}
                      >
                        ⋯
                      </button>

                      {openMenuId === p.PlaylistID && (
                        <div className="playlistDropdown">
                          <button className="dropdownItem" onClick={(e) => { e.stopPropagation(); handleEdit(p.PlaylistID); }}>
                            ✏️ Edit
                          </button>
                          <button className="dropdownItem" onClick={(e) => { e.stopPropagation(); setOpenCoverModalFor(p); setOpenMenuId(null); }}>
                            🖼 Change cover
                          </button>
                          <button className="dropdownItem delete" onClick={(e) => { e.stopPropagation(); handleDelete(p.PlaylistID); }}>
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pl__pill">
                      <span className="pl__pillIcon">♪</span>
                      <span>
                        {tracks} {tracks === 1 ? "track" : "tracks"}
                      </span>
                    </div>
                    <div className="pl__coverWrap">
                      <img className="pl__cover" src={coverUrl} alt={title} />
                    </div>
                    <h3 className="pl__title">{title}</h3>
                    <div className="pl__by">
                      by <span className="pl__author">{authorName}</span>
                    </div>
                    <div className="pl__tracks">
                      {tracks} {tracks === 1 ? "track" : "tracks"}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="pl pl--empty">No public playlists yet.</div>
            )}
          </>
        )}
      </div>
      {openCoverModalFor && (
        <EditPlaylistCoverModal playlist={openCoverModalFor} onClose={() => setOpenCoverModalFor(null)} onUpdated={handleCoverUpdated} />
      )}
    </section>
  );
}
