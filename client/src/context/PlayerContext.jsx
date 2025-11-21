import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "../config/api";
import { useAchievement } from "./AchievementContext";

const PlayerContext = createContext(null);
// test comment
// load listener id from localStorage
function getListenerId() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    return u?.listenerId ?? u?.ListenerID ?? null;
  } catch {
    return null;
  }
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const { showAchievement } = useAchievement();

  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [originalQueue, setOriginalQueue] = useState(null);
  const [repeatMode, setRepeatMode] = useState("none");
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [songHistory, setSongHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const postedRef = useRef(false);
  const playThresholdMs = 30000;

  // subscription + ad state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const isSubscribedRef = useRef(false); // Keep ref for immediate access
  
  const [songsSinceAd, setSongsSinceAd] = useState(0);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [pendingSongAfterAd, setPendingSongAfterAd] = useState(null);
  
  // Ad pool management
  const [adPool, setAdPool] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [adPoolLoading, setAdPoolLoading] = useState(true);
  const [adPoolError, setAdPoolError] = useState(null);
  
  const adPoolRef = useRef([]);
  const currentAdIndexRef = useRef(0);

  // ------------------------------------------------------------
  // 1. FETCH SUBSCRIPTION
  // ------------------------------------------------------------
  useEffect(() => {
    const listenerId = getListenerId();
    console.log("=== SUBSCRIPTION CHECK ===");
    
    if (!listenerId) {
      console.log("No listener ID found");
      setIsSubscribed(false);
      isSubscribedRef.current = false;
      setSubscriptionLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Point to the correct subscription endpoint
        const url = `${API_BASE_URL}/subscriptions/status/${listenerId}`;
        const res = await fetch(url);
        
        if (res.status === 404) {
           if (!cancelled) {
             setIsSubscribed(false);
             isSubscribedRef.current = false;
             setSubscriptionLoading(false);
           }
           return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        
        if (!cancelled) {
          const subscribed = !!data.isSubscribed;
          setIsSubscribed(subscribed);
          isSubscribedRef.current = subscribed;
          setSubscriptionLoading(false);
          console.log("✅ Subscription status:", subscribed);
        }
      } catch (err) {
        console.error("❌ Error fetching subscription status:", err);
        if (!cancelled) {
          setIsSubscribed(false);
          isSubscribedRef.current = false;
          setSubscriptionError(err.message);
          setSubscriptionLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ------------------------------------------------------------
  // 2. FETCH AD POOL (REUSABLE FUNCTION)
  // ------------------------------------------------------------
  const fetchAdPool = useCallback(async () => {
    setAdPoolLoading(true);
    try {
      console.log("Fetching ad pool from API...");
      const res = await fetch(`${API_BASE_URL}/advertisements/active?type=audio`);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const ads = data.advertisements || [];
      
      if (ads.length === 0) {
        console.warn("Server returned 0 active audio ads.");
      } else {
        console.log(`Successfully loaded ${ads.length} audio ads.`);
      }

      // Update both Ref (for immediate use) and State (for re-renders)
      adPoolRef.current = ads;
      setAdPool(ads);
      setAdPoolError(null);
      return ads; // Return the ads for chaining
    } catch (err) {
      console.error("❌ Error fetching ad pool:", err);
      setAdPoolError(err.message);
      // Don't clear the pool on error if we already have ads? 
      // Usually safer to leave it or clear it. We'll clear it to be safe.
      // adPoolRef.current = []; 
      // setAdPool([]);
      return [];
    } finally {
      setAdPoolLoading(false);
    }
  }, []);

  // Initial load + Interval
  useEffect(() => {
    fetchAdPool();
    
    // Refresh ad pool every 5 minutes
    const interval = setInterval(fetchAdPool, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAdPool]);

  // ------------------------------------------------------------
  // 3. POST PLAY LOGIC
  // ------------------------------------------------------------
  async function postPlayIfPossible(msOverride) {
    try {
      const songId = current?.SongID;
      const listenerId = getListenerId();
      if (!songId || !listenerId) return;
      const a = audioRef.current;
      const msPlayed =
        typeof msOverride === "number"
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

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      if (data.newAchievement) {
        showAchievement(data.newAchievement);
      }
    } catch (err) {
      console.error("Error posting play:", err);
    }
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
  }, [volume]);

  // ------------------------------------------------------------
  // 4. PLAY AD LOGIC
  // ------------------------------------------------------------
  async function playAd() {
    const a = audioRef.current;
    if (!a) return;

    // Safety check: get current pool
    const ads = adPoolRef.current;

    if (!ads || ads.length === 0) {
      console.warn("playAd called but pool is empty. Skipping.");
      setIsPlayingAd(false);
      
      if (pendingSongAfterAd) {
        const nextSong = pendingSongAfterAd;
        setPendingSongAfterAd(null);
        await playSongInternal(nextSong);
      } else {
        next();
      }
      return;
    }

    try {
      // Select ad
      const selectedAd = ads[currentAdIndexRef.current % ads.length];
      const adUrl = selectedAd.AdFileUrl || selectedAd.AdFile;
      const adTitle = selectedAd.AdName || "Advertisement";
      const adId = selectedAd.AdID;

      if (!adUrl) throw new Error("Ad URL missing");

      // Rotate index
      currentAdIndexRef.current = (currentAdIndexRef.current + 1) % ads.length;
      setCurrentAdIndex(currentAdIndexRef.current);

      console.log(`📢 Playing Ad: ${adTitle}`);

      const adTrack = {
        SongID: null,
        AdID: adId,
        Title: adTitle,
        ArtistName: "Sponsored",
        url: adUrl,
        mime: "audio/mpeg",
        CoverURL: null, // You could add a placeholder image here
        isAd: true,
      };

      setIsPlayingAd(true);
      setCurrent(adTrack);
      postedRef.current = false;

      a.src = adUrl;
      await a.play();
      setPlaying(true);

    } catch (err) {
      console.error("Error in playAd():", err);
      setIsPlayingAd(false);
      setPlaying(false);
      
      if (pendingSongAfterAd) {
        const nextSong = pendingSongAfterAd;
        setPendingSongAfterAd(null);
        await playSongInternal(nextSong);
      } else {
        next();
      }
    }
  }

  // ------------------------------------------------------------
  // 5. INTERNAL PLAY SONG (No Ad Logic)
  // ------------------------------------------------------------
  async function playSongInternal(song) {
    const id = song?.SongID || song?.songId;
    if (!id) return;

    try {
      const r = await fetch(`${API_BASE_URL}/songs/${id}/stream`);
      if (!r.ok) throw new Error("No real stream found");
      const data = await r.json();
      postedRef.current = false;
      
      const newSong = {
        SongID: data.songId,
        Title: data.title,
        ArtistName: data.artistName,
        url: data.url,
        mime: data.mime,
        CoverURL: data.coverUrl || null,
        isAd: false,
      };
      
      setCurrent(newSong);
      
      // Add to history
      setSongHistory((prev) => {
        if (historyIndex >= 0 && historyIndex < prev.length - 1) {
          return [...prev.slice(0, historyIndex + 1), newSong];
        }
        return [...prev, newSong];
      });
      setHistoryIndex((prev) => prev + 1);
      
      const a = audioRef.current;
      if (a) {
        a.src = data.url;
        await a.play().catch(() => {});
      }
      setPlaying(true);
    } catch (err) {
      // Fallback logic if stream fails (use provided URL if any)
      const fallbackSong = {
        SongID: id,
        Title: song?.Title || "Track",
        ArtistName: song?.ArtistName || "Unknown",
        url: song?.url || "",
        mime: "audio/mpeg",
        CoverURL: song?.CoverURL || null,
        isAd: false,
      };
      
      setCurrent(fallbackSong);
      setSongHistory((prev) => [...prev, fallbackSong]);
      setHistoryIndex((prev) => prev + 1);

      if (song?.url && audioRef.current) {
        audioRef.current.src = song.url;
        audioRef.current.play().catch(() => {});
        setPlaying(true);
      } else {
        setPlaying(false);
      }
    }
  }

  // ------------------------------------------------------------
  // 6. MAIN PLAY SONG (Ad Logic Included)
  // ------------------------------------------------------------
  async function playSong(song) {
    if (!song) return;

    console.log("=== playSong() ===");

    // A. Subscriber check
    if (isSubscribedRef.current) {
      console.log("✅ Subscriber: Skipping ad logic.");
      await playSongInternal(song);
      setSongsSinceAd((c) => c + 1);
      return;
    }

    // B. If Ad is currently playing, queue this song
    if (isPlayingAd) {
      console.log("Ad playing, queuing next song.");
      setPendingSongAfterAd(song);
      return;
    }

    // C. Check Ad Threshold
    if (songsSinceAd >= 3) {
      console.log("🎯 Ad Threshold Hit (3 songs).");
      setPendingSongAfterAd(song);
      
      // === FIX: Emergency Fetch ===
      // If pool is empty, try to fetch RIGHT NOW before giving up
      if (adPoolRef.current.length === 0) {
        console.log("⚠️ Pool empty! Attempting emergency fetch...");
        await fetchAdPool(); 
      }

      // Re-check after fetch
      if (adPoolRef.current.length > 0) {
        console.log("Ads available. Playing ad.");
        await playAd();
      } else {
        console.warn("❌ Still no ads after fetch. Playing song immediately.");
        setPendingSongAfterAd(null);
        await playSongInternal(song);
        setSongsSinceAd(0); // Reset anyway so we don't check every single song forever
      }
      return;
    }

    // D. Normal Play
    await playSongInternal(song);
    setSongsSinceAd((c) => c + 1);
  }

  // ------------------------------------------------------------
  // 7. AUDIO EVENTS
  // ------------------------------------------------------------
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    function onLoaded() {
      setDuration(a.duration || 0);
      postedRef.current = false;
    }

    function onTime() {
      setCurrentTime(a.currentTime || 0);
      if (!postedRef.current && a.currentTime >= playThresholdMs / 1000) {
        postPlayIfPossible();
      }
    }

    function onPlay() { setPlaying(true); }
    function onPause() { 
      setPlaying(false); 
      // optional: track if they paused after 30s
      if (a.currentTime >= playThresholdMs / 1000) postPlayIfPossible();
    }

    function onEnd() {
      console.log("Track ended. isAd:", current?.isAd);
      postPlayIfPossible();

      if (current?.isAd) {
        console.log("Ad finished.");
        setIsPlayingAd(false);
        setSongsSinceAd(0);
        if (pendingSongAfterAd) {
          const nextSong = pendingSongAfterAd;
          setPendingSongAfterAd(null);
          playSong(nextSong).catch(() => {});
          return;
        }
        setPlaying(false);
        return;
      }

      // Normal song ended
      if (repeatMode === "one") {
        seek(0);
        if (current && !current.isAd) playSong({ SongID: current.SongID }).catch(() => {});
        return;
      }

      // Next in queue
      if (queue && queue.length > 0) {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= 0 && nextIndex < queue.length) {
          setCurrentIndex(nextIndex);
          playSong(queue[nextIndex]).catch(() => {});
          return;
        }
        // Loop queue
        if (repeatMode === "all" && queue.length > 0) {
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
    a.addEventListener("ended", onEnd);

    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
    };
  }, [current, queue, currentIndex, pendingSongAfterAd, repeatMode, songsSinceAd, isPlayingAd]);

  // ... (Rest of the helpers: playList, playShuffled, toggle, next, prev, seek, toggleLikeCurrent, setVolumePercent, clearPlayer) ...
  // Copying standard helper functions below for completeness

  function playList(list = [], startIndex = 0) {
    if (!Array.isArray(list) || list.length === 0) return;
    setOriginalQueue(list.slice());
    setShuffleMode(false);
    setQueue(list);
    const idx = Math.max(0, Math.min(startIndex, list.length - 1));
    setCurrentIndex(idx);
    playSong(list[idx]).catch(() => {});
  }

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
    playSong(cloned[0]).catch(() => {});
  }

  function toggleRepeat() {
    setRepeatMode((prev) => (prev === "none" ? "all" : prev === "all" ? "one" : "none"));
  }

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
      playSong(cloned[0]).catch(() => {});
      setShuffleMode(true);
    } else {
      if (originalQueue?.length > 0) {
        const curId = current?.SongID;
        let idx = 0;
        if (curId != null) {
          const found = originalQueue.findIndex((s) => (s?.SongID || s?.songId) === curId);
          idx = found >= 0 ? found : 0;
        }
        setQueue(originalQueue.slice());
        setCurrentIndex(idx);
        playSong(originalQueue[idx]).catch(() => {});
      }
      setShuffleMode(false);
      setOriginalQueue(null);
    }
  }

  function toggle() {
    const a = audioRef.current;
    if (a) {
      if (a.paused) {
        a.play().catch(() => {});
        setPlaying(true);
      } else {
        a.pause();
      }
    }
  }

  function next() {
    if (!queue || queue.length === 0) {
      playNext();
      return;
    }
    if (repeatMode === "one") setRepeatMode("all");
    const nextIndex = currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < queue.length) {
      setCurrentIndex(nextIndex);
      playSong(queue[nextIndex]).catch(() => {});
    } else if (repeatMode === "all" && queue.length > 0) {
      setCurrentIndex(0);
      playSong(queue[0]).catch(() => {});
    } else {
      playNext();
    }
  }

  async function playNext() {
    try {
      const res = await fetch(`${API_BASE_URL}/songs`);
      if (!res.ok) throw new Error("Failed to fetch songs");
      const songs = await res.json();
      if (songs && songs.length > 0) {
        const randomIndex = Math.floor(Math.random() * songs.length);
        await playSong(songs[randomIndex]);
      }
    } catch (err) {
      console.error("Error fetching random song:", err);
    }
  }

  function prev() {
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      seek(0);
      return;
    }
    if (songHistory.length > 0 && historyIndex > 0) {
      const prevHistoryIndex = historyIndex - 1;
      const prevSong = songHistory[prevHistoryIndex];
      setHistoryIndex(prevHistoryIndex);
      setCurrent(prevSong);
      postedRef.current = false;
      if (audioRef.current && prevSong.url) {
        audioRef.current.src = prevSong.url;
        audioRef.current.play().catch(() => {});
        setPlaying(true);
      }
      return;
    }
    if (!queue || queue.length === 0) return;
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0 && prevIndex < queue.length) {
      setCurrentIndex(prevIndex);
      playSong(queue[prevIndex]).catch(() => {});
      return;
    }
    if (repeatMode === "all" && queue.length > 0) {
      const last = queue.length - 1;
      setCurrentIndex(last);
      playSong(queue[last]).catch(() => {});
    }
  }

  function seek(seconds) {
    const a = audioRef.current;
    if (a) a.currentTime = Math.max(0, Math.min(seconds, duration || 0));
  }

  async function toggleLikeCurrent() {
    const sid = current?.SongID;
    if (!sid) return { error: "no-song" };
    const stored = localStorage.getItem("user");
    const listenerId = stored ? JSON.parse(stored).listenerId : null;
    if (!listenerId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/listeners/${listenerId}/liked_songs/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: sid }),
      });
      const data = await res.json();
      window.dispatchEvent(new CustomEvent("likedChanged", { detail: { songId: sid, liked: data.liked } }));
      return data;
    } catch (err) {
      return { error: err.message };
    }
  }

  function setVolumePercent(p) {
    const v = Math.max(0, Math.min(1, p));
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }

  function clearPlayer() {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = "";
    }
    setCurrent(null);
    setQueue([]);
    setCurrentIndex(-1);
    setPlaying(false);
    setShuffleMode(false);
    setOriginalQueue(null);
    setRepeatMode("none");
    setDuration(0);
    setCurrentTime(0);
    setSongHistory([]);
    setHistoryIndex(-1);
    postedRef.current = false;
    setSongsSinceAd(0);
    setIsPlayingAd(false);
    setPendingSongAfterAd(null);
    // Note: We do NOT clear adPoolRef here to ensure subsequent logins have ads ready
    setAdPoolLoading(true);
    setIsSubscribed(false);
    isSubscribedRef.current = false;
  }

  const value = useMemo(() => ({
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
    isSubscribed,
    songsSinceAd,
    adPool,
    currentAdIndex,
    songHistory,
    historyIndex,
    playSong,
    playList,
    playShuffled,
    playNext,
    next,
    prev,
    toggle,
    toggleShuffle,
    toggleRepeat,
    seek,
    setVolumePercent,
    toggleLikeCurrent,
    clearPlayer,
  }), [
    current, queue, currentIndex, shuffleMode, originalQueue, playing, duration, currentTime, volume, repeatMode, isSubscribed, songsSinceAd, adPool, currentAdIndex, songHistory, historyIndex
  ]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}