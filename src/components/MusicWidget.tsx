"use client";

import { useEffect, useState, useCallback } from "react";
import { Music, RefreshCw, AlertCircle, Play, Pause, ChevronRight, ChevronLeft } from "lucide-react";
import { Song } from "@/app/api/collection/game/details/music/route";

interface MusicWidgetProps {
  gameId: string;
}

export default function MusicWidget({ gameId }: MusicWidgetProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
        setCurrentIndex(0);
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

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-4 animate-pulse space-y-3">
        <div className="h-4 w-1/3 bg-muted rounded" />
        <div className="h-24 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-4 text-center text-xs text-red-500 flex flex-col items-center gap-2">
        <AlertCircle size={16} />
        <p>{error}</p>
        <button
          onClick={() => fetchMusic()}
          className="mt-1 rounded-md bg-red-500/10 px-2.5 py-1 hover:bg-red-500/20 transition-all font-bold"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (songs.length === 0) {
    return null; // Don't render anything if no music found
  }

  const activeSong = songs[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % songs.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + songs.length) % songs.length);
    setIsPlaying(true);
  };

  return (
    <div className="rounded-2xl border bg-card p-4 flex flex-col gap-3.5 relative overflow-hidden shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-1.5">
          <Music size={14} className="text-primary animate-pulse" />
          <h3 className="font-heading text-xs font-bold text-foreground">
            Banda Sonora Temática
          </h3>
        </div>
        <button
          onClick={() => fetchMusic(true)}
          disabled={refreshing}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-50"
          title="Actualizar Banda Sonora"
        >
          <RefreshCw size={10} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Main Player Row */}
      <div className="flex items-center gap-3">
        {/* Vinyl Record Visual */}
        <div className="relative shrink-0 w-12 h-12 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg">
          {/* Vinyl center circle */}
          <div className="w-4 h-4 rounded-full bg-primary/80 border border-zinc-900 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-zinc-950" />
          </div>
          {/* Audio lines */}
          <div className="absolute inset-1 rounded-full border border-zinc-800/40" />
          <div className="absolute inset-2.5 rounded-full border border-zinc-800/30" />
          {/* Playing overlay */}
          <div className={`absolute inset-0 rounded-full border-2 border-primary/25 ${isPlaying ? "animate-spin [animation-duration:4s]" : ""}`} />
        </div>

        {/* Song Info & Controller */}
        <div className="flex-grow min-w-0">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
            Reproduciendo {currentIndex + 1} de {songs.length}
          </p>
          <h4 className="font-semibold text-xs text-foreground truncate leading-tight">
            {activeSong.title}
          </h4>
          
          {/* Simple controls */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handlePrev}
              disabled={songs.length <= 1}
              className="p-1 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-all disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-all"
            >
              {isPlaying ? <Pause size={12} className="fill-primary" /> : <Play size={12} className="fill-primary" />}
            </button>
            <button
              onClick={handleNext}
              disabled={songs.length <= 1}
              className="p-1 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-all disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden/Tiny YouTube Iframe Player for actual audio */}
      {isPlaying && (
        <div className="h-0 w-0 opacity-0 overflow-hidden absolute">
          <iframe
            width="100"
            height="100"
            src={`https://www.youtube.com/embed/${activeSong.eid}?autoplay=1&enablejsapi=1`}
            title="Ambient Soundtrack"
            allow="autoplay; encrypted-media"
          />
        </div>
      )}

      {/* Compact Playlist list (only top 3) */}
      {songs.length > 1 && (
        <div className="border-t border-dashed pt-2.5 space-y-1 text-[10px] text-muted-foreground max-h-[75px] overflow-y-auto scrollbar-none">
          {songs.slice(0, 3).map((song, idx) => (
            <div
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setIsPlaying(true);
              }}
              className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded cursor-pointer transition-all ${
                idx === currentIndex
                  ? "bg-primary/5 font-bold text-primary"
                  : "hover:bg-secondary/40 hover:text-foreground"
              }`}
            >
              <span className="shrink-0 w-3 text-center">{idx + 1}</span>
              <span className="truncate flex-grow">{song.title}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
