"use client";

import { useState } from "react";
import { FileText, X, Maximize2, ExternalLink } from "lucide-react";

interface ManualViewerProps {
  pdfUrl: string;
}

export default function ManualViewer({ pdfUrl }: ManualViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border bg-card p-5 shadow-premium flex items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-500/10 p-2.5 text-red-500 shrink-0">
            <FileText size={18} />
          </div>
          <div className="flex flex-col">
            <h4 className="font-heading text-xs font-bold text-foreground">Reglas Oficiales en PDF</h4>
            <p className="text-[10px] text-muted-foreground">Instrucciones de juego listas para leer o descargar.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-muted/40 hover:bg-muted text-muted-foreground font-bold text-xs p-2.5 shadow-sm transition-all flex items-center gap-1"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink size={14} />
          </a>
          
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4 py-2.5 shadow-sm transition-all flex items-center gap-1.5"
          >
            <Maximize2 size={13} />
            <span>Pantalla Completa</span>
          </button>
        </div>
      </div>

      {/* Full Screen Overlay Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in select-none">
          {/* Header Bar */}
          <div className="h-14 bg-zinc-900 border-b border-zinc-800 px-6 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-red-500" />
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider">Reglamento del Juego</span>
                <span className="text-[9px] text-zinc-400 truncate max-w-[300px] md:max-w-md">
                  {pdfUrl.split("/").pop() || pdfUrl}
                </span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2.5 transition-all flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          {/* IFrame Container */}
          <div className="flex-1 bg-zinc-950 relative">
            <iframe
              src={pdfUrl}
              className="w-full h-full border-none"
              title="Manual PDF Full Screen Viewer"
            />
          </div>
        </div>
      )}
    </>
  );
}
