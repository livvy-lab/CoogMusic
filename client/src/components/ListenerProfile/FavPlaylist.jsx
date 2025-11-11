import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./FavPlaylist.css";
import { API_BASE_URL } from "../../config/api";

export default function FavPlaylist({ listenerId }) {
  const [playlist, setPlaylist] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    const id = listenerId || stored?.listenerId;
    if (!id) {
      setError("No listener ID found");
      setLoading(false);
      return;
    }

    const fetchPlaylist = async () => {
      try {
  const res = await fetch(`${API_BASE_URL}/listeners/${id}/profile`);
        if (!res.ok) {
          const errTxt = await res.text();
          throw new Error(`HTTP ${res.status} ${errTxt}`);
        }

        const data = await res.json();
        console.log("[FavPlaylist] pinned playlist:", data.favorites?.pinnedPlaylist);
        setPlaylist(data.favorites?.pinnedPlaylist || null);
      } catch (err) {
        console.error("[FavPlaylist] fetch error", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [listenerId]);

  // If playlist provides a cover_media_id (from the server), fetch the media record
  useEffect(() => {
    if (!playlist) {
      setCoverUrl(null);
      return;
    }

    if (playlist.CoverURL || playlist.CoverUrl || playlist.coverUrl) {
      setCoverUrl(playlist.CoverURL || playlist.CoverUrl || playlist.coverUrl);
      return;
    }

    // try a few ways to resolve a cover URL:
    // 1) explicit CoverURL fields on playlist
    // 2) cover_media_id on the pinned playlist record
    // 3) fetch /playlists/:id to read cover_media_id
    // 4) fetch first track (/playlists/:id/tracks) -> /songs/:id to read song.cover_media_id
    let dead = false;

    async function resolveMediaFromId(mediaId) {
      try {
        const r = await fetch(`${API_BASE_URL}/media/${mediaId}`);
        if (!r.ok) return null;
        const j = await r.json();
        return j.url || j.canonical || j.localUrl || null;
      } catch (e) { return null; }
    }

    (async () => {
      try {
        // direct playlist cover fields first
        if (playlist.CoverURL || playlist.CoverUrl || playlist.coverUrl) {
          if (!dead) setCoverUrl(playlist.CoverURL || playlist.CoverUrl || playlist.coverUrl);
          return;
        }

        // 1) check for cover_media_id on the pinned playlist
        const mediaId = playlist.cover_media_id || playlist.CoverMediaID || playlist.coverMediaId || null;
        if (mediaId) {
          const url = await resolveMediaFromId(mediaId);
          if (url && !dead) { setCoverUrl(url); return; }
        }

        // 2) try to fetch the playlist resource itself for cover_media_id
        if (playlist.PlaylistID) {
          try {
            const pr = await fetch(`${API_BASE_URL}/playlists/${playlist.PlaylistID}`);
            if (pr.ok) {
              const pj = await pr.json();
              const pm = pj.cover_media_id || pj.CoverMediaID || pj.coverMediaId || null;
              if (pm) {
                const url = await resolveMediaFromId(pm);
                if (url && !dead) { setCoverUrl(url); return; }
              }
            }
          } catch (e) { /* ignore */ }

          // 3) fetch tracks and attempt to resolve the first track's cover
          try {
            const tr = await fetch(`${API_BASE_URL}/playlists/${playlist.PlaylistID}/tracks`);
            if (tr.ok) {
              const tracks = await tr.json();
              const first = Array.isArray(tracks) && tracks.length ? tracks[0] : null;
              if (first && first.SongID) {
                try {
                  const sr = await fetch(`${API_BASE_URL}/songs/${first.SongID}`);
                  if (sr.ok) {
                    const sj = await sr.json();
                    const sm = sj.cover_media_id || sj.CoverMediaID || sj.coverMediaId || null;
                    if (sm) {
                      const url = await resolveMediaFromId(sm);
                      if (url && !dead) { setCoverUrl(url); return; }
                    }
                  }
                } catch (e) {}
              }
            }
          } catch (e) { /* ignore */ }
        }

        // nothing found — clear coverUrl so placeholder shows
        if (!dead) setCoverUrl(null);
      } catch (e) {
        if (!dead) setCoverUrl(null);
      }
    })();

    return () => { dead = true; };
  }, [playlist]);

  if (loading) {
    return (
      <section className="playlistSection">
        <h2 className="playlistSection__title">Go-to Playlist</h2>
        <p>Loading playlist...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="playlistSection">
        <h2 className="playlistSection__title">Go-to Playlist</h2>
        <p style={{ color: "red" }}>Error loading playlist: {error}</p>
      </section>
    );
  }

  // 🟣 Case 1: No pinned playlist
  if (!playlist) {
    return (
      <section className="playlistSection">
        <h2 className="playlistSection__title">Go-to Playlist</h2>
        <div className="playlistCard playlistCard--empty">
          <div className="playlistCard__body">
            <div className="playlistCard__placeholder" aria-hidden="true" />
            <div className="playlistCard__text">
              <h3 className="playlistCard__title">None pinned yet</h3>
              <p className="playlistCard__desc">
                Pin a playlist from your library to show it here!
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 🟢 Case 2: Playlist exists
  return (
    <section className="playlistSection">
      <h2 className="playlistSection__title">Go-to Playlist</h2>

      <div className="playlistCard">
        <div className="playlistCard__body">
          {coverUrl ? (
            <Link to={`/playlist/${playlist.PlaylistID}`} className="playlistCard__imageLink">
              <img
                className="playlistCard__image"
                src={coverUrl}
                alt={`${playlist.Name} cover`}
              />
            </Link>
          ) : (
            <Link to={`/playlist/${playlist.PlaylistID}`} className="playlistCard__imageLink">
              <div className="playlistCard__placeholder" aria-hidden="true" />
            </Link>
          )}

          <div className="playlistCard__text">
            <h3 className="playlistCard__title">
              <Link
                className="playlistCard__titleLink"
                to={`/playlist/${playlist.PlaylistID}`}
              >
                {playlist.Name || "Untitled Playlist"}
              </Link>
            </h3>

            <p className="playlistCard__desc">
              {playlist.Description || "No description available."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
