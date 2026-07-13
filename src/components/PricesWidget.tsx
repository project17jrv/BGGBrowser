"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink, RefreshCw, AlertCircle, ShoppingCart,
  Trash2, EyeOff, Eye, MonitorSmartphone
} from "lucide-react";
import { excludeLudonautaOffer, toggleShopStockOverride, toggleShopPriceOverride } from "@/lib/actions";

// ── Types ────────────────────────────────────────────────────────────────────

interface OfferPreview {
  title: string | null;
  description: string | null;
  image: string | null;
}

interface Offer {
  storeName: string;
  price: number | null;
  link: string;
  stock: string;
  preview?: OfferPreview;
}

interface PricesWidgetProps {
  gameId: string;
  gameName?: string;
}

// ── Utils ────────────────────────────────────────────────────────────────────

const EXPANSION_KEYWORDS = [
  "expansión", "expansion", "expansiones",
  "ampliación", "ampliacion",
  "pack de", "big box", "kickstarter",
  "promo", "mini expansion", "stretch goal",
  "edición coleccionista", "edicion coleccionista",
];

function isExpansionOffer(offer: Offer): boolean {
  const combined = `${offer.storeName} ${offer.link}`.toLowerCase();
  return EXPANSION_KEYWORDS.some((kw) => combined.includes(kw));
}

function getStockColor(stock: string) {
  switch (stock) {
    case "En stock":
    case "Disponible":    return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
    case "Pre-venta":
    case "En reposición":
    case "Bajo pedido":
    case "Reservar":      return "bg-amber-500/10 border-amber-500/20 text-amber-500";
    default:              return "bg-red-500/10 border-red-500/20 text-red-500";
  }
}

import { PreviewButton } from "./PreviewButton";

// ── Main widget ───────────────────────────────────────────────────────────────

