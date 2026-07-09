"use client";

import { useState } from "react";
import { createPlaySession, PlaySessionInput } from "@/lib/actions";
import { Plus, Trash2, Save, Calendar, Clock, MapPin, Gamepad2, Award, Sparkles, Search, Dices } from "lucide-react";

interface SimpleGame {
  bggId: number;
  name: string;
  thumbnailUrl: string | null;
}

interface PlayLogFormProps {
  games: SimpleGame[];
  onSaved?: () => void;
}

interface FormPlayer {
  name: string;
  score: string;
  isWinner: boolean;
  faction: string;
  role: string;
}

export default function PlayLogForm({ games, onSaved }: PlayLogFormProps) {
  // Autocomplete state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGame, setSelectedGame] = useState<SimpleGame | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Form states
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [mode, setMode] = useState("competitive");
  const [result, setResult] = useState("win");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [players, setPlayers] = useState<FormPlayer[]>([
    { name: "Yo", score: "", isWinner: false, faction: "", role: "" }
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter games based on search query
  const filteredGames = games.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const handleAddPlayer = () => {
    setPlayers([...players, { name: "", score: "", isWinner: false, faction: "", role: "" }]);
  };

  const handleRemovePlayer = (index: number) => {
    setPlayers(players.filter((_, idx) => idx !== index));
  };

  const handlePlayerChange = (index: number, field: keyof FormPlayer, value: string | boolean) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame && !searchQuery) {
      setMessage({ type: "error", text: "Por favor, selecciona un juego de la lista o introduce su nombre." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const gameName = selectedGame ? selectedGame.name : searchQuery;
    const bggId = selectedGame ? selectedGame.bggId : undefined;
    const gameThumbnail = selectedGame ? selectedGame.thumbnailUrl || undefined : undefined;

    const sessionData: PlaySessionInput = {
      bggId,
      gameName,
      gameThumbnail,
      playedAt: new Date(playedAt),
      location: location || undefined,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
      mode,
      result: mode === "solo" || mode === "cooperative" ? result : undefined,
      notes: notes || undefined,
      rating: rating ? parseFloat(rating) : undefined,
      players: players
        .filter((p) => p.name.trim() !== "")
        .map((p) => ({
          name: p.name,
          score: p.score ? parseInt(p.score, 10) : undefined,
          isWinner: p.isWinner,
          faction: p.faction || undefined,
          role: p.role || undefined,
        })),
    };

    const res = await createPlaySession(sessionData);
    setLoading(false);

    if (res.success) {
      setMessage({ type: "success", text: "¡Partida registrada con éxito!" });
      // Reset form
      setSelectedGame(null);
      setSearchQuery("");
      setLocation("");
      setDurationMinutes("");
      setRating("");
      setNotes("");
      setPlayers([{ name: "Yo", score: "", isWinner: false, faction: "", role: "" }]);
      if (onSaved) {
        onSaved();
      }
    } else {
      setMessage({ type: "error", text: `Error al registrar: ${res.error}` });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-card border rounded-2xl p-5 shadow-premium">
      <div className="flex items-center gap-2 border-b pb-3.5 mb-1">
        <Dices size={18} className="text-primary" />
        <h3 className="font-heading text-sm font-bold text-foreground">
          Registrar Nueva Partida
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

      {/* Selector de Juego */}
      <div className="relative flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Gamepad2 size={10} />
          <span>Juego *</span>
        </label>
        
        {selectedGame ? (
          <div className="flex items-center justify-between rounded-xl border bg-primary/5 border-primary/20 px-3.5 py-2.5 text-xs font-bold text-primary">
            <div className="flex items-center gap-2">
              {selectedGame.thumbnailUrl && (
                <img
                  src={selectedGame.thumbnailUrl}
                  alt={selectedGame.name}
                  className="h-6 w-6 rounded-md object-cover border bg-muted"
                />
              )}
              <span>{selectedGame.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGame(null)}
              className="text-[10px] uppercase font-black hover:text-primary-foreground hover:bg-primary rounded px-2 py-0.5 border border-primary/20 transition-all"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Buscar juego en la estantería..."
              className="w-full rounded-xl border bg-muted/20 pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
            <Search size={13} className="absolute left-3.5 top-3 text-muted-foreground" />
            
            {showDropdown && searchQuery && (
              <div className="absolute top-full left-0 z-10 w-full mt-1.5 rounded-xl border bg-popover text-popover-foreground shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {filteredGames.length > 0 ? (
                  filteredGames.map((game) => (
                    <button
                      key={game.bggId}
                      type="button"
                      onClick={() => {
                        setSelectedGame(game);
                        setShowDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium hover:bg-secondary transition-all"
                    >
                      {game.thumbnailUrl && (
                        <img
                          src={game.thumbnailUrl}
                          alt={game.name}
                          className="h-6 w-6 rounded object-cover border bg-muted"
                        />
                      )}
                      <span>{game.name}</span>
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDropdown(false)}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-secondary"
                  >
                    Usar &quot;{searchQuery}&quot; (Juego fuera del catálogo)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid de campos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Fecha */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar size={10} />
            <span>Fecha de Partida</span>
          </label>
          <input
            type="date"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            required
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Duración */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Clock size={10} />
            <span>Duración (minutos)</span>
          </label>
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="Ej: 60"
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Lugar */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <MapPin size={10} />
            <span>Ubicación</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ej: Casa, Club de Rol"
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Modo de juego */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Gamepad2 size={10} />
            <span>Modo de Juego</span>
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="competitive">Competitivo</option>
            <option value="cooperative">Cooperativo</option>
            <option value="solo">En Solitario (Solo)</option>
            <option value="team">En Equipos</option>
          </select>
        </div>

        {/* Valoración de la sesión */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={10} />
            <span>Valoración Partida (1-10)</span>
          </label>
          <input
            type="number"
            min="1"
            max="10"
            step="0.5"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="Ej: 8.5"
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Resultado (Solo si es Cooperativo o Solo) */}
        {(mode === "solo" || mode === "cooperative") && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Award size={10} />
              <span>Resultado</span>
            </label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary border-primary/20 transition-all"
            >
              <option value="win">Victoria</option>
              <option value="loss">Derrota</option>
              <option value="draw">Empate</option>
              <option value="unfinished">Inacabada</option>
            </select>
          </div>
        )}
      </div>

      {/* Listado Dinámico de Jugadores */}
      <div className="flex flex-col gap-3.5 border-t border-dashed pt-4.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Jugadores y Puntuaciones
          </label>
          <button
            type="button"
            onClick={handleAddPlayer}
            className="flex items-center gap-0.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary hover:text-white text-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all"
          >
            <Plus size={11} />
            <span>Añadir</span>
          </button>
        </div>

        <div className="space-y-3.5">
          {players.map((player, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 p-3.5 rounded-xl border bg-muted/5 border-dashed relative group"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                {/* Nombre */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Nombre</span>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => handlePlayerChange(index, "name", e.target.value)}
                    placeholder="Nombre del jugador"
                    required
                    className="w-full rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs font-medium focus:outline-none"
                  />
                </div>

                {/* Puntuación */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Puntos</span>
                  <input
                    type="number"
                    value={player.score}
                    onChange={(e) => handlePlayerChange(index, "score", e.target.value)}
                    placeholder="Puntos"
                    className="w-full rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs font-medium focus:outline-none"
                  />
                </div>

                {/* Ganador */}
                <div className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    id={`winner-${index}`}
                    checked={player.isWinner}
                    onChange={(e) => handlePlayerChange(index, "isWinner", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor={`winner-${index}`}
                    className="text-[10px] font-bold text-foreground cursor-pointer select-none uppercase tracking-wider"
                  >
                    Ganador
                  </label>
                </div>
              </div>

              {/* Faccion y Rol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Facción / Ejército</span>
                  <input
                    type="text"
                    value={player.faction}
                    onChange={(e) => handlePlayerChange(index, "faction", e.target.value)}
                    placeholder="Ej: Marquesado, Elfos..."
                    className="w-full rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs font-medium focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Rol / Personaje</span>
                  <input
                    type="text"
                    value={player.role}
                    onChange={(e) => handlePlayerChange(index, "role", e.target.value)}
                    placeholder="Ej: Vagabundo, Mago..."
                    className="w-full rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Borrar jugador (solo si hay más de 1) */}
              {players.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemovePlayer(index)}
                  className="absolute right-2 top-2 h-6 w-6 flex items-center justify-center rounded bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  title="Eliminar Jugador"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notas de la partida */}
      <div className="flex flex-col gap-1.5 border-t border-dashed pt-4">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Notas de la Sesión
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Escribe detalles divertidos, estrategias ganadoras o eventos especiales de esta partida..."
          rows={3}
          className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all disabled:opacity-50"
      >
        {loading ? (
          <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <Save size={15} />
            <span>Registrar Partida</span>
          </>
        )}
      </button>
    </form>
  );
}
