import React, { useEffect, useState, useRef } from 'react';

export default function AddToPlaylist({ songId }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const ref = useRef(null);

  const stored = localStorage.getItem('listener');
  const listenerId = stored ? JSON.parse(stored).ListenerID : 6;

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  async function fetchPlaylists() {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/listeners/${listenerId}/playlists`);
      if (!res.ok) throw new Error('Failed to load playlists');
      const data = await res.json();
      setPlaylists(data);
    } catch (err) {
      console.error(err);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }

  async function addTo(playlistId) {
    if (!playlistId || !songId) return;
    setAdding(true);
    try {
      const res = await fetch('http://localhost:3001/playlist_tracks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ PlaylistID: playlistId, SongID: songId })
      });
      if (res.status === 201 || res.ok) {
        alert('Added to playlist');
        setOpen(false);
        // dispatch event in case other parts need to refresh
        try { window.dispatchEvent(new CustomEvent('playlistChanged', { detail: { playlistId, songId } })); } catch (e) {}
        return;
      }
      if (res.status === 409) {
        alert('Song already in that playlist');
        return;
      }
      const data = await res.json();
      throw new Error(data?.error || 'Failed to add');
    } catch (err) {
      console.error(err);
      alert('Failed to add to playlist');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div ref={ref} style={{ display: 'inline-block', position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); if (!open && playlists.length === 0) fetchPlaylists(); setOpen((v) => !v); }}
        aria-expanded={open}
        aria-label="Add to playlist"
        style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}
      >
        +
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, zIndex: 50, background: '#fff', border: '1px solid #ddd', padding: 8, minWidth: 160 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>Add to playlist</div>
          {loading ? (
            <div style={{ fontSize: 13 }}>Loading...</div>
          ) : playlists.length === 0 ? (
            <div style={{ fontSize: 13 }}>No playlists found</div>
          ) : (
            playlists.map((p) => (
              <div key={p.PlaylistID} style={{ marginBottom: 6 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); addTo(p.PlaylistID); }}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 6, cursor: 'pointer' }}
                >
                  {p.Name || p.Name}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
