"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { SlidersHorizontal, RotateCcw, Heart, Calendar, Users, Clock, Award, Star, Bell, Library } from "lucide-react";

interface FiltersProps {
  categories: string[];
  mechanics: string[];
  minYear: number;
  maxYear: number;
  maxRank: number;
  basePath?: string;
}

export default function Filters({ categories, mechanics, minYear, maxYear, maxRank, basePath }: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { favorites } = useFavorites();

  // Local state for filters to allow smooth input before URL updates
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [minRating, setMinRating] = useState(searchParams.get("minRating") || "");
  const [maxRating, setMaxRating] = useState(searchParams.get("maxRating") || "");
  const [minRankInput, setMinRankInput] = useState(searchParams.get("minRank") || "");
  const [maxRankInput, setMaxRankInput] = useState(searchParams.get("maxRank") || "");
  const [minYearInput, setMinYearInput] = useState(searchParams.get("minYear") || "");
  const [maxYearInput, setMaxYearInput] = useState(searchParams.get("maxYear") || "");
  const [players, setPlayers] = useState(searchParams.get("players") || "");
  const [bestPlayers, setBestPlayers] = useState(searchParams.get("bestPlayers") || "");
  const [minPlayTime, setMinPlayTime] = useState(searchParams.get("minPlayTime") || "");
  const [maxPlayTime, setMaxPlayTime] = useState(searchParams.get("maxPlayTime") || "");
  const [minComplexity, setMinComplexity] = useState(searchParams.get("minComplexity") || "");
  const [maxComplexity, setMaxComplexity] = useState(searchParams.get("maxComplexity") || "");
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || []
  );
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>(
    searchParams.get("mechanics")?.split(",").filter(Boolean) || []
  );
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(
    searchParams.get("favorites") === "true"
  );
  const [showInterestingOnly, setShowInterestingOnly] = useState<string>(
    searchParams.get("interestingOnly") || "all"
  );
  const [inCollectionOnly, setInCollectionOnly] = useState<string>(
    searchParams.get("inCollectionOnly") || "all"
  );
  const [showExpansions, setShowExpansions] = useState(
    searchParams.get("expansions") !== "false"
  );
  const [showOwned, setShowOwned] = useState(
    searchParams.get("showOwned") !== "false"
  );
  const [showWishlist, setShowWishlist] = useState(
    searchParams.get("showWishlist") !== "false"
  );
  const [showInteresting, setShowInteresting] = useState(
    searchParams.get("showInteresting") !== "false"
  );

  // Synchronize URL changes back to local state
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setMinRating(searchParams.get("minRating") || "");
    setMaxRating(searchParams.get("maxRating") || "");
    setMinRankInput(searchParams.get("minRank") || "");
    setMaxRankInput(searchParams.get("maxRank") || "");
    setMinYearInput(searchParams.get("minYear") || "");
    setMaxYearInput(searchParams.get("maxYear") || "");
    setPlayers(searchParams.get("players") || "");
    setBestPlayers(searchParams.get("bestPlayers") || "");
    setMinPlayTime(searchParams.get("minPlayTime") || "");
    setMaxPlayTime(searchParams.get("maxPlayTime") || "");
    setMinComplexity(searchParams.get("minComplexity") || "");
    setMaxComplexity(searchParams.get("maxComplexity") || "");
    setSelectedCategories(searchParams.get("categories")?.split(",").filter(Boolean) || []);
    setSelectedMechanics(searchParams.get("mechanics")?.split(",").filter(Boolean) || []);
    setShowFavoritesOnly(searchParams.get("favorites") === "true");
    setShowInterestingOnly(searchParams.get("interestingOnly") || "all");
    setInCollectionOnly(searchParams.get("inCollectionOnly") || "all");
    setShowExpansions(searchParams.get("expansions") !== "false");
    setShowOwned(searchParams.get("showOwned") !== "false");
    setShowWishlist(searchParams.get("showWishlist") !== "false");
    setShowInteresting(searchParams.get("showInteresting") !== "false");
  }, [searchParams]);

  // Synchronize favorites change custom event
  useEffect(() => {
    const handleFavsChanged = () => {
      // If we are currently showing favorites only, we must refresh the query
      if (showFavoritesOnly) {
        applyFilters();
      }
    };
    window.addEventListener("favorites-changed", handleFavsChanged);
    return () => window.removeEventListener("favorites-changed", handleFavsChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFavoritesOnly, favorites]);

  // Apply filters by pushing new query string
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Reset to page 1 on filter application
    params.set("page", "1");

    if (search) params.set("search", search); else params.delete("search");
    if (minRating) params.set("minRating", minRating); else params.delete("minRating");
    if (maxRating) params.set("maxRating", maxRating); else params.delete("maxRating");
    if (minRankInput) params.set("minRank", minRankInput); else params.delete("minRank");
    if (maxRankInput) params.set("maxRank", maxRankInput); else params.delete("maxRank");
    if (minYearInput) params.set("minYear", minYearInput); else params.delete("minYear");
    if (maxYearInput) params.set("maxYear", maxYearInput); else params.delete("maxYear");
    if (players) params.set("players", players); else params.delete("players");
    if (bestPlayers) params.set("bestPlayers", bestPlayers); else params.delete("bestPlayers");
    if (minPlayTime) params.set("minPlayTime", minPlayTime); else params.delete("minPlayTime");
    if (maxPlayTime) params.set("maxPlayTime", maxPlayTime); else params.delete("maxPlayTime");
    if (minComplexity) params.set("minComplexity", minComplexity); else params.delete("minComplexity");
    if (maxComplexity) params.set("maxComplexity", maxComplexity); else params.delete("maxComplexity");

    if (selectedCategories.length > 0) {
      params.set("categories", selectedCategories.join(","));
    } else {
      params.delete("categories");
    }

    if (selectedMechanics.length > 0) {
      params.set("mechanics", selectedMechanics.join(","));
    } else {
      params.delete("mechanics");
    }

    if (showFavoritesOnly) {
      params.set("favorites", "true");
      if (favorites.length > 0) {
        params.set("favIds", favorites.join(","));
      } else {
        params.set("favIds", "-1"); // force empty grid
      }
    } else {
      params.delete("favorites");
      params.delete("favIds");
    }

    if (showInterestingOnly === "true" || showInterestingOnly === "false") {
      params.set("interestingOnly", showInterestingOnly);
    } else {
      params.delete("interestingOnly");
    }

    if (inCollectionOnly === "true" || inCollectionOnly === "false") {
      params.set("inCollectionOnly", inCollectionOnly);
    } else {
      params.delete("inCollectionOnly");
    }

    if (showExpansions === false) {
      params.set("expansions", "false");
    } else {
      params.delete("expansions");
    }

    if (showOwned === false) {
      params.set("showOwned", "false");
    } else {
      params.delete("showOwned");
    }

    if (showWishlist === false) {
      params.set("showWishlist", "false");
    } else {
      params.delete("showWishlist");
    }

    if (showInteresting === false) {
      params.set("showInteresting", "false");
    } else {
      params.delete("showInteresting");
    }

    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${params.toString()}`);
  };

  // Run filter application when values change
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  // Toggle Category
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat];
      setTimeout(() => applyFiltersInternal(next, selectedMechanics, showFavoritesOnly), 50);
      return next;
    });
  };

  // Toggle Mechanic
  const toggleMechanic = (mec: string) => {
    setSelectedMechanics((prev) => {
      const next = prev.includes(mec) ? prev.filter((m) => m !== mec) : [...prev, mec];
      setTimeout(() => applyFiltersInternal(selectedCategories, next, showFavoritesOnly), 50);
      return next;
    });
  };

  // Toggle Favorites Only
  const toggleFavoritesOnly = (checked: boolean) => {
    setShowFavoritesOnly(checked);
    applyFiltersInternal(selectedCategories, selectedMechanics, checked);
  };

  // Toggle Interesting Only
  const toggleInterestingOnly = (val: string) => {
    setShowInterestingOnly(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (val === "true" || val === "false") {
      params.set("interestingOnly", val);
    } else {
      params.delete("interestingOnly");
    }
    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${params.toString()}`);
  };

  // Toggle In-Collection Only
  const toggleInCollectionOnly = (val: string) => {
    setInCollectionOnly(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (val === "true" || val === "false") {
      params.set("inCollectionOnly", val);
    } else {
      params.delete("inCollectionOnly");
    }
    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${params.toString()}`);
  };

  // Toggle Expansions
  const toggleExpansions = (checked: boolean) => {
    setShowExpansions(checked);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (checked === false) {
      params.set("expansions", "false");
    } else {
      params.delete("expansions");
    }
    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${params.toString()}`);
  };

  // Internal helper for badge triggers to prevent state lag
  const applyFiltersInternal = (cats: string[], mecs: string[], favs: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    if (search) params.set("search", search); else params.delete("search");
    if (minRating) params.set("minRating", minRating); else params.delete("minRating");
    if (maxRating) params.set("maxRating", maxRating); else params.delete("maxRating");
    if (minRankInput) params.set("minRank", minRankInput); else params.delete("minRank");
    if (maxRankInput) params.set("maxRank", maxRankInput); else params.delete("maxRank");
    if (minYearInput) params.set("minYear", minYearInput); else params.delete("minYear");
    if (maxYearInput) params.set("maxYear", maxYearInput); else params.delete("maxYear");
    if (players) params.set("players", players); else params.delete("players");
    if (bestPlayers) params.set("bestPlayers", bestPlayers); else params.delete("bestPlayers");
    if (minPlayTime) params.set("minPlayTime", minPlayTime); else params.delete("minPlayTime");
    if (maxPlayTime) params.set("maxPlayTime", maxPlayTime); else params.delete("maxPlayTime");
    if (minComplexity) params.set("minComplexity", minComplexity); else params.delete("minComplexity");
    if (maxComplexity) params.set("maxComplexity", maxComplexity); else params.delete("maxComplexity");

    if (cats.length > 0) params.set("categories", cats.join(",")); else params.delete("categories");
    if (mecs.length > 0) params.set("mechanics", mecs.join(",")); else params.delete("mechanics");

    if (favs) {
      params.set("favorites", "true");
      if (favorites.length > 0) {
        params.set("favIds", favorites.join(","));
      } else {
        params.set("favIds", "-1");
      }
    } else {
      params.delete("favorites");
      params.delete("favIds");
    }

    if (showInterestingOnly === "true" || showInterestingOnly === "false") {
      params.set("interestingOnly", showInterestingOnly);
    } else {
      params.delete("interestingOnly");
    }

    if (inCollectionOnly === "true" || inCollectionOnly === "false") {
      params.set("inCollectionOnly", inCollectionOnly);
    } else {
      params.delete("inCollectionOnly");
    }

    if (showExpansions === false) {
      params.set("expansions", "false");
    } else {
      params.delete("expansions");
    }

    if (showOwned === false) {
      params.set("showOwned", "false");
    } else {
      params.delete("showOwned");
    }

    if (showWishlist === false) {
      params.set("showWishlist", "false");
    } else {
      params.delete("showWishlist");
    }

    if (showInteresting === false) {
      params.set("showInteresting", "false");
    } else {
      params.delete("showInteresting");
    }

    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${params.toString()}`);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch("");
    setMinRating("");
    setMaxRating("");
    setMinRankInput("");
    setMaxRankInput("");
    setMinYearInput("");
    setMaxYearInput("");
    setPlayers("");
    setBestPlayers("");
    setMinPlayTime("");
    setMaxPlayTime("");
    setMinComplexity("");
    setMaxComplexity("");
    setSelectedCategories([]);
    setSelectedMechanics([]);
    setShowFavoritesOnly(false);
    setShowInterestingOnly("all");
    setShowExpansions(true);
    setShowOwned(true);
    setShowWishlist(true);
    setShowInteresting(true);

    const targetPath = basePath || pathname;
    router.push(targetPath);
  };

  const hasActiveFilters = 
    search || minRating || maxRating || minRankInput || maxRankInput ||
    minYearInput || maxYearInput || players || bestPlayers || minPlayTime || maxPlayTime ||
    minComplexity || maxComplexity || selectedCategories.length > 0 ||
    selectedMechanics.length > 0 || showFavoritesOnly || showInterestingOnly || !showExpansions ||
    !showOwned || !showWishlist || !showInteresting;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border bg-card p-5 shadow-premium transition-all duration-300">
      
      {/* Filters Title Header */}
      <div className="flex items-center justify-between border-b pb-3.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-primary stroke-[2.5]" />
          <h2 className="font-heading text-base font-bold tracking-tight text-foreground">Filtros</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            <RotateCcw size={12} />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {/* Favorites Only Switcher */}
        <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3.5 py-2.5 transition-all duration-200 hover:border-primary/30">
          <label htmlFor="favToggle" className="flex items-center gap-2 cursor-pointer select-none">
            <Heart 
              size={15} 
              className={`transition-colors duration-300 ${showFavoritesOnly ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} 
            />
            <span className="text-xs font-bold text-foreground">Solo Favoritos</span>
          </label>
          <input
            id="favToggle"
            type="checkbox"
            checked={showFavoritesOnly}
            onChange={(e) => toggleFavoritesOnly(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary accent-primary"
          />
        </div>

        {/* Interesting Only Segmented Control */}
        <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center gap-2 select-none">
            <Bell 
              size={14} 
              className={`transition-all duration-300 ${showInterestingOnly !== "all" ? "text-purple-500 animate-pulse" : "text-muted-foreground"}`} 
            />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Filtro de Seguimiento</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-muted/20 p-1 rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => toggleInterestingOnly("all")}
              className={`rounded-lg py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                showInterestingOnly === "all"
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm"
                  : "border border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => toggleInterestingOnly("true")}
              className={`rounded-lg py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                showInterestingOnly === "true"
                  ? "bg-purple-600 text-white shadow-premium border border-purple-600"
                  : "border border-transparent text-muted-foreground hover:bg-purple-500/5 hover:text-purple-600"
              }`}
            >
              Seguidos
            </button>
            <button
              type="button"
              onClick={() => toggleInterestingOnly("false")}
              className={`rounded-lg py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                showInterestingOnly === "false"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm"
                  : "border border-transparent text-muted-foreground hover:bg-amber-500/5 hover:text-amber-600"
              }`}
            >
              No seguidos
            </button>
          </div>
        </div>

        {/* In-Collection Segmented Control (Ranking page only) */}
        {basePath === "/ranking" && (
          <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center gap-2 select-none">
              <Library
                size={14}
                className={`transition-all duration-300 ${inCollectionOnly !== "all" ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`}
              />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">En Colección</span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-muted/20 p-1 rounded-xl border border-border/40">
              <button
                type="button"
                onClick={() => toggleInCollectionOnly("all")}
                className={`rounded-lg py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  inCollectionOnly === "all"
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm"
                    : "border border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => toggleInCollectionOnly("true")}
                className={`rounded-lg py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  inCollectionOnly === "true"
                    ? "bg-emerald-600 text-white shadow-premium border border-emerald-600"
                    : "border border-transparent text-muted-foreground hover:bg-emerald-500/5 hover:text-emerald-600"
                }`}
              >
                Incluido
              </button>
              <button
                type="button"
                onClick={() => toggleInCollectionOnly("false")}
                className={`rounded-lg py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  inCollectionOnly === "false"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-sm"
                    : "border border-transparent text-muted-foreground hover:bg-rose-500/5 hover:text-rose-600"
                }`}
              >
                No incluido
              </button>
            </div>
          </div>
        )}

        {/* Show Expansions Switcher */}
        <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3.5 py-2.5 transition-all duration-200 hover:border-primary/30">
          <label htmlFor="expansionsToggle" className="flex items-center gap-2 cursor-pointer select-none">
            <Award 
              size={15} 
              className={`transition-colors duration-300 ${showExpansions ? "text-amber-500" : "text-muted-foreground"}`} 
            />
            <span className="text-xs font-bold text-foreground">Mostrar Expansiones</span>
          </label>
          <input
            id="expansionsToggle"
            type="checkbox"
            checked={showExpansions}
            onChange={(e) => toggleExpansions(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary accent-primary"
          />
        </div>

        {/* Collection Filters (only for home page ludoteca view) */}
        {(basePath === "/" || !basePath) && (
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/10 p-3.5 border-dashed">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-1">
              Incluir en Ludoteca:
            </span>
            
            {/* En Colección Checkbox */}
            <div className="flex items-center justify-between">
              <label htmlFor="ownedToggle" className="text-xs font-bold text-foreground cursor-pointer select-none">
                En Colección
              </label>
              <input
                id="ownedToggle"
                type="checkbox"
                checked={showOwned}
                onChange={(e) => {
                  setShowOwned(e.target.checked);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", "1");
                  if (e.target.checked === false) params.set("showOwned", "false");
                  else params.delete("showOwned");
                  router.push(`${basePath || pathname}?${params.toString()}`);
                }}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary accent-primary"
              />
            </div>

            {/* En Wishlist Checkbox */}
            <div className="flex items-center justify-between">
              <label htmlFor="wishlistToggle" className="text-xs font-bold text-foreground cursor-pointer select-none">
                En Wishlist BGG
              </label>
              <input
                id="wishlistToggle"
                type="checkbox"
                checked={showWishlist}
                onChange={(e) => {
                  setShowWishlist(e.target.checked);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", "1");
                  if (e.target.checked === false) params.set("showWishlist", "false");
                  else params.delete("showWishlist");
                  router.push(`${basePath || pathname}?${params.toString()}`);
                }}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary accent-primary"
              />
            </div>

            {/* Interesantes Checkbox */}
            <div className="flex items-center justify-between">
              <label htmlFor="interestingToggle" className="text-xs font-bold text-foreground cursor-pointer select-none">
                Siguiendo
              </label>
              <input
                id="interestingToggle"
                type="checkbox"
                checked={showInteresting}
                onChange={(e) => {
                  setShowInteresting(e.target.checked);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", "1");
                  if (e.target.checked === false) params.set("showInteresting", "false");
                  else params.delete("showInteresting");
                  router.push(`${basePath || pathname}?${params.toString()}`);
                }}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary accent-primary"
              />
            </div>
          </div>
        )}

        {/* Rating Range */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Star size={13} className="text-amber-500 fill-amber-500" />
            <span>Valoración BGG</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              placeholder="Min (e.g. 7.5)"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted-foreground text-xs font-medium">al</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              placeholder="Max (e.g. 9.5)"
              value={maxRating}
              onChange={(e) => setMaxRating(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* BGG Rank Range */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Award size={13} className="text-indigo-500" />
            <span>Ranking BGG</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max={maxRank}
              placeholder="1"
              value={minRankInput}
              onChange={(e) => setMinRankInput(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted-foreground text-xs font-medium">al</span>
            <input
              type="number"
              min="1"
              max={maxRank}
              placeholder={maxRank.toString()}
              value={maxRankInput}
              onChange={(e) => setMaxRankInput(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Year Published */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Calendar size={13} className="text-emerald-500" />
            <span>Año de Publicación</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1900"
              max="2030"
              placeholder={minYear.toString()}
              value={minYearInput}
              onChange={(e) => setMinYearInput(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted-foreground text-xs font-medium">al</span>
            <input
              type="number"
              min="1900"
              max="2030"
              placeholder={maxYear.toString()}
              value={maxYearInput}
              onChange={(e) => setMaxYearInput(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Players Count & Best Players Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Players */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Users size={13} className="text-sky-500" />
              <span>Jugadores</span>
            </label>
            <input
              type="number"
              min="1"
              max="20"
              placeholder="e.g. 3"
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Best Players */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <Users size={13} className="text-emerald-500" />
              <span>Mejor Nº Jug.</span>
            </label>
            <input
              type="number"
              min="1"
              max="20"
              placeholder="e.g. 4"
              value={bestPlayers}
              onChange={(e) => setBestPlayers(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Complexity Weight */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <SlidersHorizontal size={13} className="text-purple-500" />
            <span>Peso (1-5)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="1"
              max="5"
              placeholder="Min"
              value={minComplexity}
              onChange={(e) => setMinComplexity(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted-foreground text-xs font-medium">al</span>
            <input
              type="number"
              step="0.5"
              min="1"
              max="5"
              placeholder="Max"
              value={maxComplexity}
              onChange={(e) => setMaxComplexity(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Play Time */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Clock size={13} className="text-pink-500" />
            <span>Duración (minutos)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={minPlayTime}
              onChange={(e) => setMinPlayTime(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted-foreground text-xs font-medium">al</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={maxPlayTime}
              onChange={(e) => setMaxPlayTime(e.target.value)}
              className="w-full rounded-xl border bg-input px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          className="mt-2 w-full rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-premium transition-all duration-300 hover:bg-primary/95 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Aplicar Parámetros
        </button>
      </form>

      {/* Categories Multi-Select Pills */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-4">
          <h3 className="text-xs font-bold text-foreground">Categorías</h3>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {categories.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide border transition-all duration-200 ${
                    active
                      ? "bg-primary/10 border-primary text-primary font-bold shadow-sm"
                      : "bg-secondary border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mechanics Multi-Select Pills */}
      {mechanics.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-4">
          <h3 className="text-xs font-bold text-foreground">Mecánicas</h3>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {mechanics.map((mec) => {
              const active = selectedMechanics.includes(mec);
              return (
                <button
                  key={mec}
                  onClick={() => toggleMechanic(mec)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide border transition-all duration-200 ${
                    active
                      ? "bg-primary/10 border-primary text-primary font-bold shadow-sm"
                      : "bg-secondary border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {mec}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
