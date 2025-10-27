import "./playlistgrid.css";
import { useEffect, useState } from "react";

export default function PlaylistGrid({
  listenerId,
  showPrivate = false,
  showLikedFallback = false,
  authorName = "you",
}) {
  const [playlists, setPlaylists] = useState([]);
  const [likedCount, setLikedCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinnedId, setPinnedId] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);

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

        // Fetch playlists
        const res = await fetch(
          `http://localhost:3001/playlists?listenerId=${encodeURIComponent(listenerId)}`
        );
        const data = res.ok ? await res.json() : [];

        // Fetch pinned playlist for this listener
        const resPinned = await fetch(
          `http://localhost:3001/listeners/${encodeURIComponent(listenerId)}`
        );
        if (resPinned.ok) {
          const d = await resPinned.json();
          if (!aborted) setPinnedId(d.PinnedPlaylistID || null);
        }

        const visible = (Array.isArray(data) ? data : []).filter(
          (p) => Number(p.IsDeleted) === 0 && (showPrivate || Number(p.IsPublic) === 1)
        );
        if (!aborted) setPlaylists(visible);
      } catch {
        if (!aborted) setPlaylists([]);
      } finally {
        setLoading(false);
      }

      // Liked fallback
      if (!showLikedFallback) return;

      try {
        const res1 = await fetch(
          `http://localhost:3001/liked_songs/count?listenerId=${encodeURIComponent(listenerId)}`
        );
        if (res1.ok) {
          const d = await res1.json();
          if (!aborted) setLikedCount(Number(d.count) || 0);
          return;
        }
      } catch {}

      try {
        const res2 = await fetch(
          `http://localhost:3001/liked_songs?listenerId=${encodeURIComponent(listenerId)}`
        );
        if (res2.ok) {
          const d2 = await res2.json();
          if (!aborted) setLikedCount(Array.isArray(d2) ? d2.length : 0);
        } else {
          if (!aborted) setLikedCount(0);
        }
      } catch {
        if (!aborted) setLikedCount(0);
      }
    }

    load();
    return () => {
      aborted = true;
    };
  }, [listenerId, showPrivate, showLikedFallback]);

  async function handlePin(playlistId) {
    if (!listenerId) return;
    setPinLoading(true);

    try {
      const res = await fetch(
        `http://localhost:3001/listeners/${listenerId}/pinned-playlist`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId }),
        }
      );

      const data = await res.json();
      if (res.ok && data.success) {
        setPinnedId(playlistId);
      } else {
        alert(data.error || "Failed to pin playlist");
      }
    } catch (err) {
      console.error("Pin error:", err);
      alert("Could not pin playlist.");
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
              <div className="pl__by">by <span className="pl__author">—</span></div>
              <div className="pl__tracks">—</div>
            </div>
          ))
        ) : hasPlaylists ? (
          playlists.map((p) => {
            const tracks = Number(p.TrackCount) || 0;
            const title = p.Name ?? "Untitled Playlist";
            const coverUrl =
              p.CoverURL ||
              "https://placehold.co/600x600/FFE8F5/895674?text=Playlist";
            const isPinned = pinnedId === p.PlaylistID;

            return (
              <div
                className={`pl ${isPinned ? "pl--pinned" : ""}`}
                key={p.PlaylistID}
              >
                <button
                  className={`pl__pinBtn ${isPinned ? "active" : ""}`}
                  title={isPinned ? "Pinned to profile" : "Pin to profile"}
                  disabled={pinLoading}
                  onClick={() => handlePin(p.PlaylistID)}
                >
                  📌
                </button>

                <div className="pl__pill">
                  <span className="pl__pillIcon">♪</span>
                  <span>{tracks} {tracks === 1 ? "track" : "tracks"}</span>
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
        ) : showLikedFallback ? (
          <div className="pl pl--liked">
            <div className="pl__pill">
              <span className="pl__pillIcon">♥</span>
              <span>
                {likedCount == null ? "—" : likedCount}{" "}
                {likedCount === 1 ? "song" : "songs"}
              </span>
            </div>
            <div className="pl__coverWrap">
              <div
                className="pl__cover pl__cover--liked"
                role="img"
                aria-label="Liked Songs cover"
              />
            </div>
            <h3 className="pl__title">Liked Songs</h3>
            <div className="pl__by">
              by <span className="pl__author">{authorName}</span>
            </div>
            <div className="pl__tracks">
              {likedCount == null ? "—" : likedCount}{" "}
              {likedCount === 1 ? "song" : "songs"}
            </div>
          </div>
        ) : (
          <div className="pl pl--empty">No public playlists yet.</div>
        )}
      </div>
    </section>
  );
}
