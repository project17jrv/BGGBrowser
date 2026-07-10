"use client";

import { useState, useRef } from "react";
import { updateGameFinancials } from "@/lib/actions";
import { 
  Save, Video, FileText, CheckCircle2, AlertCircle, 
  Search, X, Play, Sparkles, Upload, FileDown, Globe,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";

interface TutorialFormProps {
  bggId: number;
  gameName: string;
  initialYoutubeUrl: string;
  initialPdfUrl: string;
}

interface BggFile {
  filepageid: string;
  fileid: string;
  filename: string;
  size: string;
  title: string;
  description: { rendered: string };
  language: string;
  languageid: string;
  href: string;
}

export default function TutorialForm({ bggId, gameName, initialYoutubeUrl, initialPdfUrl }: TutorialFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core URL states
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

  // BGG Files Search States
  const [showBggSearch, setShowBggSearch] = useState(false);
  const [bggFiles, setBggFiles] = useState<BggFile[]>([]);
  const [bggSearching, setBggSearching] = useState(false);
  const [bggSearchError, setBggSearchError] = useState<string | null>(null);
  const [bggLanguage, setBggLanguage] = useState("2203"); // 2203 = Spanish, 2184 = English, "" = All
  const [bggPage, setBggPage] = useState(1);
  const [bggTotalPages, setBggTotalPages] = useState(1);

  // Local Upload States
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Format bytes helper
  const formatBytes = (bytesStr: string | number, decimals = 1) => {
    const bytes = typeof bytesStr === "string" ? parseInt(bytesStr, 10) : bytesStr;
    if (isNaN(bytes) || bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

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
      setMessage({ type: "success", text: "Recursos de aprendizaje actualizados correctamente." });
      router.refresh();
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: `Error al guardar: ${result.error}` });
    }
  };

  // YouTube search logic
  const handleYoutubeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const res = await fetch(`/api/collection/game/details/review-video?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("No se pudieron cargar los resultados de búsqueda.");
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

  // BGG files search logic
  const handleBggFilesSearch = async (page = 1) => {
    setBggSearching(true);
    setBggSearchError(null);
    try {
      const res = await fetch(
        `/api/collection/game/details/bgg-files?bggId=${bggId}&languageid=${bggLanguage}&pageid=${page}`
      );
      if (!res.ok) throw new Error("Error al obtener archivos de BGG.");
      const data = await res.json();
      setBggFiles(data.files || []);
      setBggPage(page);
      if (data.config) {
        setBggTotalPages(data.config.endpage || 1);
      }
    } catch (err) {
      setBggSearchError(err instanceof Error ? err.message : "Error de red al consultar BGG.");
    } finally {
      setBggSearching(false);
    }
  };

  // Trigger search on toggle
  const toggleBggSearch = () => {
    const nextState = !showBggSearch;
    setShowBggSearch(nextState);
    if (nextState && bggFiles.length === 0) {
      handleBggFilesSearch(1);
    }
  };

  // Local file upload logic
  const uploadFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bggId", bggId.toString());

    try {
      const res = await fetch("/api/collection/game/details/manual/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al subir el reglamento.");
      }

      const data = await res.json();
      if (data.success && data.pdfUrl) {
        setPdfUrl(data.pdfUrl);
        setMessage({ type: "success", text: "Reglamento subido y guardado localmente." });
        router.refresh();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al subir.");
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4 relative">
      {/* Title */}
      <div className="flex items-center gap-2 border-b pb-3.5">
        <Video size={16} className="text-amber-500" />
        <h3 className="font-heading text-xs font-black uppercase tracking-wider text-foreground">
          Configuración de Recursos de Aprendizaje
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {/* 1. Videotutorial URL Section */}
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

          {/* YouTube Search Panel (Collapsible) */}
          {showSearch && (
            <div className="rounded-xl border border-dashed bg-muted/5 p-4 flex flex-col gap-3 animate-fade-in mt-1">
              <div className="flex items-center gap-2 border-b pb-2">
                <Sparkles size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">Buscador de Videotutoriales</span>
              </div>

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
        </div>

        {/* 2. Manual / Rules PDF Section */}
        <div className="flex flex-col gap-2 border-t pt-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={12} className="text-blue-500" />
              <span>Reglas del Juego (Manual PDF)</span>
            </label>
            
            <button
              type="button"
              onClick={toggleBggSearch}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] px-2.5 py-1 transition-all"
            >
              <Search size={10} />
              <span>{showBggSearch ? "Cerrar Buscador" : "Buscar en BGG"}</span>
            </button>
          </div>

          {/* URL Input (Alternative/Manual entry) */}
          <div className="relative flex items-center">
            <input
              type="text"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              placeholder="Ej: /manuals/123_reglas.pdf o URL externa de Drive/BGG"
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

          {/* Local Upload Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
              dragActive 
                ? "border-primary bg-primary/5 scale-[1.01]" 
                : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/5"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
            />
            
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-xs font-semibold text-muted-foreground">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Subiendo reglamento...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-1.5">
                <Upload size={20} className="text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">
                  Arrastra tu manual PDF aquí
                </span>
                <span className="text-[10px] text-muted-foreground">
                  O haz clic para seleccionarlo del ordenador (se guardará offline en tu servidor)
                </span>
              </div>
            )}
            
            {uploadError && (
              <span className="text-[10px] text-red-500 font-bold text-center mt-1">
                {uploadError}
              </span>
            )}

            {pdfUrl && pdfUrl.startsWith("/manuals/") && (
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 size={9} />
                <span>Manual Guardado Localmente</span>
              </div>
            )}
          </div>

          {/* BGG Files Search Collapsible Panel */}
          {showBggSearch && (
            <div className="rounded-xl border border-dashed bg-muted/5 p-4 flex flex-col gap-3.5 animate-fade-in mt-1">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Globe size={12} className="text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">
                    Reglamentos Oficiales de la Comunidad en BGG
                  </span>
                </div>
                
                {/* Language Select */}
                <select
                  value={bggLanguage}
                  onChange={(e) => {
                    setBggLanguage(e.target.value);
                    // Trigger search with new language
                    setTimeout(() => handleBggFilesSearch(1), 50);
                  }}
                  className="rounded-lg border bg-background px-2 py-1 text-[10px] font-bold focus:outline-none"
                >
                  <option value="2203">Español 🇪🇸</option>
                  <option value="2184">Inglés 🇬🇧</option>
                  <option value="">Cualquier Idioma 🌐</option>
                </select>
              </div>

              {bggSearching ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-[10px] text-muted-foreground">Consultando base de datos de BGG...</span>
                </div>
              ) : bggSearchError ? (
                <div className="text-[10px] text-red-500 font-semibold flex items-center justify-center gap-1.5 py-2">
                  <AlertCircle size={12} />
                  <span>{bggSearchError}</span>
                </div>
              ) : bggFiles.length > 0 ? (
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
                    {bggFiles.map((file) => (
                      <div 
                        key={file.fileid} 
                        className="rounded-lg border bg-card/50 p-3 hover:border-primary/30 transition-all flex flex-col gap-2"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-foreground leading-tight">
                              {file.title || file.filename}
                            </span>
                            <span className="text-[9px] text-muted-foreground mt-0.5">
                              Archivo: {file.filename} | Tamaño: {formatBytes(file.size)}
                            </span>
                          </div>

                          <a
                            href={`https://boardgamegeek.com/filepage/${file.filepageid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-black text-[9px] px-2.5 py-1.5 transition-all flex items-center gap-1"
                          >
                            <FileDown size={10} />
                            <span>Descargar</span>
                          </a>
                        </div>
                        
                        {file.description?.rendered && (
                          <p 
                            className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2 border-t pt-1.5"
                            dangerouslySetInnerHTML={{ __html: file.description.rendered }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Note block */}
                  <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-2.5 text-[9px] text-blue-600 dark:text-blue-400 leading-normal flex items-start gap-2">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    <span>
                      <strong>Instrucciones:</strong> BGG requiere iniciar sesión para descargar. Haz clic en <strong>Descargar</strong> para ir a la página de BGG en tu navegador, guarda el archivo en tu ordenador y luego <strong>arrástralo aquí arriba</strong> para que quede guardado de forma permanente sin necesidad de cuenta.
                    </span>
                  </div>

                  {/* Pagination */}
                  {bggTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t pt-2.5">
                      <span className="text-[9px] text-muted-foreground">
                        Página {bggPage} de {bggTotalPages}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={bggPage <= 1}
                          onClick={() => handleBggFilesSearch(bggPage - 1)}
                          className="p-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-30 transition-all"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={bggPage >= bggTotalPages}
                          onClick={() => handleBggFilesSearch(bggPage + 1)}
                          className="p-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-30 transition-all"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-4">
                  No se encontraron archivos en este idioma para este juego en BGG.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50"
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
