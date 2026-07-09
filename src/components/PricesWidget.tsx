"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, RefreshCw, AlertCircle, ShoppingCart } from "lucide-react";

interface Offer {
  storeName: string;
  price: number | null;
  link: string;
  stock: string;
}

interface PricesWidgetProps {
  gameId: string;
}

export default function PricesWidget({ gameId }: PricesWidgetProps) {
  const [data, setData] = useState<{ lastUpdated: string; slug: string; offers: Offer[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/game/${gameId}/prices${refresh ? "?refresh=true" : ""}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar los precios de Ludonauta.");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

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

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-5 text-center text-xs text-red-500 flex flex-col items-center gap-2">
        <AlertCircle size={20} />
        <p>{error}</p>
        <button
          onClick={() => fetchPrices(true)}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 font-bold hover:bg-red-500/20 transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const offers = data?.offers || [];

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4 relative overflow-hidden">
      
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b pb-3.5">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-primary" />
          <h3 className="font-heading text-sm font-bold text-foreground">
            Comparador Ludonauta.es
          </h3>
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
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-50"
            title="Actualizar Precios"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          No se encontraron ofertas en tiendas españolas para este título.
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
          {offers.map((offer, idx) => {
            const isStock = offer.stock === "En stock";
            const isPre = offer.stock === "Pre-venta";

            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-4 p-2.5 rounded-xl border bg-muted/10 hover:bg-muted/30 transition-all text-xs"
              >
                {/* Tienda */}
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-foreground leading-tight">{offer.storeName}</span>
                  {/* Badge de Stock */}
                  <span
                    className={`inline-block rounded-full px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider w-fit mt-0.5 ${
                      isStock
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                        : isPre
                        ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                        : "bg-red-500/10 border border-red-500/20 text-red-500"
                    }`}
                  >
                    {offer.stock}
                  </span>
                </div>

                {/* Precio y Enlace */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-heading text-sm font-black text-foreground">
                    {offer.price !== null ? `${offer.price.toFixed(2)}€` : "N/A"}
                  </span>
                  <a
                    href={offer.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-primary hover:text-white transition-all shadow-sm"
                    title="Ir a la tienda"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
