"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Music, X, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from "lucide-react";

interface Song {
  eid: string;
  title: string;
}

interface PlaylistData {
  lastUpdated: string;
  songs: Song[];
}

interface YTPlayer {
  destroy(): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  setVolume(v: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
  cueVideoById(videoId: string, startSeconds?: number): void;
}

interface YTGlobal {
  Player: new (id: string, options: Record<string, unknown>) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
}

declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function GlobalMusicPlayer() {
  // ---------- State ----------
  const [songs, setSongs] = useState<Song[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameName, setGameName] = useState<string | null>(null);
  const [gameImage, setGameImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dominantColor, setDominantColor] = useState("rgba(245, 158, 11, 0.15)");

  // ---------- Refs (always-current values, no stale closures) ----------
  const songsRef = useRef<Song[]>([]);
  const gameIdRef = useRef<string | null>(null);
  const gameNameRef = useRef<string | null>(null);
  const currentIndexRef = useRef(0);
  const volumeRef = useRef(50);
  const isMutedRef = useRef(false);
  const isPlayingRef = useRef(false);

  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ytApiReadyRef = useRef(false);
  const pendingVideoRef = useRef<{ eid: string; autoplay: boolean; startTime: number } | null>(null);

  // Keep refs in sync with state
  useEffect(() => { songsRef.current = songs; }, [songs]);
  useEffect(() => { gameIdRef.current = gameId; }, [gameId]);
  useEffect(() => { gameNameRef.current = gameName; }, [gameName]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Tracks whether the user explicitly paused (vs. browser/focus auto-pause)
  const userPausedRef = useRef(false);
  // Resume timer reference (used to cancel if user manually pauses right after)
  const autoResumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ---------- Broadcast helper ----------
  const broadcastStatus = useCallback(() => {
    window.dispatchEvent(new CustomEvent("music-player-status", {
      detail: {
        gameId: gameIdRef.current,
        gameName: gameNameRef.current,
        currentIndex: currentIndexRef.current,
        isPlaying: isPlayingRef.current,
        songs: songsRef.current,
      }
    }));
  }, []);

  // ---------- Dominant Color Extraction ----------
  const updateDominantColor = useCallback((imgUrl: string | null) => {
    if (!imgUrl) { setDominantColor("rgba(245, 158, 11, 0.12)"); return; }
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 10; canvas.height = 10;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, 10, 10);
          const data = ctx.getImageData(0, 0, 10, 10).data;
          let r = 0, g = 0, b = 0;
          for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
          const count = data.length / 4;
          setDominantColor(`rgba(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)}, 0.22)`);
          return;
        }
      } catch { /* CORS */ }
      setDominantColor("rgba(245, 158, 11, 0.12)");
    };
    img.onerror = () => setDominantColor("rgba(245, 158, 11, 0.12)");
    img.src = imgUrl;
  }, []);

  // ---------- YouTube Player: core creation ----------
  const createYtPlayer = useCallback((eid: string, autoplay: boolean, startTime = 0) => {
    // Destroy any existing player first to do a clean load
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
      ytPlayerRef.current = null;
    }

    // Re-create container div (necessary after destroy)
    if (playerContainerRef.current) {
      playerContainerRef.current.innerHTML = "";
      const div = document.createElement("div");
      div.id = "yt-player-inner";
      playerContainerRef.current.appendChild(div);
    }

    if (!window.YT?.Player) {
      // API not ready yet — store request and handle when ready
      pendingVideoRef.current = { eid, autoplay, startTime };
      return;
    }

    try {
      ytPlayerRef.current = new window.YT.Player("yt-player-inner", {
        height: "0",
        width: "0",
        videoId: eid,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          start: Math.floor(startTime),
        },
        events: {
          onReady: (event: { target: YTPlayer }) => {
            ytPlayerRef.current = event.target;
            event.target.setVolume(isMutedRef.current ? 0 : volumeRef.current);
            if (autoplay) {
              event.target.playVideo();
              setIsPlaying(true);
              isPlayingRef.current = true;
              broadcastStatus();
            }
          },
          onStateChange: (event: { data: number }) => {
            const ENDED = 0, PLAYING = 1, PAUSED = 2;
            if (event.data === PLAYING) {
              // Cancel any pending auto-resume (we're already playing)
              if (autoResumeTimerRef.current) {
                clearTimeout(autoResumeTimerRef.current);
                autoResumeTimerRef.current = null;
              }
              userPausedRef.current = false;
              setIsPlaying(true);
              isPlayingRef.current = true;
              broadcastStatus();
            } else if (event.data === PAUSED) {
              if (userPausedRef.current) {
                // User intentionally paused — respect it
                userPausedRef.current = false;
                setIsPlaying(false);
                isPlayingRef.current = false;
                broadcastStatus();
              } else {
                // Browser/focus auto-pause (modal open/close, DOM change, etc.)
                // Schedule auto-resume after 350ms to override it
                if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
                autoResumeTimerRef.current = setTimeout(() => {
                  const player = ytPlayerRef.current;
                  // Only resume if we're still supposed to be playing
                  if (player && isPlayingRef.current !== false) {
                    try { player.playVideo(); } catch { /* ignore */ }
                  } else {
                    // The state already reflects paused intentionally from some other path
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                    broadcastStatus();
                  }
                  autoResumeTimerRef.current = null;
                }, 350);
              }
            } else if (event.data === ENDED) {
              // Auto-advance to next track, delayed to let YT API call stack clear safely
              setTimeout(() => {
                const currentSongs = songsRef.current;
                if (currentSongs.length > 0) {
                  const nextIdx = (currentIndexRef.current + 1) % currentSongs.length;
                  currentIndexRef.current = nextIdx;
                  setCurrentIndex(nextIdx);
                  setCurrentTime(0);
                  localStorage.setItem("bggbrowser_music_index", String(nextIdx));
                  localStorage.setItem("bggbrowser_music_position", "0");
                  broadcastStatus();
                  if (currentSongs[nextIdx]) {
                    createYtPlayer(currentSongs[nextIdx].eid, true);
                  }
                }
              }, 100);
            }
          },
          onError: (event: { data: number }) => {
            console.warn("[GlobalMusicPlayer] YouTube error (restricted/unplayable):", event.data);
            // Skip to next track on error, delayed to let YT API call stack clear safely
            setTimeout(() => {
              const currentSongs = songsRef.current;
              if (currentSongs.length > 1) {
                const nextIdx = (currentIndexRef.current + 1) % currentSongs.length;
                currentIndexRef.current = nextIdx;
                setCurrentIndex(nextIdx);
                setCurrentTime(0);
                broadcastStatus();
                if (currentSongs[nextIdx]) {
                  createYtPlayer(currentSongs[nextIdx].eid, true);
                }
              } else {
                // If only 1 song exists, stop playback to avoid infinite loops
                setIsPlaying(false);
                isPlayingRef.current = false;
                broadcastStatus();
              }
            }, 500);
          },
        },
      });
    } catch (err) {
      console.error("[GlobalMusicPlayer] Failed to create YT player:", err);
    }
  }, [broadcastStatus]); // stable - broadcastStatus uses refs only

  // ---------- Load YouTube IFrame API ----------
  useEffect(() => {
    const win = window as Window;

    const onApiReady = () => {
      ytApiReadyRef.current = true;
      // If there was a pending video while API was loading, play it now
      if (pendingVideoRef.current) {
        const { eid, autoplay, startTime } = pendingVideoRef.current;
        pendingVideoRef.current = null;
        createYtPlayer(eid, autoplay, startTime);
      }
    };

    if (win.YT?.Player) {
      // Already loaded
      ytApiReadyRef.current = true;
    } else {
      win.onYouTubeIframeAPIReady = onApiReady;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }
  }, [createYtPlayer]);

  // ---------- Prepare hidden player container ----------
  useEffect(() => {
    if (playerContainerRef.current) {
      playerContainerRef.current.innerHTML = "";
      const div = document.createElement("div");
      div.id = "yt-player-inner";
      playerContainerRef.current.appendChild(div);
    }
  }, []);

  // ---------- Restore state from localStorage on mount ----------
  useEffect(() => {
    try {
      const savedVolume = localStorage.getItem("bggbrowser_music_volume");
      if (savedVolume !== null) { const v = Number(savedVolume); setVolume(v); volumeRef.current = v; }

      const savedMute = localStorage.getItem("bggbrowser_music_muted");
      if (savedMute !== null) { const m = savedMute === "true"; setIsMuted(m); isMutedRef.current = m; }

      const savedGameId = localStorage.getItem("bggbrowser_music_gameId");
      const savedGameName = localStorage.getItem("bggbrowser_music_gameName");
      const savedGameImage = localStorage.getItem("bggbrowser_music_gameImage");
      const savedSongs = localStorage.getItem("bggbrowser_music_songs");
      const savedIndex = localStorage.getItem("bggbrowser_music_index");
      const savedPos = localStorage.getItem("bggbrowser_music_position");

      if (savedGameId && savedSongs) {
        const parsedSongs = JSON.parse(savedSongs) as Song[];
        if (parsedSongs.length === 0) return;
        const parsedIndex = savedIndex ? Math.min(Number(savedIndex), parsedSongs.length - 1) : 0;
        const parsedPos = savedPos ? Number(savedPos) : 0;

        setGameId(savedGameId);
        setGameName(savedGameName);
        setGameImage(savedGameImage);
        setSongs(parsedSongs);
        setCurrentIndex(parsedIndex);
        setCurrentTime(parsedPos);

        gameIdRef.current = savedGameId;
        gameNameRef.current = savedGameName;
        songsRef.current = parsedSongs;
        currentIndexRef.current = parsedIndex;

        updateDominantColor(savedGameImage);
        // Load paused (don't autoplay on page restore)
        createYtPlayer(parsedSongs[parsedIndex].eid, false, parsedPos);
      }
    } catch (err) {
      console.warn("[GlobalMusicPlayer] Failed to restore state:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // ---------- Time tracking ----------
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const player = ytPlayerRef.current;
      if (player && typeof player.getCurrentTime === "function") {
        const t = player.getCurrentTime() || 0;
        const d = player.getDuration() || 0;
        setCurrentTime(t);
        setDuration(d);
        localStorage.setItem("bggbrowser_music_position", String(t));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ---------- Inactivity auto-minimize ----------
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => setIsExpanded(false), 4000);
  }, []);

  // ---------- Player Controls ----------
  const handleTogglePlay = useCallback(() => {
    resetInactivityTimer();
    const player = ytPlayerRef.current;
    if (!player) return;
    if (isPlayingRef.current) {
      // Cancel any pending auto-resume timers
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current);
        autoResumeTimerRef.current = null;
      }
      // Flag this as user-intentional so onStateChange doesn't auto-resume
      userPausedRef.current = true;
      if (typeof player.pauseVideo === "function") { player.pauseVideo(); }
      setIsPlaying(false);
      isPlayingRef.current = false;
      broadcastStatus();
    } else {
      userPausedRef.current = false;
      if (typeof player.playVideo === "function") { player.playVideo(); }
      setIsPlaying(true);
      isPlayingRef.current = true;
      broadcastStatus();
    }
  }, [broadcastStatus, resetInactivityTimer]);

  const handleNext = useCallback(() => {
    resetInactivityTimer();
    const sgs = songsRef.current;
    if (sgs.length === 0) return;
    const nextIdx = (currentIndexRef.current + 1) % sgs.length;
    currentIndexRef.current = nextIdx;
    setCurrentIndex(nextIdx);
    setCurrentTime(0);
    localStorage.setItem("bggbrowser_music_index", String(nextIdx));
    localStorage.setItem("bggbrowser_music_position", "0");
    broadcastStatus();
    createYtPlayer(sgs[nextIdx].eid, true);
  }, [createYtPlayer, broadcastStatus, resetInactivityTimer]);

  const handlePrev = useCallback(() => {
    resetInactivityTimer();
    const sgs = songsRef.current;
    if (sgs.length === 0) return;
    const prevIdx = (currentIndexRef.current - 1 + sgs.length) % sgs.length;
    currentIndexRef.current = prevIdx;
    setCurrentIndex(prevIdx);
    setCurrentTime(0);
    localStorage.setItem("bggbrowser_music_index", String(prevIdx));
    localStorage.setItem("bggbrowser_music_position", "0");
    broadcastStatus();
    createYtPlayer(sgs[prevIdx].eid, true);
  }, [createYtPlayer, broadcastStatus, resetInactivityTimer]);

  const handleStop = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.stopVideo(); } catch { /* ignore */ }
      try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
      ytPlayerRef.current = null;
    }
    setIsPlaying(false); isPlayingRef.current = false;
    setGameId(null); gameIdRef.current = null;
    setGameName(null); gameNameRef.current = null;
    setGameImage(null);
    setSongs([]); songsRef.current = [];
    setCurrentIndex(0); currentIndexRef.current = 0;
    setCurrentTime(0); setDuration(0);
    setIsExpanded(false);
    ["bggbrowser_music_gameId","bggbrowser_music_gameName","bggbrowser_music_gameImage",
      "bggbrowser_music_songs","bggbrowser_music_index","bggbrowser_music_position"].forEach(k => localStorage.removeItem(k));
    broadcastStatus();
  }, [broadcastStatus]);

  const handleVolumeChange = useCallback((v: number) => {
    resetInactivityTimer();
    setVolume(v); volumeRef.current = v;
    localStorage.setItem("bggbrowser_music_volume", String(v));
    const player = ytPlayerRef.current;
    if (player && typeof player.setVolume === "function") {
      player.setVolume(isMutedRef.current ? 0 : v);
    }
  }, [resetInactivityTimer]);

  const handleToggleMute = useCallback(() => {
    resetInactivityTimer();
    const nextMute = !isMutedRef.current;
    setIsMuted(nextMute); isMutedRef.current = nextMute;
    localStorage.setItem("bggbrowser_music_muted", String(nextMute));
    const player = ytPlayerRef.current;
    if (player && typeof player.setVolume === "function") {
      player.setVolume(nextMute ? 0 : volumeRef.current);
    }
  }, [resetInactivityTimer]);

  const handleProgressBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    resetInactivityTimer();
    const player = ytPlayerRef.current;
    if (!player || typeof player.seekTo !== "function" || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const seekTime = pct * duration;
    player.seekTo(seekTime, true);
    setCurrentTime(seekTime);
  }, [duration, resetInactivityTimer]);

  // ---------- Play a game's music (called via window event) ----------
  const handlePlayGameMusic = useCallback(async (
    targetGameId: string,
    targetGameName: string,
    targetGameImage?: string | null,
    startIndex = 0
  ) => {
    resetInactivityTimer();
    const finalImage = targetGameImage || null;

    // Same game already loaded?
    if (gameIdRef.current === targetGameId && songsRef.current.length > 0) {
      if (currentIndexRef.current === startIndex) {
        handleTogglePlay();
      } else {
        const sgs = songsRef.current;
        const safeIdx = startIndex < sgs.length ? startIndex : 0;
        currentIndexRef.current = safeIdx;
        setCurrentIndex(safeIdx);
        setCurrentTime(0);
        localStorage.setItem("bggbrowser_music_index", String(safeIdx));
        localStorage.setItem("bggbrowser_music_position", "0");
        broadcastStatus();
        createYtPlayer(sgs[safeIdx].eid, true);
      }
      return;
    }

    // New game — reset and fetch
    setGameId(targetGameId); gameIdRef.current = targetGameId;
    setGameName(targetGameName); gameNameRef.current = targetGameName;
    setGameImage(finalImage);
    setSongs([]); songsRef.current = [];
    setCurrentIndex(startIndex); currentIndexRef.current = startIndex;
    setCurrentTime(0); setDuration(0);
    setIsPlaying(false); isPlayingRef.current = false;
    setIsExpanded(true);
    updateDominantColor(finalImage);

    localStorage.setItem("bggbrowser_music_gameId", targetGameId);
    localStorage.setItem("bggbrowser_music_gameName", targetGameName);
    localStorage.setItem("bggbrowser_music_gameImage", finalImage || "");
    localStorage.setItem("bggbrowser_music_index", String(startIndex));
    localStorage.setItem("bggbrowser_music_position", "0");

    try {
      const res = await fetch(`/api/collection/game/details/music?id=${targetGameId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PlaylistData = await res.json();
      const newSongs = data.songs || [];
      if (newSongs.length > 0) {
        setSongs(newSongs); songsRef.current = newSongs;
        localStorage.setItem("bggbrowser_music_songs", JSON.stringify(newSongs));
        const safeIdx = startIndex < newSongs.length ? startIndex : 0;
        currentIndexRef.current = safeIdx;
        setCurrentIndex(safeIdx);
        broadcastStatus();
        createYtPlayer(newSongs[safeIdx].eid, true);
      } else {
        console.warn("[GlobalMusicPlayer] No songs found for game:", targetGameId);
      }
    } catch (err) {
      console.error("[GlobalMusicPlayer] Error loading playlist:", err);
    }
  }, [createYtPlayer, handleTogglePlay, broadcastStatus, updateDominantColor, resetInactivityTimer]);

  // ---------- Window event listeners (stable refs, no deps) ----------
  useEffect(() => {
    const onPlayEvent = (evt: Event) => {
      const e = evt as CustomEvent<{ gameId: string; gameName: string; gameImage?: string; startIndex?: number }>;
      handlePlayGameMusic(e.detail.gameId, e.detail.gameName, e.detail.gameImage, e.detail.startIndex ?? 0);
    };
    const onToggle = () => handleTogglePlay();
    const onNext = () => handleNext();
    const onPrev = () => handlePrev();
    const onSelect = (evt: Event) => {
      const e = evt as CustomEvent<{ index: number }>;
      const idx = e.detail.index;
      const sgs = songsRef.current;
      if (!sgs[idx]) return;
      currentIndexRef.current = idx;
      setCurrentIndex(idx);
      setCurrentTime(0);
      localStorage.setItem("bggbrowser_music_index", String(idx));
      localStorage.setItem("bggbrowser_music_position", "0");
      broadcastStatus();
      createYtPlayer(sgs[idx].eid, true);
    };
    const onRequestStatus = () => broadcastStatus();

    window.addEventListener("play-game-music", onPlayEvent);
    window.addEventListener("toggle-play-music", onToggle);
    window.addEventListener("next-track-music", onNext);
    window.addEventListener("prev-track-music", onPrev);
    window.addEventListener("select-track-music", onSelect);
    window.addEventListener("request-music-player-status", onRequestStatus);

    return () => {
      window.removeEventListener("play-game-music", onPlayEvent);
      window.removeEventListener("toggle-play-music", onToggle);
      window.removeEventListener("next-track-music", onNext);
      window.removeEventListener("prev-track-music", onPrev);
      window.removeEventListener("select-track-music", onSelect);
      window.removeEventListener("request-music-player-status", onRequestStatus);
    };
  // All handlers are stable (useCallback with stable deps or ref-based)
  }, [handlePlayGameMusic, handleTogglePlay, handleNext, handlePrev, broadcastStatus, createYtPlayer]);

  // ---------- Keyboard support ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest?.("#global-music-container")) return;
      if (e.key === " ") { e.preventDefault(); handleTogglePlay(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); handleNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleTogglePlay, handleNext, handlePrev]);

  // ---------- Helpers ----------
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Don't render if no game
  if (!gameId) return <div ref={playerContainerRef} className="hidden" />;

  const activeSong = songs[currentIndex];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <style>{`
        @keyframes eqB1 { 0%,100%{height:3px} 50%{height:13px} }
        @keyframes eqB2 { 0%,100%{height:5px} 50%{height:17px} }
        @keyframes eqB3 { 0%,100%{height:2px} 50%{height:11px} }
        .animate-eq-b1 { animation: eqB1 0.7s ease-in-out infinite; }
        .animate-eq-b2 { animation: eqB2 0.6s ease-in-out infinite 0.1s; }
        .animate-eq-b3 { animation: eqB3 0.8s ease-in-out infinite 0.2s; }
        @keyframes marquee-text {
          0% { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-50%,0,0); }
        }
        .marquee-scroll { display:inline-block; white-space:nowrap; animation: marquee-text 16s linear infinite; }
      `}</style>

      {/* Hidden YouTube Iframe Hook */}
      <div ref={playerContainerRef} className="hidden" />

      {/* Floating Player */}
      <div
        id="global-music-container"
        onMouseEnter={() => { setIsExpanded(true); resetInactivityTimer(); }}
        onMouseMove={resetInactivityTimer}
        className="fixed bottom-6 right-6 z-40 select-none font-sans pointer-events-auto outline-none focus-within:ring-2 focus-within:ring-primary/40 rounded-[20px]"
        tabIndex={0}
        aria-label={`Reproductor de música: ${gameName || ""}`}
      >
        {/* Halo Glow */}
        <div
          className="absolute -inset-8 -z-10 rounded-[36px] opacity-[0.32] filter blur-[32px] pointer-events-none transition-all duration-[1000ms]"
          style={{ backgroundColor: dominantColor }}
        />

        <div
          className={`relative bg-[#161616]/85 backdrop-blur-xl border border-zinc-800/60 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-[350ms] ease-[cubic-bezier(.22,.61,.36,1)] overflow-hidden flex flex-col justify-between ${
            isExpanded ? "w-[340px] h-[96px] p-3" : "w-[220px] h-[52px] p-2"
          } max-w-[calc(100vw-32px)]`}
        >
          {isExpanded ? (
            /* ===== EXPANDED ===== */
            <div className="flex flex-col justify-between h-full w-full">
              {/* Row 1: Cover + Info + Controls */}
              <div className="flex items-center gap-3 w-full min-w-0">
                {/* Cover art */}
                <div className="relative w-14 h-14 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden shadow-inner">
                  {gameImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={gameImage} alt={gameName || "Album cover"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-950">
                      <Music size={20} />
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="w-full overflow-hidden whitespace-nowrap">
                    <div className={(activeSong?.title || "").length > 28 ? "marquee-scroll inline-block pr-10" : "truncate"}>
                      <span className="text-[12px] font-bold text-zinc-100">
                        {activeSong?.title || "Cargando..."}
                      </span>
                      {(activeSong?.title || "").length > 28 && (
                        <span className="text-[12px] font-bold text-zinc-100 ml-10">{activeSong?.title}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">{gameName}</span>
                </div>

                {/* Playback buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={songs.length <= 1}
                    className="p-1.5 rounded-full hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-100 disabled:opacity-35 transition-all active:scale-90 cursor-pointer"
                    aria-label="Canción anterior"
                  >
                    <SkipBack size={14} className="fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="p-2.5 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 shadow-md transition-all active:scale-90 cursor-pointer flex items-center justify-center w-8 h-8"
                    aria-label={isPlaying ? "Pausar música" : "Reproducir música"}
                  >
                    {isPlaying
                      ? <Pause size={14} className="fill-current stroke-[2.5]" />
                      : <Play size={14} className="fill-current stroke-[2.5] translate-x-[0.5px]" />
                    }
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={songs.length <= 1}
                    className="p-1.5 rounded-full hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-100 disabled:opacity-35 transition-all active:scale-90 cursor-pointer"
                    aria-label="Siguiente canción"
                  >
                    <SkipForward size={14} className="fill-current" />
                  </button>
                </div>
              </div>

              {/* Row 2: Progress + Volume */}
              <div className="flex items-center gap-2.5 w-full pt-1.5">
                <span className="text-[8.5px] font-mono text-zinc-500 font-bold shrink-0 min-w-[24px]">
                  {formatTime(currentTime)}
                </span>

                <div
                  onClick={handleProgressBarClick}
                  className="flex-1 h-1 bg-zinc-800/85 hover:bg-zinc-700/80 rounded-full relative cursor-pointer group/progress transition-colors duration-200"
                  title="Avanzar/Retroceder"
                >
                  <div
                    className="bg-zinc-100 h-full rounded-full transition-all duration-75 relative"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform duration-150 shadow-md border border-zinc-950/20" />
                  </div>
                </div>

                <span className="text-[8.5px] font-mono text-zinc-500 font-bold shrink-0 min-w-[24px] text-right">
                  {formatTime(duration)}
                </span>

                <span className="w-px h-3 bg-zinc-800 shrink-0" />

                <div className="flex items-center gap-1.5 shrink-0 max-w-[80px]">
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    title={isMuted ? "Quitar silencio" : "Silenciar"}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-12 h-[3px] bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200"
                    title="Volumen"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleStop}
                  className="p-1 rounded-md hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer shrink-0 ml-0.5"
                  title="Cerrar reproductor"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            /* ===== MINIMIZED ===== */
            <div className="flex items-center justify-between w-full h-full gap-2 px-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="relative w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800/80 shrink-0 overflow-hidden">
                  {gameImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={gameImage} alt={gameName || "Cover"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-950">
                      <Music size={12} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[11.5px] font-bold text-zinc-100 truncate leading-none">
                    {activeSong?.title || "Cargando..."}
                  </h4>
                  <p className="text-[9px] text-zinc-400 truncate leading-none mt-1 font-medium">{gameName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isPlaying && (
                  <div className="flex items-end gap-[1.5px] h-4 w-5 px-0.5 select-none pointer-events-none justify-center">
                    <span className="w-[1.8px] bg-primary rounded-full animate-eq-b1" />
                    <span className="w-[1.8px] bg-primary rounded-full animate-eq-b2" />
                    <span className="w-[1.8px] bg-primary rounded-full animate-eq-b3" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleTogglePlay(); }}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  aria-label={isPlaying ? "Pausar" : "Reproducir"}
                >
                  {isPlaying
                    ? <Pause size={13} className="fill-current" />
                    : <Play size={13} className="fill-current translate-x-[0.5px]" />
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
