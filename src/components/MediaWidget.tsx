"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { 
  Film, Image as ImageIcon, Play, ChevronLeft, 
  ChevronRight, RefreshCw, AlertCircle
} from "lucide-react";

interface MediaWidgetProps {
  bggId: number;
  gameName: string;
}

interface BggImage {
  id: string;
  url: string;
  caption: string;
}

interface YouTubeVideo {
  id: string;
  title: string;
}

export default function MediaWidget({ bggId, gameName }: MediaWidgetProps) {
  // Image Carousel States
  const [images, setImages] = useState<BggImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // YouTube Videos States
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"reseñas" | "partidas" | "unboxing">("reseñas");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // Fetch images from BGG gallery
  useEffect(() => {
    async function fetchImages() {
      setLoadingImages(true);
      setImagesError(null);
      try {
        const res = await fetch(`/api/collection/game/details/bgg-images?bggId=${bggId}`);
        if (!res.ok) throw new Error("No se pudieron cargar las imágenes de BGG.");
        const data = await res.json();
        setImages(data.images || []);
      } catch (err) {
        setImagesError(err instanceof Error ? err.message : "Error al cargar imágenes.");
      } finally {
        setLoadingImages(false);
      }
    }
    fetchImages();
  }, [bggId]);

  // Image carousel auto-scrolling
  useEffect(() => {
    if (!isPlaying || images.length <= 1) return;
    
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, images.length]);

  // Fetch videos from YouTube proxy
  useEffect(() => {
    async function fetchVideos() {
      setLoadingVideos(true);
      setVideosError(null);
      setVideos([]);

      let query = "";
      if (activeCategory === "reseñas") {
        query = `${gameName} reseña juego de mesa`;
      } else if (activeCategory === "partidas") {
        query = `${gameName} partida gameplay juego de mesa`;
      } else if (activeCategory === "unboxing") {
        query = `${gameName} unboxing juego de mesa`;
      }

      try {
        const res = await fetch(`/api/collection/game/details/review-video?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("No se pudieron cargar los vídeos de YouTube.");
        const data = await res.json();
        setVideos(data.videos || []);
      } catch (err) {
        setVideosError(err instanceof Error ? err.message : "Error al cargar vídeos.");
      } finally {
        setLoadingVideos(false);
      }
    }
    fetchVideos();
  }, [activeCategory, gameName]);

  const handlePrevImage = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in pb-4">
      
      {/* 1. BGG IMAGE GALLERY CAROUSEL */}
      <div className="rounded-2xl border bg-card p-4.5 shadow-premium flex flex-col gap-3">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-indigo-500" />
            <h3 className="font-heading text-xs font-black uppercase tracking-wider text-foreground">
              Galería de Imágenes (BGG)
            </h3>
          </div>
          {images.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-bold">
              {activeIndex + 1} / {images.length}
            </span>
          )}
        </div>

        {loadingImages ? (
          <div className="aspect-[4/3] w-full rounded-xl border bg-muted/20 animate-pulse flex flex-col items-center justify-center gap-2">
            <RefreshCw className="animate-spin text-muted-foreground" size={20} />
            <span className="text-[10px] text-muted-foreground font-bold">Cargando galería...</span>
          </div>
        ) : imagesError ? (
          <div className="aspect-[4/3] w-full rounded-xl border border-dashed flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-2">
            <AlertCircle size={22} className="text-muted-foreground" />
            <p className="text-xs font-bold">No se pudieron cargar las imágenes</p>
            <p className="text-[10px] text-muted-foreground/80 max-w-xs">{imagesError}</p>
          </div>
        ) : images.length === 0 ? (
          <div className="aspect-[4/3] w-full rounded-xl border border-dashed flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-1.5 bg-muted/10">
            <ImageIcon size={20} className="text-muted-foreground" />
            <p className="text-xs font-bold">Galería vacía</p>
            <p className="text-[10px] text-muted-foreground">No hay fotos de la comunidad en BGG para este juego.</p>
          </div>
        ) : (
          /* Carousel Element */
          <div 
            className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border bg-black shadow-premium group"
            onMouseEnter={() => setIsPlaying(false)}
            onMouseLeave={() => setIsPlaying(true)}
          >
            {/* Carousel Active Image */}
            <div className="relative w-full h-full">
              <Image
                src={images[activeIndex].url}
                alt={images[activeIndex].caption || `BGG Image ${activeIndex + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 30vw"
                className="object-contain transition-all duration-500"
                priority
              />
            </div>

            {/* Carousel Controls: Arrows on hover */}
            <button
              onClick={handlePrevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/10 shadow transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous Image"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/10 shadow transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next Image"
            >
              <ChevronRight size={16} />
            </button>

            {/* Caption Overlay */}
            {images[activeIndex].caption && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-[10px] text-white/90 font-medium text-center line-clamp-1">
                {images[activeIndex].caption}
              </div>
            )}
          </div>
        )}

        {/* Carousel Pagination dots */}
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {images.slice(0, 15).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  activeIndex === idx ? "bg-primary w-4" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
            {images.length > 15 && (
              <span className="text-[8px] text-muted-foreground font-black self-center ml-1">
                +{images.length - 15} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. YOUTUBE VIDEO SECTION */}
      <div className="rounded-2xl border bg-card p-4.5 shadow-premium flex flex-col gap-4">
        
        {/* Header */}
        <div className="flex items-center gap-2 border-b pb-3">
          <Film size={16} className="text-red-500" />
          <h3 className="font-heading text-xs font-black uppercase tracking-wider text-foreground">
            Vídeos de YouTube
          </h3>
        </div>

        {/* Dynamic Embedded Player (if a video is active) */}
        {activeVideoId && (
          <div className="rounded-xl border bg-black overflow-hidden aspect-video w-full shadow-inner animate-fade-in relative">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="border-0"
            />
            {/* Close video player overlay */}
            <button
              onClick={() => setActiveVideoId(null)}
              className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 border border-white/10 transition-colors shadow"
              title="Cerrar Reproductor"
            >
              <ChevronLeft className="rotate-90" size={14} />
            </button>
          </div>
        )}

        {/* Video Category Navigation Pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCategory("reseñas")}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${
              activeCategory === "reseñas"
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                : "bg-muted/15 border-transparent text-muted-foreground hover:bg-muted/30"
            }`}
          >
            Reseñas
          </button>
          <button
            onClick={() => setActiveCategory("partidas")}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${
              activeCategory === "partidas"
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                : "bg-muted/15 border-transparent text-muted-foreground hover:bg-muted/30"
            }`}
          >
            Partidas
          </button>
          <button
            onClick={() => setActiveCategory("unboxing")}
            className={`rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${
              activeCategory === "unboxing"
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                : "bg-muted/15 border-transparent text-muted-foreground hover:bg-muted/30"
            }`}
          >
            Unboxing
          </button>
        </div>

        {/* Videos List Grid */}
        {loadingVideos ? (
          <div className="flex flex-col gap-3 py-6 items-center justify-center">
            <RefreshCw className="animate-spin text-red-500" size={18} />
            <span className="text-[10px] text-muted-foreground font-semibold">Buscando en YouTube...</span>
          </div>
        ) : videosError ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground flex flex-col items-center justify-center gap-1.5">
            <AlertCircle size={20} className="text-muted-foreground" />
            <p className="text-xs font-bold">Error al buscar vídeos</p>
            <p className="text-[9px] text-muted-foreground leading-normal">{videosError}</p>
          </div>
        ) : videos.length === 0 ? (
          <p className="text-center py-6 text-xs text-muted-foreground italic">
            No se encontraron vídeos.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
            {videos.map((vid) => {
              const thumbUrl = `https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`;
              const isSelected = activeVideoId === vid.id;
              return (
                <div
                  key={vid.id}
                  onClick={() => {
                    setActiveVideoId(vid.id);
                    // scroll to video player if screen is small
                    window.scrollTo({ top: 120, behavior: "smooth" });
                  }}
                  className={`flex flex-col gap-2 cursor-pointer group bg-muted/10 border rounded-xl p-2 transition-all hover:-translate-y-0.5 shadow-sm ${
                    isSelected ? "border-red-500/40 bg-red-500/5 shadow-md" : "hover:border-red-500/25"
                  }`}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black shadow-inner">
                    <Image
                      src={thumbUrl}
                      alt={vid.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="object-cover h-full w-full group-hover:scale-103 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/15 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                      <div className={`rounded-full p-1.5 shadow transition-all ${
                        isSelected ? "bg-red-500 text-white scale-105" : "bg-white/90 text-black group-hover:scale-110"
                      }`}>
                        <Play size={10} className={isSelected ? "fill-white" : "fill-black text-black"} />
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold leading-tight text-foreground line-clamp-2 group-hover:text-red-500 transition-colors">
                    {vid.title}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
