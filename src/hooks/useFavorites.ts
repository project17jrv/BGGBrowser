"use client";

import { useState, useEffect } from "react";

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadFavorites = () => {
    const stored = localStorage.getItem("bgg-favorites");
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse favorites from localStorage:", e);
      }
    } else {
      setFavorites([]);
    }
    setIsLoaded(true);
  };

  useEffect(() => {
    loadFavorites();

    const handleChanged = () => {
      loadFavorites();
    };

    window.addEventListener("favorites-changed", handleChanged);
    return () => window.removeEventListener("favorites-changed", handleChanged);
  }, []);

  const toggleFavorite = (bggId: number) => {
    setFavorites((prev) => {
      const next = prev.includes(bggId)
        ? prev.filter((id) => id !== bggId)
        : [...prev, bggId];
      localStorage.setItem("bgg-favorites", JSON.stringify(next));
      // Dispatch custom event to notify other components (e.g. catalog filter updates)
      window.dispatchEvent(new Event("favorites-changed"));
      return next;
    });
  };

  const isFavorite = (bggId: number) => favorites.includes(bggId);

  return { favorites, toggleFavorite, isFavorite, isLoaded };
}
