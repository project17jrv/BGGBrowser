"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { Star, Award, Users, Clock, Flame, Heart, Bell } from "lucide-react";
import { toggleGameInteresting } from "@/lib/actions";

interface GameCardProps {
  game: {
    id: string;
    bggId: number;
    name: string;
    yearPublished: number | null;
    imageUrl: string | null;
    thumbnailUrl: string | null;
    rank: number | null;
    averageRating: number | null;
    minPlayers: number | null;
    maxPlayers: number | null;
    minPlayTime: number | null;
    maxPlayTime: number | null;
    complexityWeight: number | null;
    bestPlayers: string | null;
    owned?: boolean;
    isExpansion?: boolean;
    isInteresting?: boolean;
    spanishName?: string | null;
    status?: string;
  };
}

export default function GameCard({ game }: GameCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [interesting, setInteresting] = useState(game.isInteresting || false);

  useEffect(() => {
    setInteresting(game.isInteresting || false);
  }, [game.isInteresting]);

  const handleToggleInteresting = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const nextVal = !interesting;
    setInteresting(nextVal);
    
    try {
      const res = await toggleGameInteresting(game.bggId, nextVal);
      if (!res.success) {
        setInteresting(!nextVal);
        alert("Error al cambiar estado de seguimiento");
      }
    } catch {
      setInteresting(!nextVal);
      alert("Error de conexión al cambiar estado");
    }
  };

  const [imgSrc, setImgSrc] = useState(game.imageUrl || "/images/placeholder.svg");
  const fav = isFavorite(game.bggId);

  // Format player count text
  const playersText = 
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers} jug.`
      : `${game.minPlayers}-${game.maxPlayers} jug.`;

  // Format playtime text
  const playtimeText = 
    game.minPlayTime === game.maxPlayTime
      ? `${game.minPlayTime} min`
      : `${game.minPlayTime}-${game.maxPlayTime} min`;

  return (
    <div className="group relative flex flex-col rounded-2xl border bg-card text-card-foreground shadow-premium transition-all duration-300 ease-out-back hover:-translate-y-1.5 hover:shadow-premium-hover dark:hover:shadow-premium-dark-hover hover:border-primary/30 overflow-hidden">
      
      {/* Cover Image Container */}
      <Link href={`/game/${game.id}`} className="relative block aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={imgSrc}
          alt={game.spanishName || game.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          onError={() => setImgSrc("/images/placeholder.svg")} // fallback on error
          loading="lazy"
        />
        {/* Rating Overlay Tag */}
        {game.averageRating && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-0.5 text-[10px] font-bold text-foreground shadow-sm backdrop-blur-sm border">
            <Star size={11} className="fill-amber-500 text-amber-500" />
            <span>{game.averageRating.toFixed(1)}</span>
          </div>
        )}
        {/* Owned/Collection Tag Overlay */}
        {game.owned && (
          <div className="absolute left-3 bottom-3 flex items-center gap-1 rounded-full bg-emerald-500/90 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm backdrop-blur-sm border border-emerald-600/30">
            <span>En colección</span>
          </div>
        )}
        {/* Wishlist Tag Overlay */}
        {game.status === "wishlist" && (
          <div className="absolute left-3 bottom-3 flex items-center gap-1 rounded-full bg-yellow-500/95 text-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm backdrop-blur-sm border border-yellow-600/30">
            <span>EN WISHLIST</span>
          </div>
        )}
        {/* Seguido/Tracking Flag Badge */}
        {interesting && (
          <div className={`absolute left-3 flex items-center gap-1 rounded-full bg-purple-500/90 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm backdrop-blur-sm border border-purple-600/30 ${game.rank ? "top-10" : "top-3"}`}>
            <span>👁️ Siguiendo</span>
          </div>
        )}
      </Link>

      {/* Favorite Toggle Button */}
      <button
        onClick={() => toggleFavorite(game.bggId)}
        aria-label="Toggle Favorite"
        className="absolute right-3 top-3 z-10 flex h-7.5 w-7.5 items-center justify-center rounded-full bg-background/90 text-foreground border shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
      >
        <Heart
          size={14}
          className={`transition-colors duration-300 ${
            fav ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-500"
          }`}
        />
      </button>

      {/* Interesting (Siguiendo) Toggle Button */}
      <button
        onClick={handleToggleInteresting}
        aria-label="Toggle Following Status"
        className={`absolute right-[45px] top-3 z-10 flex h-7.5 w-7.5 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
          interesting
            ? "bg-purple-600 border-purple-600 text-white shadow-premium"
            : "bg-background/90 text-muted-foreground hover:text-purple-600 hover:border-purple-200"
        }`}
        title={interesting ? "Siguiendo (Haga clic para dejar de seguir)" : "No seguido (Haga clic para seguir precios)"}
      >
        <Bell
          size={13}
          className={`transition-colors duration-300 ${interesting ? "fill-white text-white" : ""}`}
        />
      </button>

      {/* Card Details Content */}
      <div className="flex flex-1 flex-col p-4">
        
        {/* Title & Year */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <Link href={`/game/${game.id}`} className="group-hover:text-primary transition-colors duration-200">
            <h3 className="font-heading text-sm font-bold leading-tight line-clamp-1">
              {game.spanishName || game.name}
            </h3>
          </Link>
          <div className="text-right shrink-0 mt-0.5">
            {game.yearPublished && (
              <span className="text-[10px] font-medium text-muted-foreground block">
                {game.yearPublished}
              </span>
            )}
            <span className="text-[9px] font-bold text-muted-foreground/75 block">
              ID: {game.bggId}
            </span>
            {game.isExpansion && (
              <span className="text-[8px] font-black uppercase text-amber-500 block tracking-wider mt-0.5">
                Expansión
              </span>
            )}
          </div>
        </div>

        {/* Quick Grid Statistics */}
        <div className="mt-auto grid grid-cols-2 gap-x-2 gap-y-1.5 border-t pt-3 text-[11px] text-muted-foreground">
          
          {/* BGG Rank */}
          <div className="flex items-center gap-1.5">
            <Award size={13} className="text-indigo-400" />
            <span className="font-medium text-foreground">
              Rank: #{game.rank || "N/A"}
            </span>
          </div>

          {/* Complexity / Weight */}
          <div className="flex items-center gap-1.5">
            <Flame size={13} className="text-purple-400" />
            <span className="font-medium text-foreground">
              Peso: {game.complexityWeight ? game.complexityWeight.toFixed(2) : "N/A"}
            </span>
          </div>

          {/* Players */}
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-sky-400" />
            <div className="flex flex-col gap-1">
              <span>{playersText}</span>
              {game.bestPlayers && (
                <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-500 border border-emerald-500/20 w-fit leading-none">
                  Mejor: {game.bestPlayers}
                </span>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-pink-400" />
            <span>{playtimeText}</span>
          </div>

        </div>

      </div>

    </div>
  );
}
