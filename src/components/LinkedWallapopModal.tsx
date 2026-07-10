"use client";

import { useState, useEffect } from "react";
import { linkWallapopItem, searchWallapopRaw } from "@/lib/actions";
import { X, Plus, Link, MapPin, DollarSign, Tag, Search, ExternalLink, ImageOff, Sparkles, Loader2, Truck } from "lucide-react";

interface LinkedWallapopModalProps {
  gameId: string;
  gameName: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

interface WallapopSearchResult {
  title: string;
  price: number;
  location: string;
  imageUrl: string;
  webLink: string;
}

export default function LinkedWallapopModal({ gameId, gameName, isOpen, onClose, onAdded }: LinkedWallapopModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "manual">("search");
  
  // Search tab states
  const [searchQuery, setSearchQuery] = useState(gameName);
  const [searchResults, setSearchResults] = useState<WallapopSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual tab states
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [webLink, setWebLink] = useState("");
  const [location, setLocation] = useState("");
  const [autoUrl, setAutoUrl] = useState("");
  const [parsing, setParsing] = useState(false);

  // General loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-trigger search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(gameName);
      handleSearch(gameName);
    }
  }, [isOpen, gameName]);

  const handleSearch = async (queryToSearch: string) => {
    if (!queryToSearch.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchWallapopRaw(queryToSearch);
      if (res.success && res.items) {
        setSearchResults(res.items);
      } else {
        setSearchError(res.error || "No se pudieron encontrar anuncios.");
      }
    } catch {
      setSearchError("Error de conexión al buscar anuncios.");
    } finally {
      setSearching(false);
    }
  };

  const handleLinkDirect = async (item: { title: string; price: number; webLink: string; location: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await linkWallapopItem(gameId, {
        title: item.title,
        price: item.price,
        webLink: item.webLink,
        location: item.location || undefined,
      });
      
      if (result.success) {
        onClose();
        if (onAdded) {
          onAdded();
        }
      } else {
        setError(result.error || "Error al vincular el anuncio.");
      }
    } catch {
      setError("Error de conexión al vincular el anuncio.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFill = async () => {
    if (!autoUrl) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch(`/api/wallapop/parse?url=${encodeURIComponent(autoUrl)}`);
      const data = await res.json();
      if (res.ok && !data.error) {
        if (data.title) setTitle(data.title);
        if (data.price) setPrice(String(data.price));
        setWebLink(autoUrl);
        setAutoUrl("");
      } else {
        setError(data.error || "No se pudo extraer información del anuncio. Rellénalo a mano.");
      }
    } catch {
      setError("Error de conexión al intentar parsear el anuncio.");
    } finally {
      setParsing(false);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!title || !price || !webLink) {
      setError("Por favor, rellena los campos obligatorios (Título, Precio y Enlace).");
      setLoading(false);
      return;
    }

    const priceVal = parseFloat(price);
    if (isNaN(priceVal)) {
      setError("El precio debe ser un número válido.");
      setLoading(false);
      return;
    }

    const result = await linkWallapopItem(gameId, {
      title,
      price: priceVal,
      webLink,
      location: location || undefined,
    });

    setLoading(false);
    if (result.success) {
      setTitle("");
      setPrice("");
      setWebLink("");
      setLocation("");
      onClose();
      if (onAdded) {
        onAdded();
      }
    } else {
      setError(result.error || "Error al vincular el anuncio");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="w-full max-w-3xl rounded-2xl border bg-card p-6 shadow-premium relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
            <Plus size={16} />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-foreground">
              Vincular Anuncio de Wallapop
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Vincule ofertas activas de segunda mano para calcular estadísticas de precio del juego.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] font-semibold text-red-500 mb-4 shrink-0">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-muted mb-4 shrink-0">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "search"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search size={12} />
            <span>Buscador Integrado</span>
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === "manual"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link size={12} />
            <span>Formulario Manual</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-grow overflow-hidden flex flex-col">
          
          {/* TAB 1: Search Tab */}
          {activeTab === "search" && (
            <div className="flex-grow flex flex-col overflow-hidden gap-4">
              
              {/* Search Bar */}
              <div className="flex gap-2 shrink-0">
                <div className="relative flex-grow">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                    placeholder="Buscar anuncios en Wallapop..."
                    className="w-full rounded-xl border bg-muted/20 pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>
                <button
                  onClick={() => handleSearch(searchQuery)}
                  disabled={searching || !searchQuery.trim()}
                  className="rounded-xl bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {searching ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Search size={12} />
                  )}
                  <span>Buscar</span>
                </button>
              </div>

              {/* Results Container */}
              <div className="flex-grow overflow-y-auto pr-1">
                {searching ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <Loader2 size={32} className="animate-spin text-orange-600" />
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-bold text-foreground">Buscando anuncios en Wallapop...</p>
                      <p className="text-[10px] text-muted-foreground">Esto puede tomar unos segundos mientras consultamos los buscadores.</p>
                    </div>
                  </div>
                ) : searchError ? (
                  <div className="text-center py-12 text-xs text-red-500 font-medium">
                    {searchError}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-muted-foreground gap-1.5">
                    <Sparkles size={24} className="text-orange-500/40" />
                    <p>Introduce un término de búsqueda y pulsa Buscar.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4">
                    {searchResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col rounded-2xl bg-card border border-muted/50 p-2.5 hover:border-orange-500/40 hover:shadow-premium transition-all text-xs group relative cursor-pointer"
                        onClick={() => handleLinkDirect(item)}
                      >
                        {/* Image Container with hover overlay */}
                        <div className="w-full aspect-[4/3] sm:aspect-square rounded-xl overflow-hidden bg-muted relative mb-2.5 border border-muted/40 shrink-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="object-cover h-full w-full group-hover:scale-105 transition-all duration-300"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageOff size={18} className="text-muted-foreground/40" />
                            </div>
                          )}
                          
                          {/* Ver original link overlay */}
                          <a
                            href={item.webLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()} // don't trigger linkDirect
                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm"
                            title="Ver anuncio original en Wallapop"
                          >
                            <ExternalLink size={10} />
                          </a>
                        </div>

                        {/* Info details */}
                        <div className="flex flex-col gap-1.5 min-w-0 px-1 pb-1">
                          
                          {/* Price & Link button row */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm sm:text-base font-extrabold text-foreground font-heading">
                              {item.price.toFixed(2)} €
                            </span>
                            
                            {/* Action button (where heart is in Wallapop) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLinkDirect(item);
                              }}
                              disabled={loading}
                              className="h-7 w-7 flex items-center justify-center rounded-full bg-orange-500/10 text-orange-600 hover:bg-orange-650 hover:text-white transition-all shadow-sm shrink-0 border border-orange-500/20"
                              title="Vincular este anuncio"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* Title */}
                          <span 
                            className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors font-medium leading-snug line-clamp-2 min-h-[2.5rem]" 
                            title={item.title}
                          >
                            {item.title}
                          </span>

                          {/* Delivery Status */}
                          <span className="flex items-center gap-1 text-[9px] text-[#8c4799] font-black mt-1 uppercase tracking-wider shrink-0">
                            <Truck size={12} className="shrink-0" />
                            <span className="truncate">Envío disponible • {item.location}</span>
                          </span>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Manual Tab */}
          {activeTab === "manual" && (
            <form onSubmit={handleSubmitManual} className="flex flex-col gap-4 overflow-y-auto pr-1">
              
              {/* Auto-rellenar desde URL */}
              <div className="flex flex-col gap-1.5 border-b border-dashed pb-3.5 mb-1 bg-muted/10 p-2.5 rounded-xl border">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Link size={10} className="text-orange-500" />
                  <span>Auto-rellenar desde URL de Wallapop</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={autoUrl}
                    onChange={(e) => setAutoUrl(e.target.value)}
                    placeholder="Pega el enlace de Wallapop aquí..."
                    className="flex-grow rounded-xl border bg-card px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    disabled={parsing || !autoUrl}
                    className="rounded-xl bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 shadow-sm"
                  >
                    {parsing ? "Buscando..." : "Importar"}
                  </button>
                </div>
                <p className="text-[8px] text-muted-foreground leading-normal">
                  Pega la URL y pulsa &quot;Importar&quot; para rellenar de forma automática el título, precio y enlace.
                </p>
              </div>

              {/* Título */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Tag size={10} />
                  <span>Título del Anuncio *</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Root - Enfundado, perfecto estado"
                  required
                  className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>

              {/* Precio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <DollarSign size={10} />
                  <span>Precio del Anuncio (€) *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ej: 35.00"
                  required
                  className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>

              {/* Enlace Web */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Link size={10} />
                  <span>Enlace Web de Wallapop *</span>
                </label>
                <input
                  type="url"
                  value={webLink}
                  onChange={(e) => setWebLink(e.target.value)}
                  placeholder="https://es.wallapop.com/item/..."
                  required
                  className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>

              {/* Ubicación / Comentarios */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={10} />
                  <span>Ubicación / Comentarios</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Madrid, envíos habilitados"
                  className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 mt-2 border-t pt-4 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>Vincular Anuncio</span>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
