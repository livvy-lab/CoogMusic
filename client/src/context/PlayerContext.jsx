import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const Ctx = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);

  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);

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
  }, []);

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

  // Commented out the original playSong function for testing purposes
  // async function playSong(song) {
  //   const id = song?.SongID || song?.songId;
  //   if (!id) return;
  //   const r = await fetch(`${API_BASE}/songs/${id}/stream`);
  //   if (!r.ok) return;
  //   const data = await r.json();
  //   setCurrent({
  //     SongID: data.songId,
  //     Title: data.title,
  //     ArtistName: data.artistName,
  //     url: data.url,
  //     mime: data.mime,
  //   });
  //   const a = audioRef.current;
  //   if (a) {
  //     a.src = data.url;
  //     a.play().catch(() => {});
  //   }
  // }

  // New code for testing
  async function playSong(song) {
    const id = song?.SongID || song?.songId;
    if (!id) {
      // Fallback for testing mode
      setCurrent({
        SongID: Date.now(),
        Title: song?.Title || "Demo Track",
        ArtistName: song?.ArtistName || "Unknown Artist",
        url: "", // no real audio yet
        mime: "audio/mpeg",
      });
      setPlaying(true);
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/songs/${id}/stream`);
      if (!r.ok) throw new Error("No real stream found");

      const data = await r.json();
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
      // ✅ Fallback if backend doesn't return audio yet
      console.warn("Mock play:", err.message);
      setCurrent({
        SongID: id,
        Title: song?.Title || "Demo Track",
        ArtistName: song?.ArtistName || "Unknown Artist",
        url: "",
        mime: "audio/mpeg",
      });
      setPlaying(true);
    }
  }

  // Play a list/queue of songs starting at index (default 0)
  function playList(list = [], startIndex = 0) {
    if (!Array.isArray(list) || list.length === 0) return;
    setQueue(list);
    const idx = Math.max(0, Math.min(startIndex, list.length - 1));
    setCurrentIndex(idx);
    // try to play the selected song
    playSong(list[idx]).catch(() => {});
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
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
      const res = await fetch(`${API_BASE}/listeners/${listenerId}/liked_songs/toggle`, {
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
      playing,
      duration,
      currentTime,
      volume,
      audioRef,
      playSong,
      playList,
      toggle,
      seek,
      setVolumePercent,
      toggleLikeCurrent,
    }),
    [current, queue, currentIndex, playing, duration, currentTime, volume]
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
