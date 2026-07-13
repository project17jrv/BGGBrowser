"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  RefreshCw, Store, ExternalLink,
  HelpCircle, Clock, Tag, ArrowUpRight, TrendingUp, AlertCircle,
  ChevronDown, ChevronUp, Flame, Trash2, X, Save, Ban
} from "lucide-react";
import { refreshInterestingGamePrices, updateWallapopItemStatus, toggleShopStockOverride, toggleShopPriceOverride, removeShopFromWatchlist, deleteWallapopItem, updateCustomBlacklist } from "@/lib/actions";
import { PreviewButton } from "./PreviewButton";
import { getBestBargainForGame, getAllCandidatesForGame } from "@/lib/bargainDetector";

interface WallapopListing {
  id: string;
  title: string;
  price: number;
  webLink: string;
  imageUrl?: string;
  location?: string;
}

interface PriceHistoryEntry {
  date: string;
  bestPrice: number;
  avgPrice: number | null;
}

interface LinkedWallapop {
  id: string;
  title: string;
  price: number;
  webLink: string;
  location: string | null;
  imageUrl: string | null;
  status: string;
}

interface WatchlistGame {
  id: string;
  name: string;
  spanishName: string | null;
  thumbnailUrl: string | null;
  ludonautaCache: string | null;
  wallapopCache: string | null;
  excludedWallapopIds: string | null;
  shopStockOverrides: string | null;
  shopPriceOverrides: string | null;
  customBlacklist: string | null;
  linkedWallapop: LinkedWallapop[];
}

interface WatchlistTabProps {
  games: WatchlistGame[];
}

// Calculates shop new price exactly as shown on the game details page (PricesWidget)
function getLudonautaPrice(ludonautaCache: string | null): number | null {
  if (!ludonautaCache) return null;
  try {
    const cache = JSON.parse(ludonautaCache);
    if (Array.isArray(cache.includedLinks) && cache.includedLinks.length > 0) {
      const activeOffers = cache.offers?.filter((o: any) => 
        cache.includedLinks.includes(o.link) && 
        o.price !== null && 
        o.stock !== "Agotado"
      ) || [];
      if (activeOffers.length > 0) {
        const sum = activeOffers.reduce((acc: number, o: any) => acc + o.price, 0);
        return sum / activeOffers.length;
      }
    }
  } catch {}
  return null;
}

