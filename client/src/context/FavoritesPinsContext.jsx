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
      console.log('🔍 [FavoritesPins] Hydrate called:', { listenerId, ids });
      if (!listenerId) {
        console.log('❌ [FavoritesPins] No listenerId, skipping hydrate');
        return;
      }

      const idsParam = Array.isArray(ids) ? ids.filter(Boolean) : [];
      const qs = new URLSearchParams({
        listenerId: String(listenerId),
        ...(idsParam.length ? { ids: idsParam.join(",") } : {}),
      });

      const url = `${API_BASE_URL}/songs/status?${qs.toString()}`;
      console.log('🔍 [FavoritesPins] Fetching:', url);
      const r = await fetch(url);
      if (!r.ok) {
        console.log('❌ [FavoritesPins] Fetch failed:', r.status);
        return;
      }
      const j = await r.json();
      console.log('✅ [FavoritesPins] Hydrate response:', j);
      // normalize favorites to numbers to avoid string/number mismatch
      const favs = Array.isArray(j.favorites) ? j.favorites.map(x => Number(x)).filter(Boolean) : [];
      console.log('✅ [FavoritesPins] Setting favoriteIds:', favs);
      
      // Merge new favorites with existing ones instead of replacing
      setFavoriteIds(prev => {
        const next = new Set(prev);
        // Add all favorites from the response
        favs.forEach(id => next.add(id));
        // Remove any songs from the queried IDs that are NOT in the favorites
        if (idsParam.length > 0) {
          idsParam.forEach(id => {
            const numId = Number(id);
            if (!favs.includes(numId)) {
              next.delete(numId);
            }
          });
        }
        return next;
      });
      
      setPinnedSongId(j.pinnedSongId ? Number(j.pinnedSongId) : null);
    } catch (e) {
      console.error('❌ [FavoritesPins] Hydrate error:', e);
    }
  }

  function setVisibleIds(ids) {
    const normalized = Array.from(new Set((ids || []).filter(Boolean).map(x => Number(x)).filter(n => Number.isFinite(n) && n > 0)));
    // Only hydrate if the IDs actually changed
    const prev = visibleIdsRef.current;
    const prevStr = (prev || []).join(",");
    const nextStr = normalized.join(",");
    if (prevStr !== nextStr) {
      try { console.debug('FavoritesPins: setVisibleIds called with', normalized); } catch (e) {}
      visibleIdsRef.current = normalized;
      hydrate(normalized);
    }
  }

  async function toggleFavorite(songId) {
    if (!songId) return;
    const u = getUser();
    const listenerId = u?.listenerId ?? u?.ListenerID;
    console.log('🎵 [FavoritesPins] toggleFavorite called:', { songId, user: u, listenerId });
    if (!listenerId) return;

    const sid = Number(songId);
    if (!Number.isFinite(sid) || sid <= 0) return;

    try {
      // Use the same server toggle endpoint the player uses so we get authoritative liked state
      console.log(`🎵 [FavoritesPins] Sending toggle request to: /listeners/${listenerId}/liked_songs/toggle`);
      const res = await fetch(`${API_BASE_URL}/listeners/${listenerId}/liked_songs/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: sid }),
      });
      console.log('🎵 [FavoritesPins] Response status:', res.status, res.ok);
      if (!res.ok) throw new Error('toggle-failed');
      const data = await res.json();
      console.log('🎵 [FavoritesPins] Response data:', data);

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
      console.error('❌ [FavoritesPins] toggleFavorite error', err);
      return null;
    }
  }

  async function togglePin(songId) {
    const u = getUser();
    const listenerId = u?.listenerId ?? u?.ListenerID;
    if (!listenerId) return;

    const sid = Number(songId);
    if (!Number.isFinite(sid) || sid <= 0) return;

    const willUnpin = pinnedSongId === sid;
    // optimistic update
    setPinnedSongId(willUnpin ? null : sid);

    try {
      const res = await fetch(`${API_BASE_URL}/pin`, {
        method: willUnpin ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listenerId, songId: sid }),
      });

      if (res.ok) {
        // show success toast
        try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: willUnpin ? 'Song unpinned from your profile' : 'Song pinned to your profile', type: 'success' } })); } catch(e) {}
      } else {
        // revert optimistic update
        setPinnedSongId(willUnpin ? sid : null);
        const data = await res.json().catch(() => null);
        const errMsg = data?.error || 'Failed to update pinned song';
        try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: errMsg, type: 'error' } })); } catch(e) {}
      }
    } catch (err) {
      // network or unexpected error: revert optimistic update
      setPinnedSongId(willUnpin ? sid : null);
      try { window.dispatchEvent(new CustomEvent('appToast', { detail: { message: err?.message || 'Failed to update pinned song', type: 'error' } })); } catch(e) {}
    }
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
