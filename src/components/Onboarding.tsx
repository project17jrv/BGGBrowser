"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dices, RefreshCw, Layers } from "lucide-react";

export default function Onboarding() {
  const router = useRouter();
  const [username, setUsername] = useState("boardgamegeek");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSync = async (e: React.FormEvent, customUser?: string) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const targetUser = customUser || username;

    try {
      const response = await fetch(`/api/admin/sync?username=${encodeURIComponent(targetUser)}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Sync trigger failed: ${response.statusText}`);
      }

      // Since the API runs the sync in the background (POST returns 202), we poll the database or wait a bit.
      // For mock seeding, it takes about 3 seconds. Let's wait 3.5s and refresh the page!
      setSuccess("Sincronización iniciada... Se están importando y cargando los juegos en segundo plano.");
      
      setTimeout(() => {
        router.refresh();
      }, 3500);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ocurrió un error al iniciar la sincronización.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-premium transition-all duration-300">
        
        {/* Animated Icon Header */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-400 text-white shadow-premium animate-pulse">
          <Dices size={30} className="stroke-[2.5]" />
        </div>

        <h1 className="mt-6 font-heading text-2xl font-bold tracking-tight text-foreground">
          BGG Explorer
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          ¡Bienvenido! Aún no hay juegos en tu base de datos local. Sincroniza desde BoardGameGeek o carga la demo para comenzar.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500 text-left">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-500 text-left">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-4">
          
          {/* Seeding Button */}
          <button
            onClick={(e) => handleSync(e, "demo_fallback")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-premium transition-all duration-300 hover:bg-primary/95 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Layers size={16} />
            )}
            <span>Cargar Colección Demo (Instante)</span>
          </button>

          {/* Separator */}
          <div className="flex items-center justify-center my-1">
            <span className="h-px w-full bg-border" />
            <span className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">o</span>
            <span className="h-px w-full bg-border" />
          </div>

          {/* Form sync */}
          <form onSubmit={handleSync} className="flex flex-col gap-3 text-left">
            <div className="flex flex-col gap-1">
              <label htmlFor="bgg-user" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Usuario de BoardGameGeek
              </label>
              <input
                id="bgg-user"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border bg-input px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
                placeholder="Nombre de usuario de BGG"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition-all duration-300 hover:bg-secondary hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={14} />
              ) : (
                <RefreshCw size={14} />
              )}
              <span>Sincronizar desde BGG</span>
            </button>
          </form>

        </div>
        
        {/* Footnote on token requirement */}
        <p className="mt-6 text-[10px] text-muted-foreground/80 leading-normal">
          Nota: Para la sincronización directa de BGG, asegúrate de configurar tu <code className="bg-muted px-1 py-0.5 rounded font-mono text-[9px]">BGG_API_KEY</code> en las variables de entorno.
        </p>

      </div>
    </div>
  );
}
