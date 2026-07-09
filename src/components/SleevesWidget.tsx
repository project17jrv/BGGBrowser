"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, ShieldCheck, AlertCircle, Layers } from "lucide-react";

interface SleeveSize {
  name: string;
  count: number;
  width: number;
  height: number;
  packsNeeded: number;
}

interface SleevesWidgetProps {
  gameId: string;
}

export default function SleevesWidget({ gameId }: SleevesWidgetProps) {
  const [data, setData] = useState<{ lastUpdated: string; sizes: SleeveSize[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSleeves = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/game/${gameId}/sleeves${refresh ? "?refresh=true" : ""}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar las fundas sugeridas.");
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
    fetchSleeves();
  }, [fetchSleeves]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-5 shadow-premium animate-pulse">
        <div className="h-4.5 w-1/3 bg-muted rounded-md mb-4" />
        <div className="space-y-3">
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
          onClick={() => fetchSleeves(true)}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 font-bold hover:bg-red-500/20 transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const sizes = data?.sizes || [];

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4 relative overflow-hidden">
      
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b pb-3.5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500" />
          <h3 className="font-heading text-sm font-bold text-foreground">
            Fundas y Cuidado de Cartas
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          {data?.lastUpdated && (
            <span className="text-[10px] text-muted-foreground font-medium">
              BGG
            </span>
          )}
          <button
            onClick={() => fetchSleeves(true)}
            disabled={refreshing}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-50"
            title="Recargar Fundas"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {sizes.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Layers size={18} className="text-muted-foreground" />
          <span>Este juego no requiere cartas o no tiene medidas de fundas registradas.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sizes.map((sleeve, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-4 p-3 rounded-xl border bg-muted/10 hover:bg-muted/30 transition-all text-xs"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-foreground">{sleeve.name}</span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {sleeve.count} cartas en total ({sleeve.width} x {sleeve.height} mm)
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-flex rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-500">
                  {sleeve.packsNeeded} pqts. (de 50)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
