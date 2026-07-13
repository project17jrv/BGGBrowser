"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  RefreshCw, Store, ExternalLink, Calendar, 
  HelpCircle, Clock, Tag, ArrowUpRight, TrendingUp, AlertCircle,
  ChevronDown, ChevronUp
} from "lucide-react";
import { refreshInterestingGamePrices, updateWallapopItemStatus, toggleShopStockOverride, toggleShopPriceOverride } from "@/lib/actions";
import { PreviewButton } from "./PreviewButton";

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
      const activeOffers = cache.offers?.filter((o: any) => cache.includedLinks.includes(o.link) && o.price !== null && o.stock !== "Agotado") || [];
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
  const [isPending, startTransition] = useTransition();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (gameId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(gameId) ? next.delete(gameId) : next.add(gameId);
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
      } catch (err) {
        alert("Error de red al cambiar estado.");
      }
    });
  };

  const handleToggleShopStock = (gameId: string, offerLink: string, currentStock: string) => {
    const isAvailable = currentStock === "En stock" || currentStock === "Disponible";
    const newStock = isAvailable ? "Agotado" : "Disponible";
    
    startTransition(async () => {
      try {
        const res = await toggleShopStockOverride(gameId, offerLink, newStock);
        if (res.success) {
          router.refresh();
        } else {
          alert("Error al cambiar stock: " + res.error);
        }
      } catch (err) {
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
      } catch (err) {
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
        <div className="flex flex-col gap-4">
          {games.map((game) => {
            const pNew = getLudonautaPrice(game.ludonautaCache);
            
            // Calculates Wallapop average price exactly as shown on the game details page (WallapopWidget)
            const excludedIds = game.excludedWallapopIds ? game.excludedWallapopIds.split(",").filter(Boolean) : [];
            const activeWallapopItems = game.linkedWallapop.filter((item) => !excludedIds.includes(item.id));
            const wallapopAveragePrice = activeWallapopItems.length > 0
              ? activeWallapopItems.reduce((sum, item) => sum + item.price, 0) / activeWallapopItems.length
              : null;

            // Calculates Lowest Valid Second-Hand Price (Available listings only)
            const availableWallapopItems = activeWallapopItems.filter(item => item.status !== "sold" && item.status !== "reserved");
            const lowestWallapopPrice = availableWallapopItems.length > 0
              ? Math.min(...availableWallapopItems.map(item => item.price))
              : null;
            
            // Sort Wallapop items by price (lowest to highest)
            const sortedActiveWallapopItems = [...activeWallapopItems].sort((a, b) => a.price - b.price);
            
            // Parse Ludonauta cache for selected shops
            let selectedOffers: any[] = [];
            if (game.ludonautaCache) {
              try {
                const cache = JSON.parse(game.ludonautaCache);
                if (Array.isArray(cache.includedLinks) && cache.includedLinks.length > 0) {
                  selectedOffers = cache.offers?.filter((o: any) => cache.includedLinks.includes(o.link)) || [];
                }
              } catch {}
            }

            // Sort selected offers by price (lowest to highest, null values/N/A at the bottom)
            const sortedSelectedOffers = [...selectedOffers].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

            // Calculates lowest valid shop price among selected available offers
            const availableOffers = selectedOffers.filter((o) => o.price !== null && o.stock !== "Agotado");
            const lowestShopPrice = availableOffers.length > 0
              ? Math.min(...availableOffers.map((o) => o.price as number))
              : null;

            // Parse Wallapop cache for listings & history (API search data)
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

            // Sort listings cheapest first
            const sortedListings = [...listings].sort((a, b) => a.price - b.price);

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
                    {/* Sparkline chart */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">
                        Evolución de Precio Mínimo
                      </span>
                      <PriceSparkline history={priceHistory} />
                    </div>

                    {/* Last updated timestamp */}
                    {hasData && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground/80 font-semibold">
                        <Clock size={10} />
                        <span>Actualizado: {new Date(lastUpdated as string).toLocaleDateString("es-ES")} {new Date(lastUpdated as string).toLocaleTimeString("es-ES", {hour: "2-digit", minute:"2-digit"})}</span>
                      </div>
                    )}

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
                                    : "bg-red-500/10 border-red-500/20 text-red-500"
                                }`}
                                title="Haga clic para cambiar stock (Disponible / Agotado)"
                              >
                                {o.stock === "En stock" || o.stock === "Disponible" ? "🟢 Disponible" : "🔴 Agotado"}
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
        })}
      </div>
      )}

    </div>
  );
}
