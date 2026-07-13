"use client";

import { useState, useMemo } from "react";
import { 
  X, Search, Calculator, Link2, DollarSign, 
  AlertCircle, Check, HelpCircle, Loader2, ArrowRight
} from "lucide-react";
import { registerLotPurchase } from "@/lib/actions";

interface GameData {
  id: string;
  name: string;
  spanishName: string | null;
  ludonautaCache: string | null;
  thumbnailUrl: string | null;
}

interface WallapopLotCalculatorProps {
  games: GameData[];
}

interface SelectedGame {
  id: string;
  name: string;
  newPrice: number;
}

// Helper to extract the new price from Ludonauta cache (cheapest option)
function getCheapestNewPrice(ludonautaCache: string | null): number {
  if (!ludonautaCache) return 30; // Default fallback if no cache
  try {
    const cache = JSON.parse(ludonautaCache);
    const offers = cache.offers || [];
    const inStockOffers = offers.filter((o: { stock: string; price: number | null }) => o.stock === "En stock" && o.price !== null);
    if (inStockOffers.length > 0) {
      return Math.min(...inStockOffers.map((o: { price: number }) => o.price));
    }
    const anyOffers = offers.filter((o: { price: number | null }) => o.price !== null);
    if (anyOffers.length > 0) {
      return Math.min(...anyOffers.map((o: { price: number }) => o.price));
    }
  } catch {}
  return 30; // Default fallback
}

