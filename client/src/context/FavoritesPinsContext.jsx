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
      setFavoriteIds(new Set(j.favorites || []));
      setPinnedSongId(j.pinnedSongId ?? null);
    } catch {}
  }

  function setVisibleIds(ids) {
    visibleIdsRef.current = Array.from(new Set((ids || []).filter(Boolean)));
    hydrate(visibleIdsRef.current);
  }

  async function toggleFavorite(songId) {
    if (!songId) return;
    const u = getUser();
    const listenerId = u?.listenerId ?? u?.ListenerID;
    if (!listenerId) return;

    const has = favoriteIds.has(songId);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      has ? next.delete(songId) : next.add(songId);
      return next;
    });

  fetch(`${API_BASE_URL}/likes`, {
      method: has ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listenerId, songId }),
    }).catch(() => {});
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
