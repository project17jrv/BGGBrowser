"use client";

import { useState } from "react";
import { RefreshCw, Download, Award } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ImportBggPlays() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setStatus({ type: "error", text: "Por favor, introduce tu usuario de BGG." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/plays/import?username=${encodeURIComponent(username.trim())}`, {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({
          type: "success",
          text: `Sincronización completada. Se han importado ${data.count} partidas nuevas.`,
        });
        router.refresh();
      } else {
        setStatus({
          type: "error",
          text: `Error de sincronización: ${data.error || "Respuesta inválida"}`,
        });
      }
    } catch {
      setStatus({ type: "error", text: "Error de conexión con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <Award size={16} className="text-primary" />
        <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
          Importar Partidas desde BoardGameGeek
        </h4>
      </div>

      {status && (
        <div
          className={`rounded-xl border p-3 text-xs font-semibold ${
            status.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-red-500/10 border-red-500/20 text-red-500"
          }`}
        >
          {status.text}
        </div>
      )}

      <form onSubmit={handleImport} className="flex gap-2.5 items-end">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            Usuario de BGG
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuario de BGG"
            required
            className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-secondary hover:bg-primary hover:text-white text-foreground px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm border border-transparent hover:border-primary/20 shrink-0 h-9.5"
        >
          {loading ? (
            <RefreshCw size={13} className="animate-spin" />
          ) : (
            <Download size={13} />
          )}
          <span>Importar</span>
        </button>
      </form>
    </div>
  );
}
