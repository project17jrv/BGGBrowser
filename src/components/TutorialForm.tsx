"use client";

import { useState } from "react";
import { updateGameFinancials } from "@/lib/actions";
import { Save, Video, FileText, CheckCircle2, AlertCircle, Search, X, Play, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface TutorialFormProps {
  bggId: number;
  gameName: string;
  initialYoutubeUrl: string;
  initialPdfUrl: string;
}

export default function TutorialForm({ bggId, gameName, initialYoutubeUrl, initialPdfUrl }: TutorialFormProps) {
  const router = useRouter();
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl || "");
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // YouTube Search States
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState(`${gameName} tutorial`);
  const [searchResults, setSearchResults] = useState<{ id: string; title: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateGameFinancials(bggId, {
      youtubeUrl: youtubeUrl || null,
      pdfUrl: pdfUrl || null,
    });

    setLoading(false);
    if (result.success) {
      setMessage({ type: "success", text: "Enlaces del tutorial actualizados correctamente." });
      router.refresh();
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: `Error al guardar: ${result.error}` });
    }
  };

  const handleYoutubeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const res = await fetch(`/api/collection/game/details/review-video?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar los resultados de búsqueda.");
      }
      const data = await res.json();
      setSearchResults(data.videos || []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Error al conectar.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectVideo = (videoId: string) => {
    setYoutubeUrl(`https://www.youtube.com/watch?v=${videoId}`);
    setShowSearch(false);
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4 relative">
      {/* Title */}
      <div className="flex items-center gap-2 border-b pb-3.5">
        <Video size={16} className="text-amber-500" />
        <h3 className="font-heading text-xs font-black uppercase tracking-wider text-foreground">
          Configuración de Recursos Manuales
        </h3>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-3 text-xs font-semibold flex items-center gap-2 animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Input Fields Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* Videotutorial URL */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Video size={12} className="text-red-500" />
                <span>Video Tutorial (YouTube URL)</span>
              </label>
              
              <button
                type="button"
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (!showSearch && searchResults.length === 0) {
                    // Auto trigger search on first open
                    setTimeout(() => {
                      const btn = document.getElementById("yt-search-submit");
                      if (btn) btn.click();
                    }, 50);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] px-2.5 py-1 transition-all"
              >
                <Search size={10} />
                <span>{showSearch ? "Cerrar Buscador" : "Buscar en YouTube"}</span>
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Ej: https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border bg-muted/20 pl-3 pr-8 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {youtubeUrl && (
                <button
                  type="button"
                  onClick={() => setYoutubeUrl("")}
                  className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* YouTube Search Panel (Collapsible) */}
          {showSearch && (
            <div className="rounded-xl border border-dashed bg-muted/5 p-4 flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center gap-2 border-b pb-2">
                <Sparkles size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">Buscador de Videotutoriales</span>
              </div>

              {/* Search Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tutorial..."
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  id="yt-search-submit"
                  type="button"
                  onClick={(e) => handleYoutubeSearch(e)}
                  disabled={searching}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/95 transition-all disabled:opacity-50"
                >
                  {searching ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  ) : (
                    <span>Buscar</span>
                  )}
                </button>
              </div>

              {searchError && (
                <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                  <AlertCircle size={10} />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Results Carousel */}
              {searchResults.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none max-h-[145px]">
                  {searchResults.map((vid) => {
                    const thumbUrl = `https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`;
                    return (
                      <div
                        key={vid.id}
                        onClick={() => handleSelectVideo(vid.id)}
                        className="min-w-[130px] w-[130px] flex flex-col gap-1.5 cursor-pointer group bg-card border rounded-lg p-1.5 hover:border-primary transition-all shadow-sm"
                      >
                        <div className="relative aspect-video rounded overflow-hidden bg-muted">
                          <img
                            src={thumbUrl}
                            alt={vid.title}
                            className="object-cover h-full w-full group-hover:scale-102 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="rounded-full bg-white/90 p-1.5 shadow-md">
                              <Play size={10} className="text-black fill-black" />
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {vid.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !searching && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">
                    Escribe tu término de búsqueda y haz clic en Buscar.
                  </p>
                )
              )}
            </div>
          )}

          {/* Manual Rules PDF URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={12} className="text-red-500" />
              <span>Reglas del Juego (PDF URL)</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="url"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="Ej: https://boardgamegeek.com/filepage/..."
                className="w-full rounded-xl border bg-muted/20 pl-3 pr-8 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {pdfUrl && (
                <button
                  type="button"
                  onClick={() => setPdfUrl("")}
                  className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Save size={14} />
              <span>Guardar Recursos</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
