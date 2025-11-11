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
      const res = await fetch(`http://localhost:3001/playlists/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete playlist");
      setPlaylists(prev => prev.filter(p => p.PlaylistID !== id));
      setOpenMenuId(null);
    } catch {}
  }

  function handleEdit(id) {
    const playlist = playlists.find(p => p.PlaylistID === id);
    const newName = prompt(`Rename playlist "${playlist?.Name || "Untitled"}":`, playlist?.Name || "");
    if (!newName || newName === playlist?.Name) return;

    fetch(`http://localhost:3001/playlists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Name: newName }),
    })
      .then(res => res.json())
      .then(() => {
        setPlaylists(prev => prev.map(p => (p.PlaylistID === id ? { ...p, Name: newName } : p)));
        setOpenMenuId(null);
      })
      .catch(() => {});
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
      if (!res.ok) throw new Error(data?.error || "Failed to pin playlist");
      setPinnedId(playlistId);
    } catch (e) {
      alert(e.message || "Could not pin playlist.");
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
        throw new Error(data?.error || "Failed to unpin playlist");
      }
      setPinnedId(null);
    } catch (e) {
      alert(e.message || "Could not unpin playlist.");
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
                          className="pl__pinBtn"
                          title="Pin to profile"
                          disabled={pinLoading || !isPublic}
                          onClick={() => pinPlaylist(p.PlaylistID)}
                        >
                          📌 Pin
                        </button>
                      ) : (
                        <button
                          className="pl__pinBtn pl__pinBtn--active"
                          title="Unpin from profile"
                          disabled={pinLoading}
                          onClick={unpinPlaylist}
                        >
                          ✖ Unpin
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
    </section>
  );
}
