"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { deleteWallapopItem, toggleExcludeWallapopId, autoImportWallapop, updateWallapopItemStatus } from "@/lib/actions";
import LinkedWallapopModal from "./LinkedWallapopModal";
import { Link2, Plus, Trash2, MapPin, Eye, EyeOff, Calculator, Sparkles, Loader2 } from "lucide-react";
import { PreviewButton } from "./PreviewButton";

interface WallapopItem {
  id: string;
  title: string;
  price: number;
  webLink: string;
  location: string | null;
  status: string;
}

interface WallapopWidgetProps {
  gameId: string;
  gameName: string;
  initialItems: WallapopItem[];
  initialExcluded: string; // comma separated IDs
}

export default function WallapopWidget({ gameId, gameName, initialItems, initialExcluded }: WallapopWidgetProps) {
  const router = useRouter();
  const [items, setItems] = useState<WallapopItem[]>(initialItems);
  const [excludedIds, setExcludedIds] = useState<string[]>(
    initialExcluded ? initialExcluded.split(",").filter(Boolean) : []
  );

  const handleCycleStatus = useCallback((itemId: string, currentStatus: string) => {
    const statuses = ["available", "reserved", "sold"];
    const currentIdx = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    
    updateWallapopItemStatus(itemId, nextStatus).then((res) => {
      if (res.success) {
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, status: nextStatus } : item))
        );
        router.refresh();
      }
    }).catch(console.error);
  }, [router]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchMessageType, setSearchMessageType] = useState<"success" | "error" | null>(null);

  const handleAutoSearch = async () => {
    setIsSearching(true);
    setSearchMessage(null);
    setSearchMessageType(null);

    try {
      const res = await autoImportWallapop(gameId);
      if (res.success) {
        setSearchMessageType("success");
        setSearchMessage(res.message || null);
        if (res.count && res.count > 0) {
          setTimeout(() => {
            window.location.reload();
          }, 1800);
        }
      } else {
        setSearchMessageType("error");
        setSearchMessage(res.error || "Error al realizar la búsqueda.");
      }
    } catch {
      setSearchMessageType("error");
      setSearchMessage("Error de conexión al buscar.");
    } finally {
      setIsSearching(false);
    }
  };


  // Compute average price based on non-excluded items
  const activeItems = items.filter((item) => !excludedIds.includes(item.id));
  const averagePrice =
    activeItems.length > 0
      ? activeItems.reduce((sum, item) => sum + item.price, 0) / activeItems.length
      : null;

  const handleToggleExclude = async (itemId: string) => {
    // Toggle in state first for instant UX
    let updatedExcluded: string[];
    if (excludedIds.includes(itemId)) {
      updatedExcluded = excludedIds.filter((id) => id !== itemId);
    } else {
      updatedExcluded = [...excludedIds, itemId];
    }
    setExcludedIds(updatedExcluded);

    // Persist in DB
    const res = await toggleExcludeWallapopId(gameId, itemId);
    if (!res.success) {
      // Revert if error
      setExcludedIds(excludedIds);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este anuncio vinculado?")) return;

    // Filter in state first
    const previousItems = items;
    setItems(items.filter((item) => item.id !== itemId));

    // Persist in DB
    const res = await deleteWallapopItem(itemId);
    if (!res.success) {
      // Revert if error
      setItems(previousItems);
    }
  };

  const handleAdded = () => {
    // We reload page or tell user to refresh. Since it's client, let's refresh page
    window.location.reload();
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4">
      
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b pb-3.5">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-orange-500" />
          <h3 className="font-heading text-sm font-bold text-foreground">
            Mercado Segunda Mano (Wallapop)
          </h3>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAutoSearch}
            disabled={isSearching}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${
              isSearching
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-orange-500/10 hover:bg-orange-500/20 text-orange-600"
            }`}
            title="Buscar y vincular anuncios automáticamente"
          >
            {isSearching ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Sparkles size={11} />
            )}
            <span>{isSearching ? "Buscando..." : "Auto-Buscar"}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isSearching}
            className="flex items-center gap-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <Plus size={11} />
            <span>Vincular</span>
          </button>
        </div>
      </div>

      {searchMessage && (
        <div
          className={`rounded-xl border p-2.5 text-[11px] transition-all leading-relaxed ${
            searchMessageType === "success"
              ? "bg-green-500/5 border-green-500/20 text-green-600 dark:text-green-400"
              : "bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          {searchMessage}
        </div>
      )}

      {/* Average Price Panel */}
      <div className="rounded-xl bg-orange-500/5 border border-orange-500/10 p-3.5 flex items-center justify-between text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-muted-foreground">Precio Medio Calculado</span>
          <span className="text-[9px] text-muted-foreground">
            Muestra el promedio de los anuncios activos ({activeItems.length}/{items.length} anuncios)
          </span>
        </div>
        <span className="font-heading text-lg font-black text-orange-600">
          {averagePrice !== null ? `${averagePrice.toFixed(2)}€` : "N/A"}
        </span>
      </div>

      {/* Listings List */}
      {items.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          No hay anuncios vinculados para este juego. Haz clic en &quot;Vincular&quot; para registrar uno.
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
          {items.map((item) => {
            const isExcluded = excludedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-4 p-2.5 rounded-xl border transition-all text-xs ${
                  item.status === "sold" 
                    ? "bg-red-500/5 border-red-500/20 text-red-500" 
                    : item.status === "reserved"
                    ? "bg-orange-500/5 border-orange-500/20 text-orange-500"
                    : isExcluded 
                    ? "bg-muted/30 border-muted opacity-60" 
                    : "bg-muted/10"
                }`}
              >
                {/* Details */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className={`font-bold leading-tight truncate ${
                    item.status === "sold" 
                      ? "text-red-600 dark:text-red-400" 
                      : item.status === "reserved"
                      ? "text-orange-600 dark:text-orange-400"
                      : isExcluded 
                      ? "line-through text-muted-foreground" 
                      : "text-foreground"
                  }`}>
                    {item.title}
                  </span>
                  
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {/* Price */}
                    <span className={`font-black ${
                      item.status === "sold" 
                        ? "text-red-500" 
                        : item.status === "reserved"
                        ? "text-orange-500"
                        : "text-foreground"
                    }`}>{item.price.toFixed(2)}€</span>
                    {/* Location */}
                    {item.location && (
                      <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground truncate max-w-[120px]">
                        <MapPin size={9} />
                        <span>{item.location}</span>
                      </span>
                    )}
                    {/* Status Badge (Click to Cycle) */}
                    <button
                      type="button"
                      onClick={() => handleCycleStatus(item.id, item.status || "available")}
                      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider cursor-pointer border select-none transition-all hover:scale-105 ${
                        item.status === "sold"
                          ? "bg-red-500/10 border-red-500/20 text-red-500"
                          : item.status === "reserved"
                          ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                      }`}
                      title="Haga clic para cambiar estado (Disponible / Reservado / Vendido)"
                    >
                      {item.status === "sold" ? "🔴 Vendido" : item.status === "reserved" ? "🟠 Reservado" : "🟢 Disponible"}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Preview Button */}
                  <PreviewButton
                    url={item.webLink}
                    label="Wallapop"
                    price={`${item.price.toFixed(2)} €`}
                    badge={item.status === "sold" ? "Vendido" : item.status === "reserved" ? "Reservado" : item.location || undefined}
                    badgeVariant={item.status === "sold" ? "red" : item.status === "reserved" ? "orange" : "green"}
                    accentClass={item.status === "sold" ? "hover:bg-red-500/15 hover:text-red-500" : item.status === "reserved" ? "hover:bg-orange-500/15 hover:text-orange-500" : "hover:bg-green-500/15 hover:text-green-500"}
                  />

                  {/* Exclude Toggle */}
                  <button
                    onClick={() => handleToggleExclude(item.id)}
                    className={`h-7 w-7 flex items-center justify-center rounded-lg border transition-all ${
                      isExcluded
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80 border-transparent"
                    }`}
                    title={isExcluded ? "Incluir en promedio" : "Excluir del promedio"}
                  >
                    {isExcluded ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>

                  {/* Visit Link */}
                  <a
                    href={item.webLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-primary hover:text-white border border-transparent transition-all shadow-sm"
                    title="Ver anuncio en Wallapop"
                  >
                    <Link2 size={12} />
                  </a>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-transparent transition-all"
                    title="Eliminar vinculación"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* LinkedWallapopModal */}
      <LinkedWallapopModal
        gameId={gameId}
        gameName={gameName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdded={handleAdded}
      />
    </div>
  );
}
