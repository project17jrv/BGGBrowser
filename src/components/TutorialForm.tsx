"use client";

import { useState } from "react";
import { updateGameFinancials } from "@/lib/actions";
import { Save, Video, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface TutorialFormProps {
  bggId: number;
  initialYoutubeUrl: string;
  initialPdfUrl: string;
}

export default function TutorialForm({ bggId, initialYoutubeUrl, initialPdfUrl }: TutorialFormProps) {
  const router = useRouter();
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl || "");
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4">
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

      {/* Input Fields Grid */}
      <div className="grid grid-cols-1 gap-4">
        {/* Videotutorial URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Video size={12} className="text-red-500" />
            <span>Video Tutorial (YouTube URL)</span>
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Ej: https://www.youtube.com/watch?v=..."
            className="w-full rounded-xl border bg-muted/20 px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Manual Rules PDF URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={12} className="text-red-500" />
            <span>Reglas del Juego (PDF URL)</span>
          </label>
          <input
            type="url"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="Ej: https://boardgamegeek.com/filepage/..."
            className="w-full rounded-xl border bg-muted/20 px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
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
            <span>Guardar Enlaces</span>
          </>
        )}
      </button>
    </form>
  );
}