function PriceSparkline({ history }: { history: PriceHistoryEntry[] }) {
  if (history.length < 2) {
    return (
      <div className="flex items-center gap-1.5 bg-muted/15 border border-muted/50 rounded-2xl p-3 text-[10px] text-muted-foreground italic mt-2">
        <AlertCircle size={12} className="text-orange-500" />
        <span>Historial en proceso. Vuelve a actualizar mañana para ver la evolución del precio.</span>
      </div>
    );
  }

  // Sort history chronologically by date
  const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const prices = sortedHistory.map((h) => h.bestPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const width = 260;
  const height = 45;
  const padding = 6;

  const points = sortedHistory
    .map((h, i) => {
      const x = padding + (i / (sortedHistory.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((h.bestPrice - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col gap-2 mt-3 bg-muted/10 border rounded-2xl p-3.5">
      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <TrendingUp size={10} className="text-primary" />
        Historial de Mejores Precios (Wallapop)
      </span>
      <div className="flex items-end justify-between gap-4 mt-1">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible flex-grow max-w-[280px]">
          {/* Horizontal Mid Line */}
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="currentColor"
            className="text-muted-foreground/10"
            strokeDasharray="3 3"
          />

          {/* Connection Line */}
          <polyline fill="none" stroke="currentColor" className="text-primary" strokeWidth="2.5" points={points} />

          {/* Extreme Point Circles */}
          {sortedHistory.map((h, i) => {
            if (i !== 0 && i !== sortedHistory.length - 1) return null;
            const x = padding + (i / (sortedHistory.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((h.bestPrice - min) / range) * (height - 2 * padding);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3.5"
                className={i === sortedHistory.length - 1 ? "fill-primary stroke-background stroke-[2px]" : "fill-muted-foreground"}
              />
            );
          })}
        </svg>
        <div className="flex flex-col text-[10px] text-muted-foreground shrink-0 leading-tight border-l pl-3">
          <span className="font-extrabold text-foreground">{max.toFixed(2)}€ <span className="font-normal text-red-500 font-sans text-[8px] uppercase font-bold tracking-wider">Máx</span></span>
          <span className="font-extrabold text-foreground mt-0.5">{min.toFixed(2)}€ <span className="font-normal text-emerald-500 font-sans text-[8px] uppercase font-bold tracking-wider">Mín</span></span>
        </div>
      </div>
    </div>
  );
}

export default function WatchlistTab({ games }: WatchlistTabProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"default" | "chollo">("default");
  // Per-game discarded bargain links (webLink strings to skip in the thermometer)
  const [discardedBargainLinks, setDiscardedBargainLinks] = useState<Map<string, string[]>>(new Map());
  // Per-game force-included bargain links (bypasses auto-filtering)
  const [forceIncludedBargainLinks, setForceIncludedBargainLinks] = useState<Map<string, string[]>>(new Map());
  // Per-game toggle for the full candidate list panel
  const [expandedCandidateIds, setExpandedCandidateIds] = useState<Set<string>>(new Set());
  // Local inputs for custom blacklists to avoid lag
  const [localBlacklists, setLocalBlacklists] = useState<Map<string, string>>(new Map());
  const [savingBlacklistIds, setSavingBlacklistIds] = useState<Set<string>>(new Set());
  const [savedBlacklistIds, setSavedBlacklistIds] = useState<Set<string>>(new Set());

  const toggleCandidates = (gameId: string) => {
    setExpandedCandidateIds(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) { next.delete(gameId); } else { next.add(gameId); }
      return next;
    });
  };

  const toggleExpand = (gameId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) { next.delete(gameId); } else { next.add(gameId); }
      return next;
    });
  };

  const handleCycleWallapopStatus = (itemId: string, currentStatus: string) => {
    const statuses = ["available", "reserved", "sold"];
    const currentIdx = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    
    startTransition(async () => {
      try {
        const res = await updateWallapopItemStatus(itemId, nextStatus);
        if (res.success) {
          router.refresh();
        } else {
          alert("Error al cambiar estado: " + res.error);
        }
      } catch {
        alert("Error de red al cambiar estado.");
      }
    });
  };

  const handleRemoveShop = (gameId: string, offerLink: string) => {
    startTransition(async () => {
      const res = await removeShopFromWatchlist(gameId, offerLink);
      if (res.success) router.refresh();
      else alert("Error al eliminar tienda: " + res.error);
    });
  };

  const handleDeleteWallapopItem = (itemId: string) => {
    if (!confirm("¿Eliminar este anuncio de Wallapop de tu selección?")) return;
    startTransition(async () => {
      const res = await deleteWallapopItem(itemId);
      if (res.success) router.refresh();
      else alert("Error al eliminar anuncio: " + res.error);
    });
  };

  const discardBargainOffer = (gameId: string, webLink: string) => {
    setDiscardedBargainLinks(prev => {
      const next = new Map(prev);
      const existing = next.get(gameId) || [];
      if (!existing.includes(webLink)) next.set(gameId, [...existing, webLink]);
      return next;
    });
  };

  const resetDiscardedBargains = (gameId: string) => {
    setDiscardedBargainLinks(prev => { const next = new Map(prev); next.delete(gameId); return next; });
  };

  const forceIncludeBargainOffer = (gameId: string, webLink: string) => {
    setForceIncludedBargainLinks(prev => {
      const next = new Map(prev);
      const existing = next.get(gameId) || [];
      if (!existing.includes(webLink)) next.set(gameId, [...existing, webLink]);
      return next;
    });
  };

  const removeForceIncludeBargainOffer = (gameId: string, webLink: string) => {
    setForceIncludedBargainLinks(prev => {
      const next = new Map(prev);
      const existing = next.get(gameId) || [];
      next.set(gameId, existing.filter(l => l !== webLink));
      return next;
    });
  };

  const resetForceIncludedBargains = (gameId: string) => {
    setForceIncludedBargainLinks(prev => { const next = new Map(prev); next.delete(gameId); return next; });
  };

  const handleSaveCustomBlacklist = (gameId: string, value: string) => {
    if (savingBlacklistIds.has(gameId)) return;
    setSavingBlacklistIds(prev => { const next = new Set(prev); next.add(gameId); return next; });

    startTransition(async () => {
      try {
        const res = await updateCustomBlacklist(gameId, value);
        if (res.success) {
          setSavedBlacklistIds(prev => { const next = new Set(prev); next.add(gameId); return next; });
          setTimeout(() => {
            setSavedBlacklistIds(prev => { const next = new Set(prev); next.delete(gameId); return next; });
          }, 1500);
          router.refresh();
        } else {
          alert("Error al guardar palabras excluidas: " + res.error);
        }
      } catch {
        alert("Error de red al guardar palabras excluidas.");
      } finally {
        setSavingBlacklistIds(prev => { const next = new Set(prev); next.delete(gameId); return next; });
      }
    });
  };

  const handleToggleShopStock = (gameId: string, offerLink: string, currentStock: string) => {
    let newStock = "Disponible";
    if (currentStock === "En stock" || currentStock === "Disponible") {
      newStock = "Reservar";
    } else if (currentStock === "Reservar") {
      newStock = "Agotado";
    }
    
    startTransition(async () => {
      try {
        const res = await toggleShopStockOverride(gameId, offerLink, newStock);
        if (res.success) {
          router.refresh();
        } else {
          alert("Error al cambiar stock: " + res.error);
        }
      } catch {
        alert("Error de red al cambiar stock.");
      }
    });
  };

  const handleEditShopPrice = (gameId: string, offerLink: string, currentPrice: number) => {
    const promptVal = window.prompt("Introduce el nuevo precio (€):", String(currentPrice));
    if (promptVal === null) return;
    const newPrice = parseFloat(promptVal);
    if (isNaN(newPrice) || newPrice < 0) {
      alert("Por favor, introduce un precio válido.");
      return;
    }
    
    startTransition(async () => {
      try {
        const res = await toggleShopPriceOverride(gameId, offerLink, newPrice);
        if (res.success) {
          router.refresh();
        } else {
          alert("Error al cambiar precio: " + res.error);
        }
      } catch {
        alert("Error de red al cambiar precio.");
      }
    });
  };

  const handleRefreshPrices = (gameId: string) => {
    if (updatingId) return;
    setUpdatingId(gameId);
    startTransition(async () => {
      try {
        const res = await refreshInterestingGamePrices(gameId);
        if (res.success) {
          window.location.reload();
        } else {
          alert("Error al actualizar: " + (res.error || "Error desconocido"));
        }
      } catch {
        alert("Error de conexión al intentar actualizar.");
      } finally {
        setUpdatingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Intro section */}
      <div className="rounded-2xl border bg-card p-5 shadow-premium flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary shrink-0">
          <Store size={22} />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-sm font-bold text-foreground">
            Seguimiento de Compras e Interesantes
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            Aquí se muestran los juegos de mesa que has marcado como <b className="text-primary font-bold">Interesante</b>. 
            Puedes buscar anuncios en Wallapop y ofertas en tiendas de forma unificada, actualizarlos en tiempo real y ver su 
            historial de evolución para comprar al mejor precio posible.
          </p>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl text-xs text-muted-foreground">
          No tienes ningún juego en tu colección marcado como &quot;Interesante&quot; actualmente.
          Ve al detalle de cualquier juego y cámbiale el estado de adquisición a &quot;Interesante&quot; para iniciar su seguimiento.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sorting bar */}
          <div className="flex items-center justify-between bg-card border rounded-2xl p-4 shadow-sm flex-wrap gap-2">
            <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
              Juegos en seguimiento ({games.length})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Ordenar por:</span>
              <div className="flex bg-muted/40 p-1 rounded-xl border border-border/40 gap-1 select-none">
                <button
                  type="button"
                  onClick={() => setSortBy("default")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    sortBy === "default"
                      ? "bg-card text-foreground shadow-sm border border-border/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Defecto
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("chollo")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                    sortBy === "chollo"
                      ? "bg-purple-600 text-white shadow-premium border border-purple-600"
                      : "text-purple-600 dark:text-purple-400 hover:bg-purple-500/5"
                  }`}
                >
                  🔥 Nivel de Chollo
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {(() => {
              // Precalculate and sort all games with their bargains
              const mapped = games.map((game) => {
                const pNew = getLudonautaPrice(game.ludonautaCache);
                
                const excludedIds = game.excludedWallapopIds ? game.excludedWallapopIds.split(",").filter(Boolean) : [];
                const activeWallapopItems = game.linkedWallapop.filter((item) => !excludedIds.includes(item.id));
                const wallapopAveragePrice = activeWallapopItems.length > 0
                  ? activeWallapopItems.reduce((sum, item) => sum + item.price, 0) / activeWallapopItems.length
                  : null;

                const availableWallapopItems = activeWallapopItems.filter(item => item.status !== "sold" && item.status !== "reserved");
                const lowestWallapopPrice = availableWallapopItems.length > 0
                  ? Math.min(...availableWallapopItems.map(item => item.price))
                  : null;
                
                const sortedActiveWallapopItems = [...activeWallapopItems].sort((a, b) => a.price - b.price);
                
                let selectedOffers: { link: string; price: number | null; stock: string; storeName: string }[] = [];
                if (game.ludonautaCache) {
                  try {
                    const cache = JSON.parse(game.ludonautaCache) as { offers?: { link: string; price: number | null; stock: string; storeName: string }[]; includedLinks?: string[] };
                    if (Array.isArray(cache.includedLinks) && cache.includedLinks.length > 0) {
                      selectedOffers = cache.offers?.filter((o) => (cache.includedLinks as string[]).includes(o.link)) || [];
                    }
                  } catch {}
                }

                const sortedSelectedOffers = [...selectedOffers].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

                const availableOffers = selectedOffers.filter((o) => o.price !== null && o.stock !== "Agotado");
                const lowestShopPrice = availableOffers.length > 0
                  ? Math.min(...availableOffers.map((o) => o.price as number))
                  : null;

                let lastUpdated: string | null = null;
                let listings: WallapopListing[] = [];
                let priceHistory: PriceHistoryEntry[] = [];
                
                if (game.wallapopCache) {
                  try {
                    const parsed = JSON.parse(game.wallapopCache);
                    lastUpdated = parsed.lastUpdated;
                    listings = parsed.listings || [];
                    priceHistory = parsed.priceHistory || [];
                  } catch {}
                }

                const _sortedListings = [...listings].sort((a, b) => a.price - b.price);
                const gameNames = [game.name, game.spanishName].filter(Boolean) as string[];
                const customBlacklist = game.customBlacklist
                  ? game.customBlacklist.split(",").map(s => s.trim()).filter(Boolean)
                  : [];
                const bargain = getBestBargainForGame(
                  game,
                  discardedBargainLinks.get(game.id) || [],
                  gameNames,
                  forceIncludedBargainLinks.get(game.id) || [],
                  customBlacklist
                );

                return {
                  game,
                  pNew,
                  wallapopAveragePrice,
                  lowestWallapopPrice,
                  sortedActiveWallapopItems,
                  sortedSelectedOffers,
                  lowestShopPrice,
                  lastUpdated,
                  listings: _sortedListings,
                  priceHistory,
                  bargain
                };
              });

              if (sortBy === "chollo") {
                mapped.sort((a, b) => {
                  const tempA = a.bargain?.temperature ?? -1;
                  const tempB = b.bargain?.temperature ?? -1;
                  if (tempA !== tempB) {
                    return tempB - tempA;
                  }

                  const priceA = a.bargain?.offerPrice ?? Infinity;
                  const priceB = b.bargain?.offerPrice ?? Infinity;
                  if (priceA !== priceB) {
                    return priceA - priceB;
                  }

                  const discountA = a.bargain?.wallapopDiscountPct ?? -1;
                  const discountB = b.bargain?.wallapopDiscountPct ?? -1;
                  return discountB - discountA;
                });
              }

              return mapped.map(({
                game,
                pNew,
                wallapopAveragePrice,
                lowestWallapopPrice,
                sortedActiveWallapopItems,
                sortedSelectedOffers,
                lowestShopPrice,
                lastUpdated,
                priceHistory,
                bargain
              }) => {
                const isUpdating = updatingId === game.id;
                const hasData = lastUpdated !== null;
                const isExpanded = expandedIds.has(game.id);

            return (
              <div key={game.id} className="rounded-2xl border bg-card shadow-premium flex flex-col transition-all hover:border-primary/25 overflow-hidden">
                
                {/* Collapsible Header bar */}
                <div 
                  onClick={() => toggleExpand(game.id)}
                  className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap cursor-pointer hover:bg-muted/10 transition-colors select-none"
                >
                  {/* Left Side: image & title */}
                  <Link 
                    href={`/game/${game.id}`} 
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-3 min-w-0 hover:opacity-85 transition-all group/title cursor-pointer flex-1"
                  >
                    {game.thumbnailUrl && (
                      <img 
                        src={game.thumbnailUrl} 
                        alt={game.name} 
                        className="w-10 h-10 rounded-xl object-cover border bg-muted shrink-0 group-hover/title:border-primary/45 transition-colors" 
                      />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-heading font-extrabold text-foreground text-sm truncate leading-snug group-hover/title:text-primary transition-colors">
                        {game.spanishName || game.name}
                      </span>
                      {game.spanishName && game.name !== game.spanishName && (
                        <span className="text-[10px] text-muted-foreground truncate italic">
                          {game.name}
                        </span>
                      )}
                      {bargain && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate mt-0.5 flex items-center gap-1">
                          <span className="shrink-0">🏷️</span>
                          <span className="truncate max-w-[200px] sm:max-w-[300px]" title={bargain.title}>{bargain.title}</span>
                          <span className="font-extrabold shrink-0">({bargain.offerPrice.toFixed(2)}€)</span>
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Center-Right: Prices list */}
                  <div className="flex items-center gap-6 shrink-0 flex-wrap sm:flex-nowrap">
                    
                    {/* Store Price (Average) */}
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Store size={9} className="text-primary" />
                        Tienda (Promedio)
                      </span>
                      <span className="text-sm font-heading font-black text-foreground">
                        {pNew !== null ? `${pNew.toFixed(2)}€` : "-"}
                      </span>
                    </div>

                    {/* Store Price (Lowest Available) */}
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Store size={9} className="text-indigo-500" />
                        Tienda (Mínimo)
                      </span>
                      <span className="text-sm font-heading font-black text-indigo-500">
                        {lowestShopPrice !== null ? `${lowestShopPrice.toFixed(2)}€` : "-"}
                      </span>
                    </div>

                    {/* Wallapop average price */}
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Tag size={9} className="text-orange-500" />
                        Wallapop (Promedio)
                      </span>
                      <span className="text-sm font-heading font-black text-foreground">
                        {wallapopAveragePrice !== null ? `${wallapopAveragePrice.toFixed(2)}€` : "-"}
                      </span>
                    </div>

                    {/* Wallapop lowest valid price */}
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Tag size={9} className="text-emerald-500" />
                        Wallapop (Mínimo)
                      </span>
                      <span className="text-sm font-heading font-black text-emerald-500">
                        {lowestWallapopPrice !== null ? `${lowestWallapopPrice.toFixed(2)}€` : "-"}
                      </span>
                    </div>

                    {/* Bargain indicator */}
                    {bargain && (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          Chollo
                        </span>
                        <div 
                          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border transition-all ${
                            bargain.temperature >= 80
                              ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-premium"
                              : bargain.temperature >= 60
                              ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                              : bargain.temperature >= 40
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border/40"
                          }`}
                          title={bargain.explanation}
                        >
                          {bargain.temperature >= 70 ? (
                            <Flame size={12} className="text-orange-500 fill-orange-500 animate-pulse-slow" />
                          ) : (
                            <span>🌡️</span>
                          )}
                          <span>{bargain.temperature}°C</span>
                        </div>
                      </div>
                    )}
                    
                  </div>

                  {/* Right: Actions & Toggle */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRefreshPrices(game.id)}
                      disabled={isUpdating}
                      className="flex items-center justify-center rounded-lg border border-muted hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary w-8 h-8 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                      title="Actualizar precios de tiendas y Wallapop"
                    >
                      <RefreshCw size={12} className={isUpdating ? "animate-spin text-primary" : ""} />
                    </button>

                    <button
                      onClick={() => toggleExpand(game.id)}
                      className="flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary w-8 h-8 transition-all cursor-pointer"
                      title={isExpanded ? "Contraer" : "Desplegar"}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Details Content */}
                {isExpanded && (
                  <div className="p-4 border-t bg-card/40 flex flex-col gap-4">
                    {/* Grid for Evolution Sparkline & Bargain Thermometer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {/* Left: Sparkline chart */}
                      <div className="flex flex-col gap-1.5 h-full justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">
                            Evolución de Precio Mínimo (Wallapop)
                          </span>
                          <PriceSparkline history={priceHistory} />
                        </div>
                        {hasData && (
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground/80 font-semibold mt-3">
                            <Clock size={10} />
                            <span>Actualizado: {new Date(lastUpdated as string).toLocaleDateString("es-ES")} {new Date(lastUpdated as string).toLocaleTimeString("es-ES", {hour: "2-digit", minute:"2-digit"})}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Bargain Detector Thermometer */}
                      {bargain ? (
                        <div className="flex flex-col gap-2 bg-muted/15 border border-muted/50 rounded-2xl p-4 transition-all duration-300 hover:border-primary/20 hover:bg-muted/20">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">
                              Detector de Chollos
                            </span>
                            <div className="flex items-center gap-1.5">
                              {bargain.temperature >= 70 ? (
                                <Flame size={12} className="text-orange-500 fill-orange-500 animate-bounce" />
                              ) : (
                                <span className="text-xs">🌡️</span>
                              )}
                              <span className="text-[10px] font-extrabold text-foreground bg-muted/40 px-2 py-0.5 rounded-full border">
                                {bargain.temperature}°C — {bargain.label}
                              </span>
                            </div>
                          </div>
                          
                          {/* Explanation */}
                          <p className="text-xs font-bold text-foreground mt-1">
                            {bargain.explanation}
                          </p>
                          
                          {/* Thermometer Progress Bar */}
                          <div className="h-3 w-full bg-muted/50 rounded-full overflow-hidden relative border border-border/20 shadow-inner mt-1">
                            <div 
                              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 via-emerald-500 via-yellow-500 via-orange-500 to-red-500"
                              style={{ width: `${Math.min(100, bargain.temperature)}%` }}
                            />
                          </div>
                          
                          {/* Bargain Listing Context */}
                          <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5 mt-2 bg-card p-2.5 rounded-xl border border-border/40">
                            <span className="font-bold text-foreground line-clamp-1">{bargain.title}</span>
                            {bargain.location && <span>📍 {bargain.location}</span>}
                            <span>{bargain.isLinked ? "🔗 Oferta seleccionada por ti" : "🔍 Encontrada automáticamente"}</span>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="mt-2 flex items-center gap-2">
                            <a
                              href={bargain.webLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-[11px] font-bold uppercase tracking-wider py-2 px-4 rounded-xl shadow-premium hover:shadow-premium-hover transition-all cursor-pointer text-center"
                            >
                              Ver oferta ({bargain.offerPrice}€)
                              <ArrowUpRight size={12} />
                            </a>
                            <button
                              type="button"
                              onClick={() => discardBargainOffer(game.id, bargain.webLink)}
                              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-xl border border-border/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all"
                              title="Descartar esta oferta y analizar la siguiente"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          {(discardedBargainLinks.get(game.id)?.length ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => resetDiscardedBargains(game.id)}
                              className="mt-1 text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer self-center"
                            >
                              Restablecer ofertas descartadas ({discardedBargainLinks.get(game.id)!.length})
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 bg-muted/15 border border-muted/50 rounded-2xl h-full min-h-[160px] text-muted-foreground">
                          <HelpCircle size={24} className="text-muted-foreground/60 mb-2" />
                          <span className="text-xs font-bold">Sin ofertas disponibles</span>
                          <span className="text-[10px] max-w-[200px] mt-1 text-muted-foreground/80 leading-normal">
                            No hay ofertas de Wallapop cargadas para calcular el nivel de chollo.
                          </span>
                          {(discardedBargainLinks.get(game.id)?.length ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => resetDiscardedBargains(game.id)}
                              className="mt-3 text-[10px] text-primary hover:underline cursor-pointer"
                            >
                              Restablecer {discardedBargainLinks.get(game.id)!.length} oferta(s) descartada(s)
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* All Wallapop Candidates Panel */}
                    {(() => {
                      const gameNames = [game.name, game.spanishName].filter(Boolean) as string[];
                      const customBlacklist = game.customBlacklist
                        ? game.customBlacklist.split(",").map((s) => s.trim()).filter(Boolean)
                        : [];
                      const allCandidates = getAllCandidatesForGame(
                        game,
                        discardedBargainLinks.get(game.id) || [],
                        gameNames,
                        forceIncludedBargainLinks.get(game.id) || [],
                        customBlacklist
                      );
                      const isCandidatesExpanded = expandedCandidateIds.has(game.id);
                      const discardedCount = (discardedBargainLinks.get(game.id) || []).length;
                      if (allCandidates.length === 0) return null;
                      return (
                        <div className="border border-dashed rounded-2xl overflow-hidden transition-all duration-300">
                          {/* Header toggle */}
                          <button
                            type="button"
                            onClick={() => toggleCandidates(game.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <TrendingUp size={12} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                                Anuncios Considerados ({allCandidates.length - discardedCount} activos{discardedCount > 0 ? `, ${discardedCount} descartados` : ""})
                              </span>
                            </div>
                            {isCandidatesExpanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                          </button>

                          {/* Candidate list */}
                          {isCandidatesExpanded && (
                            <div className="divide-y divide-border/30">
                              {allCandidates.map((cand, ci) => {
                                const isDiscarded = (discardedBargainLinks.get(game.id) || []).includes(cand.webLink) || (cand.autoFiltered);
                                const isBest = !isDiscarded && bargain?.webLink === cand.webLink;
                                const tempColor = isDiscarded
                                  ? "text-muted-foreground/50"
                                  : cand.temperature >= 70 ? "text-orange-500"
                                  : cand.temperature >= 50 ? "text-amber-500"
                                  : cand.temperature >= 35 ? "text-emerald-500"
                                  : "text-muted-foreground";
                                const tempBg = isDiscarded
                                  ? "bg-muted/10 border-border/20"
                                  : cand.temperature >= 70 ? "bg-orange-500/10 border-orange-500/20"
                                  : cand.temperature >= 50 ? "bg-amber-500/10 border-amber-500/20"
                                  : cand.temperature >= 35 ? "bg-emerald-500/10 border-emerald-500/20"
                                  : "bg-muted/10 border-border/20";

                                return (
                                  <div
                                    key={ci}
                                    className={`flex items-center gap-2 px-3 py-2 text-xs transition-all ${isDiscarded ? "opacity-55" : ""} ${isBest ? "bg-primary/5" : "hover:bg-muted/10"}`}
                                  >
                                    {/* Best marker */}
                                    <span className="text-[10px] w-3 shrink-0 text-center text-amber-500">
                                      {isBest ? "👑" : cand.autoFiltered ? "⚙️" : isDiscarded ? "✗" : ""}
                                    </span>

                                    {/* Title + location */}
                                    <div className="flex-1 min-w-0">
                                      <span className={`block font-semibold truncate ${isDiscarded ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                        {cand.title}
                                      </span>
                                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                        {cand.location && (
                                          <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">📍 {cand.location}</span>
                                        )}
                                        {cand.isLinked && (
                                          <span className="text-[9px] text-indigo-500 font-bold">🔗 Seleccionado</span>
                                        )}
                                        {cand.autoFiltered && (
                                          <span className="text-[8px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">Auto-filtrado (Accesorios/No base)</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Price */}
                                    <span className={`font-black shrink-0 ${isDiscarded ? "text-muted-foreground" : "text-foreground"}`}>
                                      {cand.price.toFixed(2)}€
                                    </span>

                                    {/* Temperature badge */}
                                    {!isDiscarded && (
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border shrink-0 ${tempBg} ${tempColor}`}>
                                        {cand.temperature}°
                                      </span>
                                    )}

                                    {/* Link + Discard/Restore buttons */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <a
                                        href={cand.webLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-6 w-6 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-primary hover:text-white transition-all"
                                        title="Ver anuncio"
                                      >
                                        <ExternalLink size={9} />
                                      </a>
                                      {isDiscarded ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (cand.autoFiltered) {
                                              forceIncludeBargainOffer(game.id, cand.webLink);
                                            }
                                            setDiscardedBargainLinks(prev => {
                                              const next = new Map(prev);
                                              const existing = next.get(game.id) || [];
                                              next.set(game.id, existing.filter(l => l !== cand.webLink));
                                              return next;
                                            });
                                          }}
                                          className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 border border-transparent hover:border-emerald-500/20 transition-all"
                                          title="Restaurar/Incluir este anuncio"
                                        >
                                          <ArrowUpRight size={9} />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            removeForceIncludeBargainOffer(game.id, cand.webLink);
                                            discardBargainOffer(game.id, cand.webLink);
                                          }}
                                          className="h-6 w-6 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/20 transition-all"
                                          title="Descartar este anuncio del cálculo"
                                        >
                                          <X size={9} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Custom Blacklist Keywords Input */}
                    <div className="bg-muted/10 border border-border/50 rounded-2xl p-4 space-y-2 mt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Ban size={11} className="text-muted-foreground/80" />
                          Palabras excluidas personalizadas
                        </label>
                        {savingBlacklistIds.has(game.id) ? (
                          <span className="text-[9px] text-primary font-bold animate-pulse">Guardando...</span>
                        ) : savedBlacklistIds.has(game.id) ? (
                          <span className="text-[9px] text-emerald-500 font-extrabold flex items-center gap-0.5">
                            ✓ Guardado
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground/60 font-medium">Presiona Enter o desenfoca para guardar</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={localBlacklists.has(game.id) ? localBlacklists.get(game.id) : (game.customBlacklist || "")}
                        onChange={(e) => setLocalBlacklists(prev => new Map(prev).set(game.id, e.target.value))}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== (game.customBlacklist || "")) {
                            handleSaveCustomBlacklist(game.id, val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value;
                            handleSaveCustomBlacklist(game.id, val);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        placeholder="Ej. lote, expansion, promo, kickstarter..."
                        className="w-full bg-background border border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs placeholder:text-muted-foreground/50 outline-none transition-all"
                      />
                    </div>

                    {/* Selected Items Lists Stack (Wallapop below Shops) */}
                    <div className="flex flex-col gap-4 border-t border-dashed pt-4 flex-grow">
                  
                  {/* Shop Selections */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block mb-1">
                      Tiendas Seleccionadas ({sortedSelectedOffers.length})
                    </span>
                    {sortedSelectedOffers.length > 0 ? (
                      <div className="space-y-1.5">
                        {sortedSelectedOffers.map((o, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between gap-3 p-2 rounded-xl border bg-muted/5 text-xs"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-foreground truncate max-w-[130px] sm:max-w-[180px]">{o.storeName}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleShopStock(game.id, o.link, o.stock)}
                                className={`inline-block rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider w-fit mt-0.5 border cursor-pointer select-none transition-all hover:scale-105 ${
                                  o.stock === "En stock" || o.stock === "Disponible"
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                    : o.stock === "Reservar"
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                    : "bg-red-500/10 border-red-500/20 text-red-500"
                                }`}
                                title="Haga clic para cambiar stock (Disponible / Reservar / Agotado)"
                              >
                                {o.stock === "En stock" || o.stock === "Disponible" 
                                  ? "🟢 Disponible" 
                                  : o.stock === "Reservar"
                                  ? "🟠 Reservar"
                                  : "🔴 Agotado"
                                }
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditShopPrice(game.id, o.link, o.price || 0)}
                                className={`font-black text-primary transition-all hover:scale-105 hover:text-primary/80 cursor-pointer select-none ${o.stock === "Agotado" ? "line-through opacity-50" : ""}`}
                                title="Haga clic para editar el precio manualmente"
                              >
                                {o.price !== null ? `${o.price.toFixed(2)}€` : "-"}
                              </button>
                              
                              <PreviewButton
                                url={o.link}
                                label={o.storeName}
                                price={o.price !== null ? `${o.price.toFixed(2)}€` : undefined}
                                badge={o.stock === "En stock" || o.stock === "Disponible" ? "Disponible" : o.stock}
                                badgeVariant={o.stock === "En stock" || o.stock === "Disponible" ? "green" : "red"}
                                accentClass={o.stock === "En stock" || o.stock === "Disponible" ? "hover:bg-primary/15 hover:text-primary" : "hover:bg-red-500/15 hover:text-red-500"}
                              />

                              <a
                                href={o.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-7 w-7 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-primary hover:text-white border border-transparent transition-all shadow-sm"
                                title={`Ver en ${o.storeName}`}
                              >
                                <ExternalLink size={10} />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleRemoveShop(game.id, o.link)}
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/20 transition-all"
                                title="Quitar esta tienda de la selección"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic bg-muted/5 border border-dashed rounded-2xl p-4 text-center">
                        Ninguna tienda seleccionada en la ficha.
                      </p>
                    )}
                  </div>

                  {/* Wallapop Selections */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block mb-1">
                      Anuncios Wallapop Seleccionados ({sortedActiveWallapopItems.length})
                    </span>
                    {sortedActiveWallapopItems.length > 0 ? (
                      <div className="space-y-1.5">
                        {sortedActiveWallapopItems.map((item) => (
                          <div 
                            key={item.id} 
                            className={`flex items-center justify-between gap-3 p-2 rounded-xl border text-xs transition-all ${
                              item.status === "sold" 
                                ? "bg-red-500/5 border-red-500/20 text-red-500" 
                                : item.status === "reserved"
                                ? "bg-orange-500/5 border-orange-500/20 text-orange-500"
                                : "bg-muted/5 border-border"
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className={`font-bold truncate max-w-[130px] sm:max-w-[180px] ${
                                item.status === "sold" ? "text-red-600 dark:text-red-400" : item.status === "reserved" ? "text-orange-600 dark:text-orange-400" : "text-foreground"
                              }`}>{item.title}</span>
                              
                              <button
                                type="button"
                                onClick={() => handleCycleWallapopStatus(item.id, item.status || "available")}
                                className={`inline-block rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider w-fit mt-0.5 border cursor-pointer select-none transition-all hover:scale-105 ${
                                  item.status === "sold"
                                    ? "bg-red-500/10 border-red-500/20 text-red-500"
                                    : item.status === "reserved"
                                    ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                }`}
                                title="Haga clic para cambiar estado (Disponible / Reservado / Vendido)"
                              >
                                {item.status === "sold" ? "🔴 Vendido" : item.status === "reserved" ? "🟠 Reservado" : "🟢 Disponible"}
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`font-black ${item.status === "sold" ? "text-red-500" : item.status === "reserved" ? "text-orange-500" : "text-emerald-500"}`}>{item.price.toFixed(2)}€</span>
                              
                              <PreviewButton
                                url={item.webLink}
                                label="Wallapop"
                                price={`${item.price.toFixed(2)}€`}
                                badge={item.status === "sold" ? "Vendido" : item.status === "reserved" ? "Reservado" : item.location || undefined}
                                badgeVariant={item.status === "sold" ? "red" : item.status === "reserved" ? "orange" : "green"}
                                accentClass={item.status === "sold" ? "hover:bg-red-500/15 hover:text-red-500" : item.status === "reserved" ? "hover:bg-orange-500/15 hover:text-orange-500" : "hover:bg-green-500/15 hover:text-green-500"}
                              />

                              <a
                                href={item.webLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-7 w-7 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-primary hover:text-white border border-transparent transition-all shadow-sm"
                                title="Ver anuncio en Wallapop"
                              >
                                <ExternalLink size={10} />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleDeleteWallapopItem(item.id)}
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/20 transition-all"
                                title="Eliminar este anuncio de la selección"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic bg-muted/5 border border-dashed rounded-2xl p-4 text-center">
                        Ningún anuncio seleccionado en la ficha.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            </div>
          );
        })
      })()}
      </div>
      </div>
      )}

    </div>
  );
}
