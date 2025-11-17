import "./PlaylistGrid.css";
// reuse the song actions pin styles so playlist pins match song pins
import "../Songs/SongActions.css";
import { useEffect, useState } from "react";
import { getUser } from "../../lib/userStorage";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";
import EditPlaylistCoverModal from "../Playlist/EditPlaylistCoverModal";
import EditPlaylistModal from "../Playlist/EditPlaylistModal";
import DeletePlaylistModal from "../Playlist/DeletePlaylistModal";

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
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState(null);
  const navigate = useNavigate();
  const currentUser = getUser();
  const currentUserId = currentUser?.listenerId ?? currentUser?.ListenerID ?? null;

  async function handleDelete(id) {
    const playlist = playlists.find(p => p.PlaylistID === id);
    if (!playlist) return;
    setDeletingPlaylist(playlist);
    setOpenMenuId(null);
  }

  async function confirmDelete() {
    if (!deletingPlaylist?.PlaylistID) return;
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${deletingPlaylist.PlaylistID}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete playlist");
      setPlaylists(prev => prev.filter(p => p.PlaylistID !== deletingPlaylist.PlaylistID));
      setDeletingPlaylist(null);
      try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Playlist deleted', type: 'success' } })); } catch(e) {}
    } catch (err) {
      try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: err?.message || 'Failed to delete playlist', type: 'error' } })); } catch(e) {}
      setDeletingPlaylist(null);
    }
  }

  function handleEdit(id) {
    const playlist = playlists.find(p => p.PlaylistID === id);
    if (!playlist) return;
    // open the EditPlaylistModal so user can edit name and description
    setEditingPlaylist(playlist);
    setOpenMenuId(null);
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
        const res = await fetch(`http://localhost:3001/playlists?listenerId=${encodeURIComponent(listenerId)}`);
        const data = res.ok ? await res.json() : [];

        const resPinned = await fetch(`http://localhost:3001/listeners/${encodeURIComponent(listenerId)}/pins/playlist`);
        if (resPinned.ok) {
          const pinned = await resPinned.json();
          if (!aborted) setPinnedId(pinned?.PlaylistID ?? null);
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

  async function pinPlaylist(playlistId) {
    if (!listenerId || !playlistId) return;
    setPinLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/listeners/${listenerId}/pins/playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = res.status === 403 ? 'Can not pin private playlist' : (data?.error || 'Failed to pin playlist');
        throw new Error(errMsg);
      }
      setPinnedId(playlistId);
      try {
        window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Playlist pinned to your profile', type: 'success' } }));
      } catch (e) {}
    } catch (e) {
      try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: e?.message || 'Can not pin private playlist', type: 'error' } })); } catch (err) {}
    } finally {
      setPinLoading(false);
    }
  }

  async function unpinPlaylist() {
    if (!listenerId) return;
    setPinLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/listeners/${listenerId}/pins/playlist`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errMsg = res.status === 403 ? 'Can not pin private playlist' : (data?.error || 'Failed to pin playlist');
          throw new Error(errMsg);
        }
        setPinnedId(playlistId);
        try {
          window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Playlist pinned to your profile', type: 'success' } }));
        } catch (e) {}
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
        try {
          window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Playlist unpinned from your profile', type: 'success' } }));
        } catch (e) {}
      }
      setPinnedId(null);
    } catch (e) {
      try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: e?.message || 'Could not update pinned playlist.', type: 'error' } })); } catch (err) {}
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
                    {likedCount == null ? "—" : likedCount} {likedCount === 1 ? "song" : "songs"}
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
                  {likedCount == null ? "—" : likedCount} {likedCount === 1 ? "song" : "songs"}
                </div>
              </div>
            )}

            {hasPlaylists ? (
              playlists.map(p => {
                const tracks = Number(p.TrackCount) || 0;
                const title = p.Name ?? "Untitled Playlist";
                const coverUrl = p.CoverURL || "https://placehold.co/600x600/FFE8F5/895674?text=Playlist";
                const isPinned = pinnedId === p.PlaylistID;
                const isPublic = Number(p.IsPublic) === 1;

                return (
                  <div className={`pl ${isPinned ? "pl--pinned" : ""}`} key={p.PlaylistID}>
                    <div className="pl__pinRow">
                      {!isPinned ? (
                        <button
                          className={`pl__pinBtn songActions__btn`}
                          aria-pressed={false}
                          title={(!isPublic && Number(currentUserId) !== Number(p.ListenerID)) ? "Private playlists can only be pinned by the owner" : "Pin to profile"}
                          disabled={pinLoading || (!isPublic && Number(currentUserId) !== Number(p.ListenerID))}
                          onClick={e => { e.stopPropagation(); pinPlaylist(p.PlaylistID); }}
                        >
                          <span className="songActions__icon songActions__icon--pin" aria-hidden="true"></span>
                          <span className="sr-only">Pin</span>
                        </button>
                      ) : (
                        <button
                          className={`pl__pinBtn songActions__btn is-on`}
                          aria-pressed={true}
                          title="Unpin from profile"
                          disabled={pinLoading}
                          onClick={unpinPlaylist}
                        >
                          <span className="songActions__icon songActions__icon--pin" aria-hidden="true"></span>
                          <span className="sr-only">Unpin</span>
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
                                // Check if playlist is pinned
                                if (isPinned) {
                                  try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Cannot make a pinned playlist private. Unpin it first.', type: 'error' } })); } catch(e) {}
                                  return;
                                }
                                
                                const subRes = await fetch(`${API_BASE_URL}/subscriptions/listener/${currentUserId}`);
                                if (!subRes.ok) {
                                  try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Only subscribers can make playlists private.', type: 'error' } })); } catch(e) {}
                                  return;
                                }
                                const subData = await subRes.json();
                                if (!subData?.IsActive) {
                                  try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: 'Private playlists are for subscribers only.', type: 'error' } })); } catch(e) {}
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
                              try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: isPublic ? 'Playlist is now private' : 'Playlist is now public', type: 'success' } })); } catch(e) {}
                            } catch (err) {
                              try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: err.message || 'Could not change privacy', type: 'error' } })); } catch(e) {}
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
                          <button className="dropdownItem" onClick={() => handleEdit(p.PlaylistID)}>
                            ✏️ Edit
                          </button>
                          <button className="dropdownItem delete" onClick={() => handleDelete(p.PlaylistID)}>
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
      {editingPlaylist && (
        <EditPlaylistModal playlist={editingPlaylist} tracks={[]} onClose={() => setEditingPlaylist(null)} onUpdated={(u, tracks) => {
          // update playlists list when modal saves
          if (u && u.PlaylistID) {
            setPlaylists(prev => prev.map(p => p.PlaylistID === u.PlaylistID ? { ...p, ...u } : p));
            try { window.dispatchEvent(new CustomEvent('playlistUpdated', { detail: { PlaylistID: u.PlaylistID, ...u } })); } catch(e) {}
          }
          setEditingPlaylist(null);
        }} />
      )}
      {deletingPlaylist && (
        <DeletePlaylistModal playlist={deletingPlaylist} onClose={() => setDeletingPlaylist(null)} onConfirm={confirmDelete} />
      )}
    </section>
  );
}
