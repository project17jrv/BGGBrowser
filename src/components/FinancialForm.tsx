"use client";

import { useState } from "react";
import { updateGameFinancials } from "@/lib/actions";
import { Save, ShieldAlert } from "lucide-react";

interface FinancialFormProps {
  game: {
    bggId: number;
    status: string;
    purchasePrice: number | null;
    sellPrice: number | null;
    soldPrice: number | null;
    personalRating: number | null;
    physicalState: string | null;
    retentionStatus: string | null;
    played: boolean;
    notes: string | null;
    spanishName: string | null;
    youtubeUrl: string | null;
    pdfUrl: string | null;
  };
  onSaved?: () => void;
}

export default function FinancialForm({ game, onSaved }: FinancialFormProps) {
  const [status, setStatus] = useState(game.status);
  const [purchasePrice, setPurchasePrice] = useState(game.purchasePrice !== null ? String(game.purchasePrice) : "");
  const [sellPrice, setSellPrice] = useState(game.sellPrice !== null ? String(game.sellPrice) : "");
  const [soldPrice, setSoldPrice] = useState(game.soldPrice !== null ? String(game.soldPrice) : "");
  const [personalRating, setPersonalRating] = useState(game.personalRating !== null ? String(game.personalRating) : "");
  const [physicalState, setPhysicalState] = useState(game.physicalState || "");
  const [retentionStatus, setRetentionStatus] = useState(game.retentionStatus || "");
  const [played, setPlayed] = useState(game.played);
  const [notes, setNotes] = useState(game.notes || "");
  const [spanishName, setSpanishName] = useState(game.spanishName || "");
  const [youtubeUrl, setYoutubeUrl] = useState(game.youtubeUrl || "");
  const [pdfUrl, setPdfUrl] = useState(game.pdfUrl || "");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateGameFinancials(game.bggId, {
      status,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      sellPrice: sellPrice ? parseFloat(sellPrice) : null,
      soldPrice: soldPrice ? parseFloat(soldPrice) : null,
      personalRating: personalRating ? parseFloat(personalRating) : null,
      physicalState: physicalState || null,
      retentionStatus: retentionStatus || null,
      played,
      notes: notes || null,
      spanishName: spanishName || null,
      youtubeUrl: youtubeUrl || null,
      pdfUrl: pdfUrl || null,
    });

    setLoading(false);
    if (result.success) {
      setMessage({ type: "success", text: "Información financiera actualizada correctamente." });
      if (onSaved) {
        onSaved();
      }
    } else {
      setMessage({ type: "error", text: `Error al guardar: ${result.error}` });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-card border rounded-2xl p-5 shadow-premium">
      <div className="flex items-center gap-2 border-b pb-3 mb-1">
        <ShieldAlert size={18} className="text-indigo-500" />
        <h3 className="font-heading text-sm font-bold text-foreground">
          Gestión de Colección y Finanzas
        </h3>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-3 text-xs font-semibold ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-red-500/10 border-red-500/20 text-red-500"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Grid de Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre en Español */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Nombre en Español (Opcional)
          </label>
          <input
            type="text"
            value={spanishName}
            onChange={(e) => setSpanishName(e.target.value)}
            placeholder="Ej: Root (Edición Española)"
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Estado en Colección */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Estado de Posesión
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="in_collection">En Colección</option>
            <option value="for_sale">En Venta (Mercadillo)</option>
            <option value="sold">Vendido</option>
            <option value="wishlist">Lista de Deseos</option>
          </select>
        </div>

        {/* Estado Físico */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Estado Físico
          </label>
          <select
            value={physicalState}
            onChange={(e) => setPhysicalState(e.target.value)}
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="">Seleccionar estado...</option>
            <option value="sealed">Precintado (Sealed)</option>
            <option value="like_new">Como Nuevo (Like New)</option>
            <option value="good">Buen Estado (Good)</option>
            <option value="defects">Con Desperfectos (Defects)</option>
          </select>
        </div>

        {/* Precio de Compra */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Precio de Compra (€)
          </label>
          <input
            type="number"
            step="0.01"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Precios de Venta dependientes del estado */}
        {status === "sold" ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Precio Final de Venta (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              placeholder="0.00"
              required
              className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary border-indigo-500/30 transition-all animate-pulse-once"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Precio Objetivo Venta (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        )}

        {/* Prioridad de Retención */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Grado de Retención
          </label>
          <select
            value={retentionStatus}
            onChange={(e) => setRetentionStatus(e.target.value)}
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="">Seleccionar retención...</option>
            <option value="untouchable">Intocable (Colección Permanente)</option>
            <option value="stable">Estable (No urge vender)</option>
            <option value="expendable">Prescindible (Candidato a Purga)</option>
          </select>
        </div>

        {/* Valoración Personal */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Valoración Personal (1-10)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            step="0.5"
            value={personalRating}
            onChange={(e) => setPersonalRating(e.target.value)}
            placeholder="Calificación de 1 a 10"
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Estrenado / Jugado */}
        <div className="flex items-center gap-3 sm:col-span-2 py-1.5 border-t border-b border-dashed my-1">
          <input
            type="checkbox"
            id="played"
            checked={played}
            onChange={(e) => setPlayed(e.target.checked)}
            className="h-4.5 w-4.5 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="played" className="text-xs font-bold text-foreground cursor-pointer select-none">
            ¿Se ha estrenado/jugado alguna partida a este juego?
          </label>
        </div>

        {/* Videotutorial URL */}
        <div className="flex flex-col gap-1.5 sm:col-span-2 border-t border-dashed pt-3">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Video Tutorial (YouTube URL)
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Ej: https://www.youtube.com/watch?v=..."
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Manual Rules PDF URL */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Reglas del Juego (PDF URL)
          </label>
          <input
            type="url"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="Ej: https://boardgamegeek.com/filepage/..."
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Notas y desperfectos
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Comentarios personales, enfundado, componentes faltantes o detalles del comprador..."
            rows={3}
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50"
      >
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <Save size={15} />
            <span>Guardar Cambios</span>
          </>
        )}
      </button>
    </form>
  );
}
