

"use client";

import { useEffect, useState, useCallback } from "react";
import { Music, RefreshCw, AlertCircle, Play, Pause, ChevronRight, ChevronLeft } from "lucide-react";
import { Song } from "@/app/api/collection/game/details/music/route";

interface MusicWidgetProps {
  gameId: string;
  gameName: string;
  gameImage?: string;
}

export default function MusicWidget({ gameId, gameName, gameImage }: MusicWidgetProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Global player state mirrored locally
  const [globalGameId, setGlobalGameId] = useState<string | null>(null);
  const [globalCurrentIndex, setGlobalCurrentIndex] = useState(0);
  const [globalIsPlaying, setGlobalIsPlaying] = useState(false);

  const fetchMusic = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/collection/game/details/music?id=${gameId}${isRefresh ? "&refresh=true" : ""}`);
      if (!res.ok) {
        throw new Error("No se pudo cargar la banda sonora.");
      }
      const data = await res.json();
      if (data.songs && data.songs.length > 0) {
        setSongs(data.songs);
      } else {
        setSongs([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchMusic();
  }, [fetchMusic]);

  // Handle listening for global player status
  useEffect(() => {
    const handleStatusUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{
        gameId: string | null;
        gameName: string | null;
        currentIndex: number;
        isPlaying: boolean;
        songs: Song[];
      }>;
      const { gameId: activeId, currentIndex, isPlaying } = customEvent.detail;
      setGlobalGameId(activeId);
      setGlobalCurrentIndex(currentIndex);
      setGlobalIsPlaying(isPlaying);
    };

    window.addEventListener("music-player-status", handleStatusUpdate);
    
    // Request initial status on mount
    window.dispatchEvent(new CustomEvent("request-music-player-status"));

    return () => {
      window.removeEventListener("music-player-status", handleStatusUpdate);
    };
  }, []);

  const isCurrentGameActive = globalGameId === gameId;

  const handlePlaySong = (index: number) => {
    if (isCurrentGameActive) {
      if (globalCurrentIndex === index) {
        // Toggle play/pause
        window.dispatchEvent(new CustomEvent("toggle-play-music"));
      } else {
        // Change track index
        window.dispatchEvent(new CustomEvent("select-track-music", { detail: { index } }));
      }
    } else {
      // Start playing this game globally
      window.dispatchEvent(new CustomEvent("play-game-music", {
        detail: {
          gameId,
          gameName,
          gameImage,
          startIndex: index
        }
      }));
    }
  };

  const handleTogglePlay = () => {
    if (isCurrentGameActive) {
      window.dispatchEvent(new CustomEvent("toggle-play-music"));
    } else {
      window.dispatchEvent(new CustomEvent("play-game-music", {
        detail: {
          gameId,
          gameName,
          gameImage,
          startIndex: 0
        }
      }));
    }
  };

  const handleNext = () => {
    if (isCurrentGameActive) {
      window.dispatchEvent(new CustomEvent("next-track-music"));
    }
  };

  const handlePrev = () => {
    if (isCurrentGameActive) {
      window.dispatchEvent(new CustomEvent("prev-track-music"));
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-5 animate-pulse space-y-4 shadow-premium">
        <div className="h-4 w-1/3 bg-muted rounded" />
        <div className="h-20 bg-muted rounded-xl" />
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-5 text-center text-xs text-red-500 flex flex-col items-center gap-2.5 shadow-premium">
        <AlertCircle size={18} />
        <p>{error}</p>
        <button
          onClick={() => fetchMusic()}
          className="mt-1 rounded-xl bg-red-500/10 px-3.5 py-2 hover:bg-red-500/20 transition-all font-bold cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (songs.length === 0) {
    return null; // Don't render anything if no music found
  }

  const activeTrackTitle = isCurrentGameActive && songs[globalCurrentIndex]
    ? songs[globalCurrentIndex].title
    : songs[0]?.title;

  return (
    <div className="rounded-2xl border bg-card p-5 flex flex-col gap-4 relative overflow-hidden shadow-premium animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Music
            size={16}
            className={`text-primary ${isCurrentGameActive && globalIsPlaying ? "animate-pulse" : ""}`}
          />
          <h3 className="font-heading text-sm font-bold text-foreground">
            Banda Sonora Temática
          </h3>
        </div>
        
        <button
          onClick={() => fetchMusic(true)}
          disabled={refreshing}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-50 cursor-pointer"
          title="Actualizar Banda Sonora"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Main Player Row */}
      <div className="flex items-center gap-4 bg-muted/10 border rounded-2xl p-3 shadow-inner">
        {/* Vinyl Record Visual */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className="relative shrink-0 w-14 h-14 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg transition-transform hover:scale-[1.03] cursor-pointer"
          title={isCurrentGameActive && globalIsPlaying ? "Pausar" : "Reproducir"}
        >
          {/* Vinyl center circle */}
          <div className="w-4.5 h-4.5 rounded-full bg-primary/90 border border-zinc-900 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
          </div>
          {/* Audio lines */}
          <div className="absolute inset-1 rounded-full border border-zinc-850/40" />
          <div className="absolute inset-3 rounded-full border border-zinc-850/30" />
          {/* Playing overlay */}
          <div
            className={`absolute inset-0 rounded-full border-2 border-primary/20 ${
              isCurrentGameActive && globalIsPlaying ? "animate-spin [animation-duration:4s]" : ""
            }`}
          />
        </button>

        {/* Song Info & Controller */}
        <div className="flex-grow min-w-0">
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider leading-none mb-1">
            {isCurrentGameActive
              ? `Reproduciendo ${globalCurrentIndex + 1} de ${songs.length}`
              : `Banda sonora (${songs.length} temas)`}
          </p>
          <h4 className="font-semibold text-xs text-foreground truncate leading-tight" title={activeTrackTitle}>
            {activeTrackTitle}
          </h4>
          
          {/* Controls */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handlePrev}
              disabled={!isCurrentGameActive || songs.length <= 1}
              className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Tema anterior"
            >
              <ChevronLeft size={16} />
            </button>
            
            <button
              onClick={handleTogglePlay}
              className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-all cursor-pointer shadow-sm"
              title={isCurrentGameActive && globalIsPlaying ? "Pausar" : "Reproducir"}
            >
              {isCurrentGameActive && globalIsPlaying ? (
                <Pause size={14} className="fill-primary" />
              ) : (
                <Play size={14} className="fill-primary translate-x-[0.5px]" />
              )}
            </button>
            
            <button
              onClick={handleNext}
              disabled={!isCurrentGameActive || songs.length <= 1}
              className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Siguiente tema"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Playlist Tracks List */}
      <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1 border-t pt-3">
        {songs.map((song, idx) => {
          const isActive = isCurrentGameActive && idx === globalCurrentIndex;
          const isSongPlaying = isActive && globalIsPlaying;

          return (
            <div
              key={idx}
              onClick={() => handlePlaySong(idx)}
              className={`flex items-center justify-between gap-3 py-2 px-3 rounded-xl border cursor-pointer transition-all text-[11px] ${
                isActive
                  ? "bg-primary/5 border-primary/25 text-primary font-bold shadow-sm"
                  : "bg-muted/10 hover:bg-muted/30 hover:text-foreground border-transparent text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="shrink-0 w-4 text-center text-[10px] font-mono opacity-60">
                  {idx + 1}
                </span>
                <span className="truncate" title={song.title}>
                  {song.title}
                </span>
              </div>
              
              <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-lg hover:bg-muted transition-colors">
                {isSongPlaying ? (
                  // Animated Equalizer Visual
                  <div className="flex items-end gap-0.5 h-2.5">
                    <span className="w-0.5 bg-primary rounded-full animate-bounce [animation-duration:0.6s]" />
                    <span className="w-0.5 bg-primary rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.1s]" />
                    <span className="w-0.5 bg-primary rounded-full animate-bounce [animation-duration:0.7s] [animation-delay:0.2s]" />
                  </div>
                ) : (
                  <Play size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