export default function PricesWidget({ gameId, gameName }: PricesWidgetProps) {
  const router = useRouter();
  const [data, setData] = useState<{
    lastUpdated: string;
    slug: string;
    offers: Offer[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [included, setIncluded] = useState<Set<string>>(new Set());

  const handleToggleStock = useCallback((link: string, currentStock: string) => {
    const isAvailable = currentStock === "En stock" || currentStock === "Disponible";
    const newStock = isAvailable ? "Agotado" : "Disponible";
    toggleShopStockOverride(gameId, link, newStock).then((res) => {
      if (res.success) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            offers: prev.offers.map((o) => o.link === link ? { ...o, stock: newStock } : o)
          };
        });
        router.refresh();
      }
    }).catch(console.error);
  }, [gameId, router]);

  const handleEditPrice = useCallback((link: string, currentPrice: number) => {
    const promptVal = window.prompt("Introduce el nuevo precio (€):", String(currentPrice));
    if (promptVal === null) return;
    const newPrice = parseFloat(promptVal);
    if (isNaN(newPrice) || newPrice < 0) {
      alert("Por favor, introduce un precio válido.");
      return;
    }
    toggleShopPriceOverride(gameId, link, newPrice).then((res) => {
      if (res.success) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            offers: prev.offers.map((o) => o.link === link ? { ...o, price: newPrice } : o)
          };
        });
        router.refresh();
      }
    }).catch(console.error);
  }, [gameId, router]);

  const fetchPrices = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/game/${gameId}/prices${refresh ? "?refresh=true" : ""}`);
      if (!res.ok) throw new Error("No se pudieron cargar los precios de Ludonauta.");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gameId]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  // Synchronize database and localStorage selections on data load
  useEffect(() => {
    if (!data) return;
    try {
      // Read from data first (which comes from the DB)
      const linksArray = (data as any).includedLinks || [];
      if (Array.isArray(linksArray) && linksArray.length > 0) {
        const currentLinks = new Set(data.offers.map((o) => o.link));
        const validLinks = linksArray.filter((link) => currentLinks.has(link));
        setIncluded(new Set(validLinks));
      } else {
        // Fallback to localStorage for smooth transition
        const saved = localStorage.getItem(`bgg-included-prices-${gameId}`);
        if (saved) {
          const localLinks = JSON.parse(saved);
          if (Array.isArray(localLinks)) {
            const currentLinks = new Set(data.offers.map((o) => o.link));
            const validLinks = localLinks.filter((link) => currentLinks.has(link));
            setIncluded(new Set(validLinks));
            // Persist this local selection to the DB so it is synchronized
            fetch(`/api/game/${gameId}/prices`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ includedLinks: validLinks })
            }).catch(console.error);
          }
        } else {
          setIncluded(new Set());
        }
      }
    } catch (err) {
      console.error("Failed to load persisted prices selection", err);
      setIncluded(new Set());
    }
  }, [data, gameId]);

  const toggleInclude = useCallback((link: string) => {
    let nextLinks: string[] = [];
    setIncluded((prev) => {
      const next = new Set(prev);
      next.has(link) ? next.delete(link) : next.add(link);
      nextLinks = Array.from(next);
      try {
        localStorage.setItem(`bgg-included-prices-${gameId}`, JSON.stringify(nextLinks));
      } catch (err) {
        console.error("Failed to persist prices selection to localStorage", err);
      }
      return next;
    });

    // Save to DB in the background
    fetch(`/api/game/${gameId}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includedLinks: nextLinks })
    }).catch((err) => console.error("Failed to persist prices selection to DB", err));
  }, [gameId]);

  const handlePermanentDelete = useCallback(async (offer: Offer) => {
    let nextLinks: string[] = [];
    if (data) {
      setData({ ...data, offers: data.offers.filter((o) => o.link !== offer.link) });
      setIncluded((prev) => {
        const n = new Set(prev);
        n.delete(offer.link);
        nextLinks = Array.from(n);
        try {
          localStorage.setItem(`bgg-included-prices-${gameId}`, JSON.stringify(nextLinks));
        } catch (err) {
          console.error("Failed to persist prices selection to localStorage", err);
        }
        return n;
      });
    }

    // Save to DB in the background
    fetch(`/api/game/${gameId}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includedLinks: nextLinks })
    }).catch((err) => console.error("Failed to persist prices selection to DB", err));

    const res = await excludeLudonautaOffer(gameId, offer.link);
    if (!res.success) fetchPrices();
  }, [data, gameId, fetchPrices]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-5 shadow-premium animate-pulse">
        <div className="h-4.5 w-1/3 bg-muted rounded-md mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-muted rounded-xl" />
          <div className="h-10 bg-muted rounded-xl" />
          <div className="h-10 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-5 text-center text-xs text-red-500 flex flex-col items-center gap-2">
        <AlertCircle size={20} />
        <p>{error}</p>
        <button
          onClick={() => fetchPrices(true)}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 font-bold hover:bg-red-500/20 transition-all cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const offers = data?.offers || [];
  const includedOffers = offers.filter((o) => included.has(o.link) && o.price !== null && o.stock !== "Agotado");
  const avgPrice = includedOffers.length > 0
    ? includedOffers.reduce((acc, o) => acc + (o.price as number), 0) / includedOffers.length
    : null;
  const includedCount = includedOffers.length;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4 relative overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3.5">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-primary" />
          <div className="flex flex-col">
            <h3 className="font-heading text-sm font-bold text-foreground">
              Comparador Ludonauta.es
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {avgPrice !== null ? (
                <span className="text-[10px] text-emerald-500 font-semibold">
                  Precio Medio ({includedCount} tienda{includedCount !== 1 ? "s" : ""}): {avgPrice.toFixed(2)}€
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Precio Medio: -- (selecciona ofertas para promediar)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data?.lastUpdated && (
            <span className="text-[10px] text-muted-foreground font-medium">
              Act. {new Date(data.lastUpdated).toLocaleDateString()}
            </span>
          )}
          <button
            onClick={() => fetchPrices(true)}
            disabled={refreshing}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-50 cursor-pointer"
            title="Actualizar Precios (regenera fichas)"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Offers list */}
      {offers.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          No se encontraron ofertas en tiendas españolas para este título.
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
          {offers.map((offer, idx) => {
            const isIncluded = included.has(offer.link);
            const looksLikeExpansion = isExpansionOffer(offer);

            return (
              <div
                key={idx}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-xs transition-all ${
                  isIncluded
                    ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                    : "bg-muted/10 hover:bg-muted/30 border-transparent opacity-65"
                }`}
              >
                {/* Store info */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-bold leading-tight truncate ${isIncluded ? "text-emerald-500 dark:text-emerald-400" : "text-foreground"}`}>
                      {offer.storeName}
                    </span>
                    {looksLikeExpansion && (
                      <span className="inline-block rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0">
                        Expansión
                      </span>
                    )}
                    {isIncluded && (
                      <span className="inline-block rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
                        En promedio
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleStock(offer.link, offer.stock)}
                    className={`inline-block rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider w-fit mt-0.5 border cursor-pointer select-none transition-all hover:scale-105 ${getStockColor(offer.stock)}`}
                    title="Haga clic para cambiar stock (Disponible / Agotado)"
                  >
                    {offer.stock === "En stock" || offer.stock === "Disponible" ? "🟢 Disponible" : offer.stock === "Agotado" ? "🔴 Agotado" : `🟠 ${offer.stock}`}
                  </button>
                </div>

                {/* Price + actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditPrice(offer.link, offer.price || 0)}
                    className={`font-heading text-sm font-black mr-0.5 cursor-pointer select-none transition-all hover:scale-105 hover:text-primary ${
                      offer.stock === "Agotado"
                        ? "line-through opacity-50 text-muted-foreground"
                        : isIncluded
                        ? "text-emerald-500 dark:text-emerald-400"
                        : "text-foreground"
                    }`}
                    title="Haga clic para editar el precio manualmente"
                  >
                    {offer.price !== null ? `${offer.price.toFixed(2)}€` : "N/A"}
                  </button>

                  {/* Mini-card preview button */}
                  <PreviewButton
                    url={offer.link}
                    preview={offer.preview}
                    label={offer.storeName}
                    price={offer.price !== null ? `${offer.price.toFixed(2)} €` : undefined}
                    badge={offer.stock === "En stock" || offer.stock === "Disponible" ? "Disponible" : offer.stock}
                    badgeVariant={offer.stock === "En stock" || offer.stock === "Disponible" ? "green" : (["Pre-venta", "En reposición", "Bajo pedido", "Reservar"].includes(offer.stock) ? "amber" : "red")}
                  />

                  {/* Toggle include */}
                  <button
                    onClick={() => toggleInclude(offer.link)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all shadow-sm cursor-pointer ${
                      isIncluded
                        ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/30"
                        : "bg-secondary text-muted-foreground hover:bg-emerald-500/15 hover:text-emerald-500"
                    }`}
                    title={isIncluded ? "Excluir del promedio" : "Incluir en el promedio"}
                  >
                    {isIncluded ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>

                  {/* Permanent delete */}
                  <button
                    onClick={() => handlePermanentDelete(offer)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm cursor-pointer"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 size={12} />
                  </button>

                  {/* Open store */}
                  <a
                    href={offer.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-primary hover:text-white transition-all shadow-sm"
                    title="Ir a la tienda"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {offers.length > 0 && (
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground border-t pt-2.5 flex-wrap">
          <span className="flex items-center gap-1">
            <MonitorSmartphone size={9} className="text-blue-400/70" />
            Ficha del producto
          </span>
          <span className="flex items-center gap-1">
            <Eye size={9} className="text-emerald-500/70" />
            Incluir en el promedio
          </span>
          <span className="flex items-center gap-1">
            <Trash2 size={9} className="text-red-500/70" />
            Eliminar permanentemente
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400/70" />
            Posible expansión
          </span>
        </div>
      )}
    </div>
  );
}
