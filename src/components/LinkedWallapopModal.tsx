"use client";

import { useState } from "react";
import { linkWallapopItem } from "@/lib/actions";
import { X, Plus, Link, MapPin, DollarSign, Tag } from "lucide-react";

interface LinkedWallapopModalProps {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

export default function LinkedWallapopModal({ gameId, isOpen, onClose, onAdded }: LinkedWallapopModalProps) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [webLink, setWebLink] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [autoUrl, setAutoUrl] = useState("");
  const [parsing, setParsing] = useState(false);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Clear form
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-premium relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plus size={16} />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-foreground">
              Vincular Anuncio de Wallapop
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Registra manualmente un anuncio de segunda mano para calcular precios medios.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] font-semibold text-red-500 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Auto-rellenar desde URL */}
          <div className="flex flex-col gap-1.5 border-b border-dashed pb-3.5 mb-1 bg-muted/10 p-2.5 rounded-xl border">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Link size={10} className="text-primary" />
              <span>Auto-rellenar desde URL de Wallapop</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={autoUrl}
                onChange={(e) => setAutoUrl(e.target.value)}
                placeholder="Pega el enlace de Wallapop aquí..."
                className="flex-grow rounded-xl border bg-card px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={parsing || !autoUrl}
                className="rounded-xl bg-primary hover:bg-primary/95 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 shadow-sm"
              >
                {parsing ? "Buscando..." : "Importar"}
              </button>
            </div>
            <p className="text-[8px] text-muted-foreground leading-normal leading-relaxed">
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
              className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
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
              className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
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
              className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
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
              className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 mt-2 border-t pt-4">
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
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span>Vincular Anuncio</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
