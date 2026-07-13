"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Download, AlertTriangle, Sparkles, X, Plus } from "lucide-react";

interface BggGame {
  bggId: number;
  name: string;
  yearPublished: number | null;
}

interface BggImportButtonProps {
  query: string;
}

export default function BggImportButton({ query }: BggImportButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<BggGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
    setSearchQuery(query);
    if (query.trim()) {
      performSearch(query);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setResults([]);
    setError(null);
  };

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch(`/api/bgg/search?query=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Error al buscar en BoardGameGeek");
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setError("No se pudieron obtener resultados de BGG. Reintente de nuevo.");
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleImport = async (bggId: number) => {
    setImportingId(bggId);
    setError(null);

    try {
      const res = await fetch("/api/bgg/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bggId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al importar el juego");
      }

      const data = await res.json();
      if (data.gameId) {
        // Redirigir a la ficha local del juego
        router.push(`/game/${data.gameId}`);
      } else {
        throw new Error("No se devolvió ID local para el juego importado");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al importar");
      setImportingId(null);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-premium hover:bg-primary/95 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
      >
        <Sparkles size={14} className="animate-pulse" />
        <span>Buscar e Importar desde BoardGameGeek</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          
          {/* Modal Container */}
          <div className="relative w-full max-w-lg rounded-2xl border bg-card p-6 shadow-premium flex flex-col gap-4 animate-scale-in">
            
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 border-b pb-3 mb-1">
              <Sparkles size={18} className="text-primary" />
              <h3 className="font-heading text-sm font-bold text-foreground">
                Buscar en BoardGameGeek
              </h3>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escribe el nombre del juego..."
                  className="w-full rounded-xl border bg-input py-2 pl-9 pr-4 text-xs text-foreground placeholder-muted-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={searching || importingId !== null}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-55 cursor-pointer"
              >
                Buscar
              </button>
            </form>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-500">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Results Area */}
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 min-h-[150px] justify-center">
              {searching ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span className="text-[11px] font-semibold">Buscando en BGG...</span>
                </div>
              ) : importingId !== null ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground text-center">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">Importando juego</span>
                    <span className="text-[10px] block mt-0.5">Descargando portadas, mecánicas y puntuaciones oficiales de BGG...</span>
                  </div>
                </div>
              ) : results.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {results.map((game) => (
                    <div
                      key={game.bggId}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/10 hover:bg-muted/20 border-transparent transition-all"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-bold text-foreground truncate text-xs">
                          {game.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          BGG ID: {game.bggId} {game.yearPublished ? `• Año: ${game.yearPublished}` : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => handleImport(game.bggId)}
                        className="flex items-center gap-1.5 rounded-lg bg-secondary hover:bg-primary hover:text-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0"
                      >
                        <Download size={11} />
                        <span>Importar</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-muted-foreground text-center">
                  <div className="rounded-xl bg-secondary p-3 text-muted-foreground mb-1.5">
                    <Search size={18} />
                  </div>
                  <span className="text-xs font-bold text-foreground">Sin resultados</span>
                  <span className="text-[10px] max-w-[250px] leading-relaxed">
                    Escribe el nombre del juego y haz clic en Buscar para consultar la base de datos de BGG.
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
