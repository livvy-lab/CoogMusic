import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const Ctx = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);

  const [current, setCurrent] = useState(null);
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
    function onEnd() { setPlaying(false); }

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  async function playSong(song) {
    const id = song?.SongID || song?.songId;
    if (!id) return;
    const r = await fetch(`${API_BASE}/songs/${id}/stream`);
    if (!r.ok) return;
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
      a.play().catch(() => {});
    }
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

  function setVolumePercent(p) {
    const v = Math.max(0, Math.min(1, p));
    setVolume(v);
    const a = audioRef.current;
    if (a) a.volume = v;
  }

  const value = useMemo(
    () => ({
      current,
      playing,
      duration,
      currentTime,
      volume,
      audioRef,
      playSong,
      toggle,
      seek,
      setVolumePercent,
    }),
    [current, playing, duration, currentTime, volume]
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
