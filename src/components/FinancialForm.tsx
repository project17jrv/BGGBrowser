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
    purchaseCondition: string | null;
    isInteresting: boolean;
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
  const [purchaseCondition, setPurchaseCondition] = useState(game.purchaseCondition || "");
  const [isInteresting, setIsInteresting] = useState(game.isInteresting);

  const [saving, setSaving] = useState(false);

  const saveChanges = async (updates: Partial<typeof game>) => {
    setSaving(true);
    const merged = {
      status: updates.status !== undefined ? updates.status : status,
      purchasePrice: updates.purchasePrice !== undefined ? updates.purchasePrice : (purchasePrice ? parseFloat(purchasePrice) : null),
      sellPrice: updates.sellPrice !== undefined ? updates.sellPrice : (sellPrice ? parseFloat(sellPrice) : null),
      soldPrice: updates.soldPrice !== undefined ? updates.soldPrice : (soldPrice ? parseFloat(soldPrice) : null),
      personalRating: updates.personalRating !== undefined ? updates.personalRating : (personalRating ? parseFloat(personalRating) : null),
      physicalState: updates.physicalState !== undefined ? updates.physicalState : (physicalState || null),
      retentionStatus: updates.retentionStatus !== undefined ? updates.retentionStatus : (retentionStatus || null),
      played: updates.played !== undefined ? updates.played : played,
      notes: updates.notes !== undefined ? updates.notes : (notes || null),
      spanishName: updates.spanishName !== undefined ? updates.spanishName : (spanishName || null),
      purchaseCondition: updates.purchaseCondition !== undefined ? updates.purchaseCondition : (purchaseCondition || null),
      isInteresting: updates.isInteresting !== undefined ? updates.isInteresting : isInteresting,
    };

    try {
      const result = await updateGameFinancials(game.bggId, merged);
      if (result.success && onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error("Auto-save failed:", err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="flex flex-col gap-5 bg-card border rounded-2xl p-5 shadow-premium">
      <div className="flex items-center justify-between border-b pb-3 mb-1">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-indigo-500" />
          <h3 className="font-heading text-sm font-bold text-foreground">
            Gestión de Colección y Finanzas
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground select-none">
          {saving ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <span className="font-medium text-indigo-500">Guardando...</span>
            </>
          ) : (
            <span className="text-emerald-500 font-bold flex items-center gap-0.5">
              ✓ Autoguardado
            </span>
          )}
        </div>
      </div>

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
            onBlur={(e) => saveChanges({ spanishName: e.target.value || null })}
            placeholder="Ej: Root (Edición Española)"
            className="w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Estado en Colección */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Estado de Posesión
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              saveChanges({ status: e.target.value });
            }}
            className="w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="in_collection">En Colección</option>
            <option value="for_sale">En Venta (Mercadillo)</option>
            <option value="sold">Vendido</option>
            <option value="wishlist">Lista de Deseos (BGG)</option>
          </select>
        </div>

        {/* Seguimiento de Precios (Interesante) */}
        <div className="flex items-center gap-2.5 rounded-xl border bg-muted/10 p-3 transition-all">
          <input
            id="isInteresting"
            type="checkbox"
            checked={isInteresting}
            onChange={(e) => {
              setIsInteresting(e.target.checked);
              saveChanges({ isInteresting: e.target.checked });
            }}
            className="h-4.5 w-4.5 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
          />
          <div className="flex flex-col">
            <label htmlFor="isInteresting" className="text-xs font-black text-foreground cursor-pointer select-none">
              Seguimiento de Precios (Interesante)
            </label>
            <span className="text-[10px] text-muted-foreground select-none leading-normal">
              Seguir en Wallapop e histórico de ofertas
            </span>
          </div>
        </div>

        {/* Condición de Compra - ¿Nuevo o Segunda Mano? */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Adquisición
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPurchaseCondition("new");
                saveChanges({ purchaseCondition: "new" });
              }}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                purchaseCondition === "new"
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                  : "border hover:border-emerald-500/50 hover:text-emerald-600"
              }`}
            >
              🏷️ Nuevo
            </button>
            <button
              type="button"
              onClick={() => {
                setPurchaseCondition("second_hand");
                saveChanges({ purchaseCondition: "second_hand" });
              }}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                purchaseCondition === "second_hand"
                  ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                  : "border hover:border-amber-500/50 hover:text-amber-600"
              }`}
            >
              ♻️ Segunda Mano
            </button>
          </div>
          {purchaseCondition && (
            <button
              type="button"
              onClick={() => {
                setPurchaseCondition("");
                saveChanges({ purchaseCondition: null });
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground self-start transition-colors cursor-pointer"
            >
              Limpiar selección
            </button>
          )}
        </div>

        {/* Estado Físico */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Estado Físico
          </label>
          <select
            value={physicalState}
            onChange={(e) => {
              setPhysicalState(e.target.value);
              saveChanges({ physicalState: e.target.value || null });
            }}
            className="w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
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
            onBlur={(e) => saveChanges({ purchasePrice: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="0.00"
            className="w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
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
              onBlur={(e) => saveChanges({ soldPrice: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="0.00"
              required
              className="w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary border-indigo-500/30 transition-all animate-pulse-once"
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
              onBlur={(e) => saveChanges({ sellPrice: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="0.00"
              className="w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
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
            onChange={(e) => {
              setRetentionStatus(e.target.value);
              saveChanges({ retentionStatus: e.target.value || null });
            }}
            className="w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
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
            onBlur={(e) => saveChanges({ personalRating: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="Calificación de 1 a 10"
            className="w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Estrenado / Jugado */}
        <div className="flex items-center gap-3 sm:col-span-2 py-1.5 border-t border-b border-dashed my-1">
          <input
            type="checkbox"
            id="played"
            checked={played}
            onChange={(e) => {
              setPlayed(e.target.checked);
              saveChanges({ played: e.target.checked });
            }}
            className="h-4.5 w-4.5 rounded cursor-pointer"
          />
          <label htmlFor="played" className="text-xs font-bold text-foreground cursor-pointer select-none">
            ¿Se ha estrenado/jugado alguna partida a este juego?
          </label>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Notas y desperfectos
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={(e) => saveChanges({ notes: e.target.value || null })}
            placeholder="Comentarios personales, enfundado, componentes faltantes o detalles del comprador..."
            rows={3}
            className="w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}
