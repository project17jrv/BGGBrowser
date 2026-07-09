"use client";

import { useFavorites } from "@/hooks/useFavorites";
import { Heart } from "lucide-react";

interface DetailFavoriteButtonProps {
  bggId: number;
}

export default function DetailFavoriteButton({ bggId }: DetailFavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoaded } = useFavorites();

  if (!isLoaded) {
    return (
      <div className="h-9 w-32 animate-pulse rounded-xl bg-secondary" />
    );
  }

  const fav = isFavorite(bggId);

  return (
    <button
      onClick={() => toggleFavorite(bggId)}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ${
        fav
          ? "bg-red-500/10 border-red-500 text-red-500 font-extrabold"
          : "bg-card text-muted-foreground border hover:border-red-500/40 hover:text-red-500"
      }`}
    >
      <Heart 
        size={14} 
        className={`transition-colors duration-300 ${fav ? "fill-red-500 text-red-500" : ""}`} 
      />
      <span>{fav ? "Guardado" : "Añadir a Favoritos"}</span>
    </button>
  );
}
