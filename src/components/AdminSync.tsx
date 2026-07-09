"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearDatabase } from "@/lib/actions";
import { RefreshCw, Trash2, Database, Layers, CheckCircle2, AlertTriangle, Play, Trophy } from "lucide-react";

interface AdminSyncProps {
  stats: {
    games: number;
    ownedGames: number;
    categories: number;
    mechanics: number;
    designers: number;
    publishers: number;
  };
  recentGames: Array<{
    id: string;
    name: string;
    bggId: number;
    rank: number | null;
    averageRating: number | null;
  }>;
  defaultUsername: string;
}

export default function AdminSync({ stats, recentGames, defaultUsername }: AdminSyncProps) {
  const router = useRouter();
  const [username, setUsername] = useState(defaultUsername);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingSyncRanking, setLoadingSyncRanking] = useState(false);
  const [loadingForceReSync, setLoadingForceReSync] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSync = async (e: React.FormEvent, customUser?: string) => {
    e.preventDefault();
    setLoadingSync(true);
    setError("");
    setMessage("");

    const targetUser = customUser || username;

    try {
      const response = await fetch(`/api/admin/sync?username=${encodeURIComponent(targetUser)}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Sync trigger failed: ${response.statusText}`);
      }

      setMessage(
        `Sincronización iniciada en segundo plano para el usuario "${targetUser}".`
      );
      
      // Auto-refresh stats after a few seconds
      setTimeout(() => {
        router.refresh();
        setLoadingSync(false);
      }, 4000);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ocurrió un error al iniciar la sincronización.");
      setLoadingSync(false);
    }
  };

  const handleSyncRanking = async () => {
    setLoadingSyncRanking(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/sync?type=ranking`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Sync trigger failed: ${response.statusText}`);
      }

      setMessage(
        "Sincronización del ranking Top 250 iniciada en segundo plano."
      );
      
      // Auto-refresh stats after a few seconds
      setTimeout(() => {
        router.refresh();
        setLoadingSyncRanking(false);
      }, 5000);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ocurrió un error al iniciar la sincronización.");
      setLoadingSyncRanking(false);
    }
  };

  const handleForceReSync = async () => {
    setLoadingForceReSync(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/sync?type=force-re-sync`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Sync trigger failed: ${response.statusText}`);
      }

      setMessage(
        "Re-sincronización forzada de todos los juegos iniciada en segundo plano. Esto descargará las portadas reales."
      );
      
      // Auto-refresh stats after a few seconds
      setTimeout(() => {
        router.refresh();
        setLoadingForceReSync(false);
      }, 5000);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ocurrió un error al iniciar la re-sincronización.");
      setLoadingForceReSync(false);
    }
  };

  const handleClearDb = async () => {
    if (!confirm("¿Estás absolutamente seguro de vaciar la base de datos? Esto eliminará todos los juegos y relaciones.")) {
      return;
    }

    setLoadingClear(true);
    setError("");
    setMessage("");

    try {
      const result = await clearDatabase();
      if (result.success) {
        setMessage("Base de datos vaciada con éxito.");
        router.refresh();
      } else {
        throw new Error(result.error || "Error desconocido");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ocurrió un error al vaciar la base de datos.");
    } finally {
      setLoadingClear(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      
      {/* Col 1 & 2: Controls & Stats */}
      <div className="md:col-span-2 flex flex-col gap-6">
        
        {/* Sync Trigger Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-premium transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={18} className="text-primary" />
            <h2 className="font-heading text-base font-bold text-foreground">Sincronizador BGG</h2>
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed mb-5">
            Introduce el nombre de usuario de BoardGameGeek para iniciar la importación. Se consultará la API de BGG y se actualizará o insertará cada juego en tu catálogo local en segundo plano.
          </p>

          <form onSubmit={handleSync} className="flex flex-wrap gap-3 items-end max-w-lg">
            <div className="flex-1 min-w-[200px] flex flex-col gap-1">
              <label htmlFor="admin-bgg-user" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Usuario de BGG (Colección)
              </label>
              <input
                id="admin-bgg-user"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loadingSync || loadingSyncRanking || loadingForceReSync}
                className="w-full rounded-xl border bg-input px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
                placeholder="Nombre de usuario"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loadingSync || loadingSyncRanking || loadingForceReSync || loadingClear}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-premium transition-all duration-300 hover:bg-primary/95 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                {loadingSync ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
                <span>Sincronizar</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleSync(e, "demo_fallback")}
                disabled={loadingSync || loadingSyncRanking || loadingForceReSync || loadingClear}
                className="flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-2 text-xs font-bold text-foreground transition-all duration-300 hover:bg-secondary hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                <span>Cargar Demo</span>
              </button>
            </div>
          </form>

          {/* Sync Ranking BGG Section */}
          <div className="border-t border-dashed pt-5 mt-5">
            <h3 className="font-heading text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
              Sincronizar Ranking Top 250 BGG
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              Descarga e importa los detalles de los 250 mejores juegos de mesa del ranking global de BoardGameGeek desde un dataset histórico actualizado.
            </p>
            <button
              type="button"
              onClick={handleSyncRanking}
              disabled={loadingSync || loadingSyncRanking || loadingForceReSync || loadingClear}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-premium transition-all duration-300 hover:bg-indigo-750 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {loadingSyncRanking ? <RefreshCw className="animate-spin" size={14} /> : <Trophy size={14} />}
              <span>Sincronizar Top 250 BGG</span>
            </button>
          </div>

          {/* Force Re-Sync BGG Section */}
          <div className="border-t border-dashed pt-5 mt-5">
            <h3 className="font-heading text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
              Corregir Imágenes y Datos (Forzar Re-sincronización)
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
              ¿Se cargaron imágenes falsas de la demo? Utiliza esta opción para consultar la API de BGG y re-descargar todas las portadas e información reales para todos los juegos de la base de datos (se mantendrá tu colección intacta).
            </p>
            <button
              type="button"
              onClick={handleForceReSync}
              disabled={loadingSync || loadingSyncRanking || loadingForceReSync || loadingClear}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-premium transition-all duration-300 hover:bg-amber-705 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {loadingForceReSync ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              <span>Forzar Actualización desde BGG</span>
            </button>
          </div>

          {message && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-500">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Database Stats Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-premium transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Database size={18} className="text-primary" />
            <h2 className="font-heading text-base font-bold text-foreground">Estado de Persistencia (SQLite)</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            
            {/* Games Stat */}
            <div className="rounded-xl border bg-muted/20 p-4 text-center">
              <Layers size={18} className="mx-auto text-primary mb-1.5" />
              <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Juegos</span>
              <span className="text-sm font-black text-foreground mt-1 block">
                {stats.games} <span className="block text-[10px] font-normal text-muted-foreground">({stats.ownedGames} en colec.)</span>
              </span>
            </div>

            {/* Categories Stat */}
            <div className="rounded-xl border bg-muted/20 p-4 text-center">
              <Layers size={18} className="mx-auto text-emerald-500 mb-1.5" />
              <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Categorías</span>
              <span className="text-xl font-black text-foreground mt-1 block">{stats.categories}</span>
            </div>

            {/* Mechanics Stat */}
            <div className="rounded-xl border bg-muted/20 p-4 text-center">
              <Layers size={18} className="mx-auto text-sky-500 mb-1.5" />
              <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Mecánicas</span>
              <span className="text-xl font-black text-foreground mt-1 block">{stats.mechanics}</span>
            </div>

            {/* Designers Stat */}
            <div className="rounded-xl border bg-muted/20 p-4 text-center">
              <Layers size={18} className="mx-auto text-purple-500 mb-1.5" />
              <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Diseñadores</span>
              <span className="text-xl font-black text-foreground mt-1 block">{stats.designers}</span>
            </div>

            {/* Publishers Stat */}
            <div className="rounded-xl border bg-muted/20 p-4 text-center">
              <Layers size={18} className="mx-auto text-pink-500 mb-1.5" />
              <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Editoriales</span>
              <span className="text-xl font-black text-foreground mt-1 block">{stats.publishers}</span>
            </div>

          </div>

          <div className="mt-6 flex justify-end border-t pt-5">
            <button
              onClick={handleClearDb}
              disabled={loadingClear || loadingSync}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs font-bold text-red-500 transition-all duration-300 hover:bg-red-500 hover:text-white hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {loadingClear ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
              <span>Vaciar Base de Datos</span>
            </button>
          </div>
        </div>

      </div>

      {/* Col 3: Recently Imported List */}
      <div className="md:col-span-1 rounded-2xl border bg-card p-6 shadow-premium transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={18} className="text-primary" />
          <h2 className="font-heading text-base font-bold text-foreground">Sincronizados Recientes</h2>
        </div>

        {recentGames.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentGames.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between border-b pb-2.5 last:border-0 last:pb-0 text-xs"
              >
                <div>
                  <p className="font-bold text-foreground line-clamp-1">{g.name}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">BGG ID: {g.bggId}</p>
                </div>
                <div className="text-right font-semibold">
                  <p className="text-foreground">★ {g.averageRating ? g.averageRating.toFixed(1) : "N/A"}</p>
                  <p className="text-[10px] text-muted-foreground">Rank #{g.rank || "N/A"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic text-center py-8">
            No hay juegos registrados en la base de datos local.
          </p>
        )}
      </div>

    </div>
  );
}
