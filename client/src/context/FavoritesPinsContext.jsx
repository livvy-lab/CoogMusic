import { createContext, useContext, useMemo, useRef, useState } from "react";
import { getUser } from "../lib/userStorage";
import { API_BASE_URL } from "../config/api";
const Ctx = createContext(null);

export function FavoritesPinsProvider({ children }) {
  const [favoriteIds, setFavoriteIds] = useState(new Set()); // Set<number>
  const [pinnedSongId, setPinnedSongId] = useState(null);    // number | null
  const visibleIdsRef = useRef([]);

  async function hydrate(ids) {
    try {
      const u = getUser();
      const listenerId = u?.listenerId ?? u?.ListenerID;
      if (!listenerId) return;

      const idsParam = Array.isArray(ids) ? ids.filter(Boolean) : [];
      const qs = new URLSearchParams({
        listenerId: String(listenerId),
        ...(idsParam.length ? { ids: idsParam.join(",") } : {}),
      });

      const r = await fetch(`${API_BASE_URL}/songs/status?${qs.toString()}`);
      if (!r.ok) return;
  const j = await r.json();
  // debug: log favorites payload shape when running locally (can remove later)
  try { console.debug("Favorites hydrate payload:", j?.favorites); } catch (e) {}
  // normalize favorites to numbers to avoid string/number mismatch
  const favs = Array.isArray(j.favorites) ? j.favorites.map(x => Number(x)).filter(Boolean) : [];
      setFavoriteIds(new Set(favs));
      setPinnedSongId(j.pinnedSongId ? Number(j.pinnedSongId) : null);
    } catch {}
  }

  function setVisibleIds(ids) {
    const normalized = Array.from(new Set((ids || []).filter(Boolean).map(x => Number(x)).filter(n => Number.isFinite(n) && n > 0)));
    try { console.debug('FavoritesPins: setVisibleIds called with', normalized); } catch (e) {}
    visibleIdsRef.current = normalized;
    hydrate(visibleIdsRef.current);
  }

  async function toggleFavorite(songId) {
    if (!songId) return;
    const u = getUser();
    const listenerId = u?.listenerId ?? u?.ListenerID;
    if (!listenerId) return;

    const sid = Number(songId);
    if (!Number.isFinite(sid) || sid <= 0) return;

    try {
      // Use the same server toggle endpoint the player uses so we get authoritative liked state
      const res = await fetch(`${API_BASE_URL}/listeners/${listenerId}/liked_songs/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: sid }),
      });
      if (!res.ok) throw new Error('toggle-failed');
      const data = await res.json();

      // update local Set based on authoritative response
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (data && data.liked) next.add(sid); else next.delete(sid);
        return next;
      });

      try { window.dispatchEvent(new CustomEvent('likedChanged', { detail: { songId: sid, liked: !!data.liked } })); } catch (e) {}
      return !!data.liked;
    } catch (err) {
      // on error, don't change local set; rethrow or return undefined
      console.error('toggleFavorite error', err);
      return null;
    }
  }

  async function togglePin(songId) {
    const u = getUser();
    const listenerId = u?.listenerId ?? u?.ListenerID;
    if (!listenerId) return;

    const willUnpin = pinnedSongId === songId;
    setPinnedSongId(willUnpin ? null : songId);

  fetch(`${API_BASE_URL}/pin`, {
      method: willUnpin ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listenerId, songId }),
    }).catch(() => {});
  }

  const value = useMemo(() => ({
    favoriteIds,       // Set<number>
    pinnedSongId,      // number | null
    hydrate,
    setVisibleIds,
    toggleFavorite,
    togglePin,
  }), [favoriteIds, pinnedSongId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavPins() { return useContext(Ctx); }
