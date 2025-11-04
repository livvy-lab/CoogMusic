import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api";

const Ctx = createContext(null);

function getListenerId() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    return u?.listenerId ?? u?.ListenerID ?? null;
  } catch { return null; }
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);

  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [originalQueue, setOriginalQueue] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);

  // NEW: track whether we've posted this session's play already
  const postedRef = useRef(false);

  async function postPlayIfPossible(msOverride) {
    try {
      const songId = current?.SongID;
      const listenerId = getListenerId();
      if (!songId || !listenerId) return;

      const a = audioRef.current;
      const msPlayed = typeof msOverride === "number"
        ? msOverride
        : Math.round((a?.currentTime || 0) * 1000);

      if (msPlayed <= 0) return;

      // avoid duplicate double-post on both pause and ended
      if (postedRef.current) return;
      postedRef.current = true;

      await fetch(`${API_BASE_URL}/plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, listenerId, msPlayed }),
      });
    } catch {/* ignore */}
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
  }, [volume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    function onLoaded() { setDuration(a.duration || 0); }
    function onTime() { setCurrentTime(a.currentTime || 0); }
    function onPlay() { setPlaying(true); }
    function onPause() { setPlaying(false); }
    // ended handler is attached in a separate effect so it can see latest queue/currentIndex

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [current]); // rebind when track changes

  // ended handler that uses latest queue/currentIndex (must rebind when they change)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    function onEnd() {
      if (queue && queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length - 1) {
        const next = currentIndex + 1;
        setCurrentIndex(next);
        playSong(queue[next]).catch(() => {});
        return;
      }
      setPlaying(false);
    }

    a.addEventListener('ended', onEnd);
    return () => a.removeEventListener('ended', onEnd);
  }, [queue, currentIndex]);

  async function playSong(song) {
    const id = song?.SongID || song?.songId;
    if (!id) return;
    try {
      const r = await fetch(`${API_BASE_URL}/songs/${id}/stream`);
      if (!r.ok) throw new Error("No real stream found");

      const data = await r.json();
      // reset "posted" flag for this new track session
      postedRef.current = false;

      setCurrent({
        SongID: data.songId,
        Title: data.title,
        ArtistName: data.artistName,
        url: data.url,
        mime: data.mime,
      });
      const a = audioRef.current;
      if (a) {
        a.src = data.url;
        await a.play().catch(() => {});
      }
      setPlaying(true);
    } catch (err) {
      // fallback if backend doesn't return audio yet
      console.warn("Mock play:", err.message || err);
      setCurrent({
        SongID: id,
        Title: song?.Title || "Demo Track",
        ArtistName: song?.ArtistName || "Unknown Artist",
        url: song?.url || "",
        mime: "audio/mpeg",
      });
      setPlaying(true);
    }
  }

  // Play a list/queue of songs starting at index (default 0)
  function playList(list = [], startIndex = 0) {
    if (!Array.isArray(list) || list.length === 0) return;
    // When playing a normal list, record it as the original order and disable shuffle
    setOriginalQueue(list.slice());
    setShuffleMode(false);
    setQueue(list);
    const idx = Math.max(0, Math.min(startIndex, list.length - 1));
    setCurrentIndex(idx);
    // try to play the selected song
    playSong(list[idx]).catch(() => {});
  }

  // Play a shuffled version of the given list
  function playShuffled(list = []) {
    if (!Array.isArray(list) || list.length === 0) return;
    // Fisher-Yates shuffle
    const cloned = list.slice();
    for (let i = cloned.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    // keep a copy of original order so we can restore it when shuffle is disabled
    setOriginalQueue(list.slice());
    setShuffleMode(true);
    setQueue(cloned);
    setCurrentIndex(0);
    playSong(cloned[0]).catch(() => {});
  }

  // Toggle shuffle for current queue (if any). When enabling, shuffle current queue and play first.
  function toggleShuffle() {
    if (!queue || queue.length <= 1) {
      setShuffleMode((v) => !v);
      return;
    }
    if (!shuffleMode) {
      // enable shuffle: preserve current order as originalQueue then shuffle
      setOriginalQueue(queue.slice());
      const cloned = queue.slice();
      for (let i = cloned.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
      }
      setQueue(cloned);
      setCurrentIndex(0);
      playSong(cloned[0]).catch(() => {});
      setShuffleMode(true);
    } else {
      // disabling shuffle — restore original queue order if available
      if (originalQueue && Array.isArray(originalQueue) && originalQueue.length > 0) {
        // try to map current song to the same song in originalQueue
        const curId = current?.SongID;
        let idx = 0;
        if (curId != null) {
          const found = originalQueue.findIndex((s) => (s?.SongID || s?.songId) === curId);
          idx = found >= 0 ? found : 0;
        }
        setQueue(originalQueue.slice());
        setCurrentIndex(idx);
        // play the song at restored index (best-effort)
        playSong(originalQueue[idx]).catch(() => {});
      }
      setShuffleMode(false);
      setOriginalQueue(null);
    }
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
      // optimistic UI update
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  // Go to next track in queue if possible
  function next() {
    if (!queue || queue.length === 0) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < queue.length) {
      setCurrentIndex(nextIndex);
      playSong(queue[nextIndex]).catch(() => {});
    }
  }

  // Go to previous track or restart current track
  function prev() {
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      // restart current track
      seek(0);
      return;
    }
    if (!queue || queue.length === 0) return;
    const prevIndex = Math.max(0, currentIndex - 1);
    if (prevIndex >= 0 && prevIndex < queue.length) {
      setCurrentIndex(prevIndex);
      playSong(queue[prevIndex]).catch(() => {});
    }
  }

  function seek(seconds) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(seconds, duration || 0));
  }

  // Toggle liked state for the current song and notify listeners
  async function toggleLikeCurrent() {
    const sid = current?.SongID;
    if (!sid) return { error: 'no-song' };

    // derive listener id like elsewhere (fallback)
    const stored = localStorage.getItem('listener');
    const listenerId = stored ? JSON.parse(stored).ListenerID : 6;

    try {
      const res = await fetch(`${API_BASE_URL}/listeners/${listenerId}/liked_songs/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: sid }),
      });
      if (!res.ok) throw new Error('toggle-failed');
      const data = await res.json();

      // broadcast an event so pages (LikedPage) can react
      try {
        window.dispatchEvent(new CustomEvent('likedChanged', { detail: { songId: sid, liked: data.liked } }));
      } catch (e) {}

      return data;
    } catch (err) {
      console.error('Error toggling like for current song', err);
      return { error: err.message };
    }
  }

  function setVolumePercent(p) {
    const v = Math.max(0, Math.min(1, p));
    setVolume(v);
    const a = audioRef.current;
    if (a) a.volume = v;
  }

  const value = useMemo(
    () => ({
      current,
      queue,
      currentIndex,
      shuffleMode,
      originalQueue,
      playing,
      duration,
      currentTime,
      volume,
      audioRef,
      playSong,
      playList,
      playShuffled,
      next,
      prev,
      toggle,
      toggleShuffle,
      seek,
      setVolumePercent,
      toggleLikeCurrent,
    }),
    [current, queue, currentIndex, shuffleMode, originalQueue, playing, duration, currentTime, volume]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" />
    </Ctx.Provider>
  );
}

export function usePlayer() {
  return useContext(Ctx);
}
