import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { useAchievement } from "./AchievementContext";

const PlayerContext = createContext(null);

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
  const [repeatMode, setRepeatMode] = useState("none"); // 'none' | 'all' | 'one'
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [songHistory, setSongHistory] = useState([]); // track previous songs
  const [historyIndex, setHistoryIndex] = useState(-1); // current position in history

  const postedRef = useRef(false);
  const playThresholdMs = 30000; // 30 seconds

  // subscription + ad state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [songsSinceAd, setSongsSinceAd] = useState(0);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [pendingSongAfterAd, setPendingSongAfterAd] = useState(null);
  
  // Ad pool management
  const [adPool, setAdPool] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const adPoolRef = useRef([]);
  const currentAdIndexRef = useRef(0);

  // check subscription once
  useEffect(() => {
    const listenerId = getListenerId();
    if (!listenerId) {
      setIsSubscribed(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/listeners/${listenerId}/subscription_status`
        );
        if (!res.ok) throw new Error("subscription-status-failed");
        const data = await res.json();
        if (!cancelled) {
          setIsSubscribed(!!data.isSubscribed);
        }
      } catch (err) {
        console.error("Error checking subscription status", err);
        if (!cancelled) setIsSubscribed(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch active audio ads for the ad pool
  useEffect(() => {
    async function fetchAdPool() {
      try {
        console.log("Fetching ad pool from:", `${API_BASE_URL}/advertisements/active?type=audio`);
        
        const res = await fetch(`${API_BASE_URL}/advertisements/active?type=audio`);
        
        console.log("Ad pool fetch response status:", res.status);
        
        if (!res.ok) {
          console.warn("Failed to fetch ad pool:", res.status);
          adPoolRef.current = [];
          setAdPool([]);
          return;
        }
        
        const data = await res.json();
        console.log("Ad pool fetch response data:", data);
        
        const ads = data.advertisements || [];
        
        console.log("Parsed ads array length:", ads.length);
        
        if (ads.length === 0) {
          console.warn("No audio ads available in database");
          adPoolRef.current = [];
          setAdPool([]);
        } else {
          console.log("Ads in pool:", ads.map(ad => ({ 
            id: ad.AdID, 
            name: ad.AdName, 
            url: ad.AdFile || ad.AdFileUrl 
          })));
          
          adPoolRef.current = ads;
          setAdPool(ads);
          console.log(`Successfully loaded ${ads.length} audio ads for rotation`);
        }
      } catch (err) {
        console.error("Error fetching ad pool:", err);
        console.error("Error message:", err.message);
        adPoolRef.current = [];
        setAdPool([]);
      }
    }

    fetchAdPool();
    
    // Refresh ad pool every 5 minutes
    const interval = setInterval(fetchAdPool, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // notify API of play when appropriate (never fires for ads because SongID is null)
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

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();

      console.log(`Successfully posted play for song ${songId}: ${msPlayed}ms`);

      if (data.newAchievement) {
        console.log("API returned newAchievement:", data.newAchievement);
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

  // helper: play an ad
  async function playAd() {
    const a = audioRef.current;
    if (!a) {
      console.error("Audio element not available");
      return;
    }

    console.log("playAd() called, adPoolRef.current.length:", adPoolRef.current.length);

    // Use ads from pool if available
    if (adPoolRef.current.length === 0) {
      console.warn("No ads available in pool, skipping ad and playing next song");
      setIsPlayingAd(false);
      
      // Play the pending song instead of getting stuck
      if (pendingSongAfterAd) {
        console.log("Playing pending song after failed ad");
        const nextSong = pendingSongAfterAd;
        setPendingSongAfterAd(null);
        await playSong(nextSong);
      } else {
        console.log("No pending song, calling next()");
        next();
      }
      return;
    }

    let adUrl = null;
    let adTitle = "Advertisement";
    let adArtist = "Sponsored";
    let adId = null;

    try {
      // Select ad from pool
      const selectedAd = adPoolRef.current[currentAdIndexRef.current % adPoolRef.current.length];
      
      console.log("Selected ad:", selectedAd);
      
      if (!selectedAd) {
        console.error("Selected ad is undefined");
        setIsPlayingAd(false);
        if (pendingSongAfterAd) {
          const nextSong = pendingSongAfterAd;
          setPendingSongAfterAd(null);
          await playSong(nextSong);
        }
        return;
      }

      adUrl = selectedAd.AdFileUrl || selectedAd.AdFile;
      adTitle = selectedAd.AdName || "Advertisement";
      adId = selectedAd.AdID;

      console.log("Ad URL:", adUrl);
      console.log("Ad Title:", adTitle);
      console.log("Ad ID:", adId);

      if (!adUrl) {
        console.error("Ad URL is missing");
        setIsPlayingAd(false);
        if (pendingSongAfterAd) {
          const nextSong = pendingSongAfterAd;
          setPendingSongAfterAd(null);
          await playSong(nextSong);
        }
        return;
      }

      // Rotate to next ad for variety
      currentAdIndexRef.current = (currentAdIndexRef.current + 1) % adPoolRef.current.length;
      setCurrentAdIndex(currentAdIndexRef.current);

      console.log(`Playing ad #${currentAdIndexRef.current}: ${adTitle} (${adId})`);

      const adTrack = {
        SongID: null,
        AdID: adId,
        Title: adTitle,
        ArtistName: adArtist,
        url: adUrl,
        mime: "audio/mpeg",
        CoverURL: null,
        isAd: true,
      };

      setIsPlayingAd(true);
      setCurrent(adTrack);
      postedRef.current = false;

      a.src = adUrl;
      
      console.log("Audio element src set to:", a.src);
      console.log("Attempting to play ad...");
      
      const playPromise = a.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log("Ad started playing successfully");
        setPlaying(true);
      } else {
        console.log("Play promise is undefined, audio should be playing");
        setPlaying(true);
      }

    } catch (err) {
      console.error("Error in playAd():", err);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      
      setPlaying(false);
      setIsPlayingAd(false);
      
      // If ad fails to play, play the pending song
      if (pendingSongAfterAd) {
        console.log("Ad failed, playing pending song");
        const nextSong = pendingSongAfterAd;
        setPendingSongAfterAd(null);
        await playSong(nextSong);
      } else {
        console.log("Ad failed, calling next()");
        next();
      }
    }
  }

  // helper: actually play a song track (no ad logic here)
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
      
      // Add to song history when playing a new song
      setSongHistory((prev) => {
        // If we're navigating history and not at the end, truncate future history
        if (historyIndex >= 0 && historyIndex < prev.length - 1) {
          return [...prev.slice(0, historyIndex + 1), newSong];
        }
        // Otherwise append to history
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
      // fallback if stream data fails
      const fallbackSong = {
        SongID: id,
        Title: song?.Title || "Demo Track",
        ArtistName: song?.ArtistName || "Unknown Artist",
        url: song?.url || "",
        mime: "audio/mpeg",
        CoverURL: song?.CoverURL || null,
        isAd: false,
      };
      
      setCurrent(fallbackSong);
      
      // Add to song history
      setSongHistory((prev) => {
        if (historyIndex >= 0 && historyIndex < prev.length - 1) {
          return [...prev.slice(0, historyIndex + 1), fallbackSong];
        }
        return [...prev, fallbackSong];
      });
      setHistoryIndex((prev) => prev + 1);
      
      try {
        const a = audioRef.current;
        const fallbackUrl = song?.url;
        if (a && fallbackUrl) {
          a.src = fallbackUrl;
          await a.play().catch(() => {});
          setPlaying(true);
        } else {
          setPlaying(false);
        }
      } catch (e) {
        console.error("Error playing fallback URL:", e);
        setPlaying(false);
      }
    }
  }

  // main public playSong with ad logic
  async function playSong(song) {
    if (!song) return;

    console.log("playSong() called with:", song);
    console.log("isSubscribed:", isSubscribed);
    console.log("isPlayingAd:", isPlayingAd);
    console.log("songsSinceAd:", songsSinceAd);

    // subscribers never get ads
    if (isSubscribed) {
      console.log("User is subscribed, skipping ad logic");
      await playSongInternal(song);
      setSongsSinceAd((c) => c + 1);
      return;
    }

    // if an ad is already playing, just queue this song to play afterwards
    if (isPlayingAd) {
      console.log("Ad is already playing, queuing song for after ad");
      setPendingSongAfterAd(song);
      return;
    }

    // hit threshold: play ad first, then this song
    if (songsSinceAd >= 3) {
      console.log("Hit ad threshold (3 songs), triggering ad");
      setPendingSongAfterAd(song);
      
      // Only try to play ad if we have ads available
      if (adPoolRef.current.length > 0) {
        console.log("Ad pool available, playing ad");
        await playAd();
      } else {
        console.warn("No ads in pool, playing song immediately without ad");
        // Skip ad entirely and play song
        setPendingSongAfterAd(null);
        await playSongInternal(song);
        setSongsSinceAd(0);
      }
      return;
    }

    // otherwise play song and increment counter
    console.log("Playing song normally, incrementing counter");
    await playSongInternal(song);
    setSongsSinceAd((c) => c + 1);
  }

  // update listeners for audio events
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
        console.log(`Reached ${playThresholdMs / 1000}s threshold, posting play...`);
        postPlayIfPossible();
      }
    }

    function onPlay() {
      setPlaying(true);
    }

    function onPause() {
      setPlaying(false);
      if (a.currentTime >= playThresholdMs / 1000) {
        postPlayIfPossible();
      }
    }

    function onEnd() {
      console.log("Audio ended, isAd:", current?.isAd);
      postPlayIfPossible();

      // if an ad finished, reset counters and play the pending song if any
      if (current?.isAd) {
        console.log("Ad finished, resetting counters");
        setIsPlayingAd(false);
        setSongsSinceAd(0);
        if (pendingSongAfterAd) {
          console.log("Playing pending song after ad");
          const nextSong = pendingSongAfterAd;
          setPendingSongAfterAd(null);
          playSong(nextSong).catch(() => {});
          return;
        }
        setPlaying(false);
        return;
      }

      // don't repeat ads in repeat-one
      if (repeatMode === "one") {
        seek(0);
        if (current && !current.isAd) {
          playSong({ SongID: current.SongID }).catch(() => {});
        }
        return;
      }

      if (queue && queue.length > 0) {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= 0 && nextIndex < queue.length) {
          setCurrentIndex(nextIndex);
          playSong(queue[nextIndex]).catch(() => {});
          return;
        }

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

  // play a list from a given index
  function playList(list = [], startIndex = 0) {
    if (!Array.isArray(list) || list.length === 0) return;
    setOriginalQueue(list.slice());
    setShuffleMode(false);
    setQueue(list);
    const idx = Math.max(0, Math.min(startIndex, list.length - 1));
    setCurrentIndex(idx);
    playSong(list[idx]).catch(() => {});
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
    playSong(cloned[0]).catch(() => {});
  }

  // cycle repeat mode: none -> all -> one -> none
  function toggleRepeat() {
    setRepeatMode((prev) => {
      if (prev === "none") return "all";
      if (prev === "all") return "one";
      return "none";
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
      playSong(cloned[0]).catch(() => {});
      setShuffleMode(true);
    } else {
      if (originalQueue && Array.isArray(originalQueue) && originalQueue.length > 0) {
        const curId = current?.SongID;
        let idx = 0;
        if (curId != null) {
          const found = originalQueue.findIndex(
            (s) => (s?.SongID || s?.songId) === curId
          );
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

  // play or pause current audio
  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
      setPlaying(true);
    } else {
      a.pause();
    }
  }

  // play next track in queue (ad logic will run inside playSong)
  function next() {
    if (!queue || queue.length === 0) {
      // No queue - fetch random song
      playNext();
      return;
    }
    if (repeatMode === "one") {
      // manual next should break out of repeat-one
      setRepeatMode("all");
    }
    const nextIndex = currentIndex + 1;
    let target = null;

    if (nextIndex >= 0 && nextIndex < queue.length) {
      target = queue[nextIndex];
      setCurrentIndex(nextIndex);
    } else if (repeatMode === "all" && queue.length > 0) {
      target = queue[0];
      setCurrentIndex(0);
    } else {
      // Reached end of queue - fetch random song
      playNext();
      return;
    }

    if (target) {
      playSong(target).catch(() => {});
    }
  }

  // fetch and play a random song
  async function playNext() {
    try {
      const res = await fetch(`${API_BASE_URL}/songs`);
      if (!res.ok) throw new Error("Failed to fetch songs");
      const songs = await res.json();
      
      if (songs && songs.length > 0) {
        // Pick a random song
        const randomIndex = Math.floor(Math.random() * songs.length);
        const randomSong = songs[randomIndex];
        await playSong(randomSong);
      }
    } catch (err) {
      console.error("Error fetching random song:", err);
    }
  }

  // play previous track or restart current
  function prev() {
    const a = audioRef.current;
    // If more than 3 seconds into current song, restart it
    if (a && a.currentTime > 3) {
      seek(0);
      return;
    }
    
    // Try to go back in song history
    if (songHistory.length > 0 && historyIndex > 0) {
      const prevHistoryIndex = historyIndex - 1;
      const prevSong = songHistory[prevHistoryIndex];
      
      setHistoryIndex(prevHistoryIndex);
      setCurrent(prevSong);
      postedRef.current = false;
      
      const audio = audioRef.current;
      if (audio && prevSong.url) {
        audio.src = prevSong.url;
        audio.play().catch(() => {});
        setPlaying(true);
      }
      return;
    }
    
    // Fallback: use queue-based navigation if no history available
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
    if (!sid) return { error: "no-song" };
    const stored = localStorage.getItem("listener");
    const listenerId = stored ? JSON.parse(stored).ListenerID : 6;
    try {
      const res = await fetch(
        `${API_BASE_URL}/listeners/${listenerId}/liked_songs/toggle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId: sid }),
        }
      );
      if (!res.ok) throw new Error("toggle-failed");
      const data = await res.json();
      try {
        window.dispatchEvent(
          new CustomEvent("likedChanged", {
            detail: { songId: sid, liked: data.liked },
          })
        );
      } catch (e) {}
      return data;
    } catch (err) {
      console.error("Error toggling like for current song", err);
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

  // Clear player state and stop playback (for logout)
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
    adPoolRef.current = [];
    setAdPool([]);
    currentAdIndexRef.current = 0;
    setCurrentAdIndex(0);
  }

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
    }),
    [
      current,
      queue,
      currentIndex,
      shuffleMode,
      originalQueue,
      playing,
      duration,
      currentTime,
      volume,
      repeatMode,
      isSubscribed,
      songsSinceAd,
      adPool,
      currentAdIndex,
      songHistory,
      historyIndex,
    ]
  );

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
