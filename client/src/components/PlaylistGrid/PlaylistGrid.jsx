import "./playlistgrid.css";
import { useEffect, useState } from "react";
import { getUser } from "../../lib/userStorage";

export default function PlaylistGrid() {
  const [playlists, setPlaylists] = useState([]);
  const [likedCount, setLikedCount] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = getUser();
  const listenerId = user?.listenerId ?? user?.ListenerID ?? null;
  const authorName =
    user?.displayName || user?.username || user?.Username || "you";

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

        // 1) Fetch listener playlists (with TrackCount from your route)
        const res = await fetch(
          `http://localhost:3001/playlists?listenerId=${encodeURIComponent(
            listenerId
          )}`
        );
        const data = res.ok ? await res.json() : [];
        if (!aborted) setPlaylists(Array.isArray(data) ? data : []);
      } catch {
        if (!aborted) setPlaylists([]);
      } finally {
        setLoading(false);
      }

      // 2) Try to fetch liked songs count (optional)
      try {
        // preferred: dedicated count endpoint if you added one
        const res1 = await fetch(
          `http://localhost:3001/liked_songs/count?listenerId=${encodeURIComponent(
            listenerId
          )}`
        );
        if (res1.ok) {
          const d = await res1.json();
          if (!aborted) setLikedCount(Number(d.count) || 0);
          return;
        }
      } catch {
        /* ignore and try fallback */
      }

      // fallback: fetch full liked list and count its length
      try {
        const res2 = await fetch(
          `http://localhost:3001/liked_songs?listenerId=${encodeURIComponent(
            listenerId
          )}`
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
  }, [listenerId]);

  const hasPlaylists = playlists.length > 0;

  return (
    <section className="plGrid">
      <h2 className="plGrid__title">Playlists</h2>

      <div className="plGrid__container">
        {loading ? (
          // skeleton placeholders
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
            return (
              <div className="pl" key={p.PlaylistID}>
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
                <div className="pl__tracks">{tracks} {tracks === 1 ? "track" : "tracks"}</div>
              </div>
            );
          })
        ) : (
          // Fallback "Liked Songs" card when user has no playlists
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
                aria-label="Liked Songs cover"
                role="img"
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
        )}
      </div>
    </section>
  );
}
