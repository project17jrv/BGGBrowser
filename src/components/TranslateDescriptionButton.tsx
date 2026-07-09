"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { translateGameDescription } from "@/lib/actions";
import { Languages, RefreshCw } from "lucide-react";

interface TranslateDescriptionButtonProps {
  bggId: number;
}

export default function TranslateDescriptionButton({ bggId }: TranslateDescriptionButtonProps) {
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleTranslate = async () => {
    setTranslating(true);
    setError(null);
    try {
      const res = await translateGameDescription(bggId);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || "No se pudo traducir la descripción.");
      }
    } catch {
      setError("Error de conexión al traducir.");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 align-start">
      <button
        onClick={handleTranslate}
        disabled={translating}
        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary hover:bg-primary hover:text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 w-fit"
      >
        {translating ? (
          <>
            <RefreshCw size={11} className="animate-spin" />
            <span>Traduciendo...</span>
          </>
        ) : (
          <>
            <Languages size={11} />
            <span>Traducir al Español</span>
          </>
        )}
      </button>
      {error && <span className="text-[9px] font-bold text-red-500">{error}</span>}
    </div>
  );
}
