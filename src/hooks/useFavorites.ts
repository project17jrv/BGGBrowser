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
    const stored = localStorage.getItem("bgg-favorites");
    let currentFavs: number[] = [];
    if (stored) {
      try {
        currentFavs = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    const next = currentFavs.includes(bggId)
      ? currentFavs.filter((id) => id !== bggId)
      : [...currentFavs, bggId];

    localStorage.setItem("bgg-favorites", JSON.stringify(next));
    setFavorites(next);

    // Defer event dispatch to the next tick to prevent triggering
    // state updates in other components during the current render phase.
    setTimeout(() => {
      window.dispatchEvent(new Event("favorites-changed"));
    }, 0);
  };

  const isFavorite = (bggId: number) => favorites.includes(bggId);

  return { favorites, toggleFavorite, isFavorite, isLoaded };
}
