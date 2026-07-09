"use client";

import { useEffect, useState, useCallback } from "react";
import { Video, RefreshCw, AlertCircle, Play } from "lucide-react";
import { ReviewVideo } from "@/app/api/collection/game/details/review-video/route";

interface ReviewVideosWidgetProps {
  gameId: string;
}

export default function ReviewVideosWidget({ gameId }: ReviewVideosWidgetProps) {
  const [videos, setVideos] = useState<ReviewVideo[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/collection/game/details/review-video?id=${gameId}${isRefresh ? "&refresh=true" : ""}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar las reseñas en vídeo.");
      }
      const data = await res.json();
      if (data.videos) {
        setVideos(data.videos);
        setActiveVideoId(null);
      } else {
        setVideos([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-5 shadow-premium animate-pulse space-y-4">
        <div className="h-4.5 w-1/3 bg-muted rounded mb-2" />
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[160px] w-[160px] space-y-2">
              <div className="aspect-video bg-muted rounded-xl" />
              <div className="h-3 bg-muted rounded w-5/6" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-5 text-center text-xs text-red-500 flex flex-col items-center gap-2">
        <AlertCircle size={20} />
        <p>{error}</p>
        <button
          onClick={() => fetchVideos()}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 font-bold hover:bg-red-500/20 transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5 shadow-premium text-center py-8 text-xs text-muted-foreground">
        No se han encontrado videotutoriales ni reseñas para este juego.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3.5">
        <div className="flex items-center gap-2">
          <Video size={16} className="text-red-500" />
          <h3 className="font-heading text-sm font-bold text-foreground">
            Videotutoriales y Reseñas
          </h3>
        </div>
        <button
          onClick={() => fetchVideos(true)}
          disabled={refreshing}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-50"
          title="Actualizar Videos"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Embedded Video Player (if active) */}
      {activeVideoId && (
        <div className="aspect-video w-full rounded-2xl overflow-hidden border bg-black shadow-inner animate-in fade-in duration-300">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
            title="Embedded YouTube Video Review"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="border-0"
          />
        </div>
      )}

      {/* Horizontal Carousel List */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
        {videos.map((vid) => {
          const isActive = vid.id === activeVideoId;
          const thumbUrl = `https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`;

          return (
            <div
              key={vid.id}
              onClick={() => setActiveVideoId(isActive ? null : vid.id)}
              className="min-w-[160px] w-[160px] flex flex-col gap-2 cursor-pointer group shrink-0"
            >
              {/* Thumbnail Container */}
              <div className={`relative aspect-video w-full rounded-xl overflow-hidden bg-muted border transition-all ${
                isActive ? "border-primary ring-2 ring-primary/20 scale-98" : "group-hover:border-foreground/45"
              }`}>
                <img
                  src={thumbUrl}
                  alt={vid.title}
                  className="object-cover h-full w-full group-hover:scale-102 transition-transform duration-500"
                />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="rounded-full bg-white/90 p-2 shadow-md">
                    <Play size={12} className="text-black fill-black" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <span className={`text-[10px] font-semibold leading-tight line-clamp-2 transition-colors ${
                isActive ? "text-primary font-black" : "text-foreground group-hover:text-primary"
              }`}>
                {vid.title}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}
