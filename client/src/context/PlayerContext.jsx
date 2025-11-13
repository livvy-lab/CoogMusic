import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { useAchievement } from "./AchievementContext";

// player context
const PlayerContext = createContext(null);

// load listener id from localStorage
function getListenerId() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    return u?.listenerId ?? u?.ListenerID ?? null;
  } catch { return null; }
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const { showAchievement } = useAchievement();

  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [originalQueue, setOriginalQueue] = useState(null);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none' | 'all' | 'one'
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const postedRef = useRef(false);
  const playThresholdMs = 30000; // 30 seconds

  // notify API of play when appropriate
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
      if (postedRef.current) return;
      postedRef.current = true;
      const response = await fetch(`${API_BASE_URL}/plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, listenerId, msPlayed }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();

      console.log(`Successfully posted play for song ${songId}: ${msPlayed}ms`);

      // Achievement POPUP integration
      if (data.newAchievement) {
        console.log("API returned newAchievement:", data.newAchievement); // debugging
        showAchievement(data.newAchievement);
      }
    } catch (err) {
      console.error("Error posting play:", err);
    }
  }

  // set audio volume
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
  }, [volume]);

  // update listeners for audio events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    function onLoaded() { 
      setDuration(a.duration || 0);
      // Reset play posted flag when new song loads
      postedRef.current = false;
    }
    
    function onTime() { 
      setCurrentTime(a.currentTime || 0);
      
      // Auto-post play when reaching 30 seconds of playback
      if (!postedRef.current && a.currentTime >= (playThresholdMs / 1000)) {
        console.log(`Reached ${playThresholdMs / 1000}s threshold, posting play...`);
        postPlayIfPossible();
      }
    }
    
    function onPlay() { setPlaying(true); }
    
    function onPause() {
      setPlaying(false);
      // Only post if we've passed the threshold
      if (a.currentTime >= (playThresholdMs / 1000)) {
        postPlayIfPossible();
      }
    }
    
    function onEnd() {
      // Post play on song end (will have passed threshold if song > 30s)
      postPlayIfPossible();
      // handle repeat-one: restart same track
      if (repeatMode === 'one') {
        seek(0);
        // ensure we reload the same URL
        if (current) {
          playSong({ SongID: current.SongID }).catch(() => {});
        }
        return;
      }

      // if there is a next track, play it
      if (queue && queue.length > 0) {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= 0 && nextIndex < queue.length) {
          setCurrentIndex(nextIndex);
          playSong(queue[nextIndex]).catch(() => {});
          return;
        }

        // reached end of queue
        if (repeatMode === 'all' && queue.length > 0) {
          // wrap to start
          setCurrentIndex(0);
          playSong(queue[0]).catch(() => {});
          return;
        }
      }

      setPlaying(false);
    }

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener('ended', onEnd);

    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener('ended', onEnd);
    };
  }, [current, queue, currentIndex]);

  // play a song by id
  async function playSong(song) {
    const id = song?.SongID || song?.songId;
    if (!id) return;
    try {
      const r = await fetch(`${API_BASE_URL}/songs/${id}/stream`);
      if (!r.ok) throw new Error("No real stream found");
      const data = await r.json();
      postedRef.current = false;
      setCurrent({
        SongID: data.songId,
        Title: data.title,
        ArtistName: data.artistName,
        url: data.url,
        mime: data.mime,
        CoverURL: data.coverUrl || null,
      });
      const a = audioRef.current;
      if (a) {
        a.src = data.url;
        await a.play().catch(() => { });
      }
      setPlaying(true);
    } catch (err) {
      // fallback if stream data fails
      setCurrent({
        SongID: id,
        Title: song?.Title || "Demo Track",
        ArtistName: song?.ArtistName || "Unknown Artist",
        url: song?.url || "",
        mime: "audio/mpeg",
        CoverURL: song?.CoverURL || null,
      });
      // If the caller provided a direct URL, attach it to the audio element and play.
      try {
        const a = audioRef.current;
        const fallbackUrl = song?.url;
        if (a && fallbackUrl) {
          a.src = fallbackUrl;
          await a.play().catch(() => { });
          setPlaying(true);
        } else {
          // nothing to play, but mark playing state so UI updates. The UI will show current info.
          setPlaying(false);
        }
      } catch (e) {
        console.error('Error playing fallback URL:', e);
        setPlaying(false);
      }
    }
  }

  // play a list from a given index
  function playList(list = [], startIndex = 0) {
    if (!Array.isArray(list) || list.length === 0) return;
    setOriginalQueue(list.slice());
    setShuffleMode(false);
    setQueue(list);
    const idx = Math.max(0, Math.min(startIndex, list.length - 1));
    setCurrentIndex(idx);
    playSong(list[idx]).catch(() => { });
  }

  // play a shuffled copy of the list
  function playShuffled(list = []) {
    if (!Array.isArray(list) || list.length === 0) return;
    const cloned = list.slice();
    for (let i = cloned.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    setOriginalQueue(list.slice());
    setShuffleMode(true);
    setQueue(cloned);
    setCurrentIndex(0);
    playSong(cloned[0]).catch(() => { });
  }

  // cycle repeat mode: none -> all -> one -> none
  function toggleRepeat() {
    setRepeatMode((prev) => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  }

  // toggle shuffle mode for current queue
  function toggleShuffle() {
    if (!queue || queue.length <= 1) {
      setShuffleMode((v) => !v);
      return;
    }
    if (!shuffleMode) {
      setOriginalQueue(queue.slice());
      const cloned = queue.slice();
      for (let i = cloned.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
      }
      setQueue(cloned);
      setCurrentIndex(0);
      playSong(cloned[0]).catch(() => { });
      setShuffleMode(true);
    } else {
      if (originalQueue && Array.isArray(originalQueue) && originalQueue.length > 0) {
        const curId = current?.SongID;
        let idx = 0;
        if (curId != null) {
          const found = originalQueue.findIndex((s) => (s?.SongID || s?.songId) === curId);
          idx = found >= 0 ? found : 0;
        }
        setQueue(originalQueue.slice());
        setCurrentIndex(idx);
        playSong(originalQueue[idx]).catch(() => { });
      }
      setShuffleMode(false);
      setOriginalQueue(null);
    }
  }

  // play or pause current audio
  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => { });
      setPlaying(true);
    } else {
      a.pause();
    }
  }

  // play next track in queue
  function next() {
    if (!queue || queue.length === 0) return;
    // If user manually presses Next while in repeat-one, switch back to playlist repeat
    if (repeatMode === 'one') {
      setRepeatMode('all');
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < queue.length) {
      setCurrentIndex(nextIndex);
      playSong(queue[nextIndex]).catch(() => { });
      return;
    }

    // If we've reached the end of the queue and repeat-all is enabled, wrap to the start
    if (repeatMode === 'all' && queue.length > 0) {
      setCurrentIndex(0);
      playSong(queue[0]).catch(() => { });
      return;
    }
  }

  // play previous track or restart current
  function prev() {
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      seek(0);
      return;
    }
    if (!queue || queue.length === 0) return;
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0 && prevIndex < queue.length) {
      setCurrentIndex(prevIndex);
      playSong(queue[prevIndex]).catch(() => { });
      return;
    }

    // If at the start and repeat-all is enabled, wrap to the last track
    if (repeatMode === 'all' && queue.length > 0) {
      const last = queue.length - 1;
      setCurrentIndex(last);
      playSong(queue[last]).catch(() => { });
      return;
    }
  }

  // seek to time (seconds)
  function seek(seconds) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(seconds, duration || 0));
  }

  // toggle like state for current song
  async function toggleLikeCurrent() {
    const sid = current?.SongID;
    if (!sid) return { error: 'no-song' };
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
      try {
        window.dispatchEvent(new CustomEvent('likedChanged', { detail: { songId: sid, liked: data.liked } }));
      } catch (e) {}
      return data;
    } catch (err) {
      console.error('Error toggling like for current song', err);
      return { error: err.message };
    }
  }

  // Audio volume
  function setVolumePercent(p) {
    const v = Math.max(0, Math.min(1, p));
    setVolume(v);
    const a = audioRef.current;
    if (a) a.volume = v;
  }

  // Memoized value, for stable context
  const value = useMemo(
    () => ({
      current,
      queue,
      currentIndex,
      shuffleMode,
      repeatMode,
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
      toggleRepeat,
      seek,
      setVolumePercent,
      toggleLikeCurrent,
    }),
    [current, queue, currentIndex, shuffleMode, originalQueue, playing, duration, currentTime, volume, repeatMode]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" />
    </PlayerContext.Provider>
  );
}

// hook to use player context
export function usePlayer() {
  return useContext(PlayerContext);
}