export default function WallapopLotCalculator({ games }: WallapopLotCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Form states
  const [wallapopUrl, setWallapopUrl] = useState("");
  const [lotPrice, setLotPrice] = useState<number | "">("");
  const [lotTitle, setLotTitle] = useState("");
  
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Game selection states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGames, setSelectedGames] = useState<SelectedGame[]>([]);

  // Filtered games from database
  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return games.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        (g.spanishName && g.spanishName.toLowerCase().includes(query))
    ).slice(0, 10); // Limit to top 10 results for clean listing
  }, [games, searchQuery]);

  // Wallapop Link Auto-parser
  const handleParseUrl = async () => {
    if (!wallapopUrl.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch(`/api/wallapop/parse?url=${encodeURIComponent(wallapopUrl.trim())}`);
      if (!res.ok) throw new Error("No se pudieron parsear los datos del anuncio.");
      const json = await res.json();
      
      if (json.price) setLotPrice(json.price);
      if (json.title) setLotTitle(json.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el parser.");
    } finally {
      setParsing(false);
    }
  };

  // Toggle game selection
  const handleToggleGame = (game: GameData) => {
    const exists = selectedGames.find((g) => g.id === game.id);
    if (exists) {
      setSelectedGames(selectedGames.filter((g) => g.id !== game.id));
    } else {
      const defaultNewPrice = getCheapestNewPrice(game.ludonautaCache);
      setSelectedGames([
        ...selectedGames,
        { id: game.id, name: game.spanishName || game.name, newPrice: defaultNewPrice }
      ]);
    }
    setSearchQuery(""); // Clear search query to close the floating dropdown
  };

  // Update a single game's reference new price in our local state
  const handleUpdateNewPrice = (id: string, price: number) => {
    setSelectedGames(
      selectedGames.map((g) => (g.id === id ? { ...g, newPrice: Math.max(0, price) } : g))
    );
  };

  // Calculations
  const calculatedLots = useMemo(() => {
    const totalPaid = Number(lotPrice) || 0;
    const totalNewVal = selectedGames.reduce((acc, g) => acc + g.newPrice, 0);
    
    return selectedGames.map((g) => {
      let allocatedPrice = 0;
      let percent = 0;
      if (totalNewVal > 0) {
        percent = (g.newPrice / totalNewVal) * 100;
        allocatedPrice = totalPaid * (g.newPrice / totalNewVal);
      } else if (selectedGames.length > 0) {
        percent = 100 / selectedGames.length;
        allocatedPrice = totalPaid / selectedGames.length;
      }
      return {
        ...g,
        percent,
        allocatedPrice
      };
    });
  }, [selectedGames, lotPrice]);

  const totalCalculated = useMemo(() => {
    return calculatedLots.reduce((acc, g) => acc + g.allocatedPrice, 0);
  }, [calculatedLots]);

  // Save changes
  const handleConfirmSave = async () => {
    if (selectedGames.length === 0) return;
    if (lotPrice === "" || Number(lotPrice) <= 0) {
      setError("Por favor, introduce un precio de compra del lote válido.");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const updates = calculatedLots.map((g) => ({
        id: g.id,
        purchasePrice: parseFloat(g.allocatedPrice.toFixed(2))
      }));
      
      const res = await registerLotPurchase(updates);
      if (res.success) {
        setIsOpen(false);
        // Reset states
        setWallapopUrl("");
        setLotPrice("");
        setLotTitle("");
        setSelectedGames([]);
        setSearchQuery("");
        // Refresh page to fetch latest DB values
        window.location.reload();
      } else {
        throw new Error(res.error || "Error desconocido al guardar.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la compra por lote.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4 py-2.5 shadow-md transition-all cursor-pointer border-none"
      >
        <Calculator size={14} />
        <span>Calcular Compra por Lote</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/65 backdrop-blur-sm animate-fade-in text-foreground">
          
          {/* Modal Card */}
          <div className="relative w-full max-w-2xl bg-card border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-scale-up">
            
            {/* Header */}
            <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                  <Calculator size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-wider">
                    Calculadora de Lotes Wallapop
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Divide el coste de un lote proporcionalmente según el PVP nuevo de los juegos
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl hover:bg-muted text-muted-foreground p-2 transition-all flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {error && (
                <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4 text-xs text-red-500 flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Step 1: Wallapop Link Parsing */}
              <div className="space-y-3.5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-primary">
                  Paso 1: Enlace de Wallapop o Datos del Lote
                </h4>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="Pegar enlace de Wallapop aquí (opcional para auto-rellenar)..."
                      value={wallapopUrl}
                      onChange={(e) => setWallapopUrl(e.target.value)}
                      className="w-full text-xs rounded-xl border bg-muted/20 px-3.5 py-3 pr-8 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 font-medium"
                    />
                    <Link2 size={13} className="absolute right-3.5 top-3.5 text-muted-foreground" />
                  </div>
                  <button
                    type="button"
                    onClick={handleParseUrl}
                    disabled={parsing || !wallapopUrl.trim()}
                    className="rounded-xl bg-secondary hover:bg-muted font-bold text-xs px-4 py-3 border disabled:opacity-50 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    {parsing ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                    <span>Autocompletar</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Título del Anuncio / Nota</label>
                    <input
                      type="text"
                      placeholder="Ej. Lote 3 Juegos de Mesa"
                      value={lotTitle}
                      onChange={(e) => setLotTitle(e.target.value)}
                      className="w-full text-xs rounded-xl border bg-muted/20 px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/40 font-semibold text-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Precio Pagado (€)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={lotPrice}
                        onChange={(e) => setLotPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full text-xs rounded-xl border bg-muted/20 pl-8 pr-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/40 font-black text-foreground"
                      />
                      <DollarSign size={13} className="absolute left-3 top-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Search and Selection */}
              <div className="space-y-3.5 border-t pt-5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-primary">
                  Paso 2: Seleccionar Juegos del Lote
                </h4>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar juegos en tu ludoteca para añadir al lote..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs rounded-xl border bg-muted/20 pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium"
                  />
                  <Search size={13} className="absolute left-3 top-3.5 text-muted-foreground" />

                  {/* Filtered suggestions list - absolutely positioned floating dropdown */}
                  {filteredGames.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border bg-card p-1.5 shadow-xl space-y-0.5 max-h-[180px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                      {filteredGames.map((game) => {
                        const isSelected = selectedGames.some((g) => g.id === game.id);
                        return (
                          <div
                            key={game.id}
                            onClick={() => handleToggleGame(game)}
                            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? "bg-primary/10 text-primary font-bold"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {game.thumbnailUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={game.thumbnailUrl} alt={game.name} className="w-6 h-6 rounded object-cover border bg-muted shrink-0" />
                              )}
                              <span className="truncate">{game.spanishName || game.name}</span>
                            </div>
                            {isSelected && <Check size={12} className="stroke-[3]" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected games table */}
                {selectedGames.length > 0 ? (
                  <div className="rounded-2xl border overflow-hidden bg-muted/5">
                    <div className="bg-muted/20 px-4 py-2 border-b text-[10px] font-black uppercase tracking-wider text-muted-foreground flex justify-between">
                      <span>Juegos seleccionados ({selectedGames.length})</span>
                      <span className="flex items-center gap-1">PVP Nuevo (€) <span title="Precio de venta recomendado / nuevo de referencia" className="cursor-help"><HelpCircle size={10} /></span></span>
                    </div>
                    <div className="divide-y text-xs">
                      {selectedGames.map((game) => (
                        <div key={game.id} className="px-4 py-3 flex items-center justify-between gap-4">
                          <span className="font-bold text-foreground truncate">{game.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min={0}
                              value={game.newPrice}
                              onChange={(e) => handleUpdateNewPrice(game.id, Number(e.target.value))}
                              className="w-16 text-xs text-right font-black rounded-lg border bg-muted/20 px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                            <button
                              onClick={() => setSelectedGames(selectedGames.filter((g) => g.id !== game.id))}
                              className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-500/5 transition-all cursor-pointer"
                              title="Quitar"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-2xl text-xs text-muted-foreground">
                    Usa el buscador de arriba para añadir al menos 2 juegos comprados en este lote.
                  </div>
                )}
              </div>

              {/* Step 3: Calculation Summary */}
              {selectedGames.length > 0 && (
                <div className="space-y-3.5 border-t pt-5">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-primary">
                    Paso 3: Distribución Proporcional de la Compra
                  </h4>
                  
                  <div className="rounded-2xl border overflow-hidden bg-muted/5">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/20 border-b text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-2.5 text-left">Juego</th>
                          <th className="px-4 py-2.5 text-center">PVP Nuevo</th>
                          <th className="px-4 py-2.5 text-center">Proporción</th>
                          <th className="px-4 py-2.5 text-right">Compra Calculada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-semibold text-muted-foreground">
                        {calculatedLots.map((g) => (
                          <tr key={g.id} className="hover:bg-muted/5">
                            <td className="px-4 py-3 text-foreground font-bold truncate max-w-[200px]">{g.name}</td>
                            <td className="px-4 py-3 text-center">{g.newPrice.toFixed(2)}€</td>
                            <td className="px-4 py-3 text-center text-primary font-bold">{g.percent.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-right text-foreground font-black">{g.allocatedPrice.toFixed(2)}€</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/10 font-bold border-t text-foreground">
                          <td className="px-4 py-3">Total Lote</td>
                          <td className="px-4 py-3 text-center" />
                          <td className="px-4 py-3 text-center" />
                          <td className="px-4 py-3 text-right font-black text-primary text-sm">
                            {totalCalculated.toFixed(2)}€
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Actions */}
            <div className="bg-muted/20 px-6 py-4 border-t flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border bg-card hover:bg-secondary text-foreground text-xs font-black uppercase tracking-wider px-4 py-2.5 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={saving || selectedGames.length === 0 || lotPrice === "" || Number(lotPrice) <= 0}
                className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                <span>Confirmar y Guardar Precios</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
