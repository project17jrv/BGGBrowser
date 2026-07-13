"use client";

import { useState } from "react";
import { FileText, X, ExternalLink, BookOpen } from "lucide-react";

interface ManualViewerProps {
  pdfUrl: string;
}

export default function ManualViewer({ pdfUrl }: ManualViewerProps) {
  const [isReading, setIsReading] = useState(false);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Inline styles for custom premium scale and backdrop blur animation */}
      <style>{`
        @keyframes modalScaleUp {
          0% {
            opacity: 0;
            transform: scale(0.94) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes backdropFadeIn {
          0% {
            opacity: 0;
            background-color: rgba(0, 0, 0, 0);
            backdrop-filter: blur(0px);
          }
          100% {
            opacity: 1;
            background-color: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(8px);
          }
        }
        .animate-modal-scale-up {
          animation: modalScaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-backdrop-fade-in {
          animation: backdropFadeIn 0.3s ease-out forwards;
        }
      `}</style>

      {/* Preview State: Shows PDF cover preview and a button to read */}
      <div className="relative rounded-2xl border bg-card p-5 shadow-premium flex flex-col md:flex-row gap-5 items-center">
        
        {/* PDF Cover Thumbnail Container */}
        <button
          type="button"
          onClick={() => setIsReading(true)}
          className="relative w-36 h-48 bg-muted rounded-xl overflow-hidden border shadow-md flex items-center justify-center group shrink-0 transition-transform duration-300 hover:scale-[1.02] cursor-pointer"
          title="Haga clic para abrir el lector"
        >
          <iframe
            src={`${pdfUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
            className="w-full h-full border-none pointer-events-none select-none"
            title="PDF Cover Preview"
            scrolling="no"
          />
          {/* Dark glass overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <BookOpen size={24} className="text-white animate-pulse" />
          </div>
        </button>

        {/* Description & Action */}
        <div className="flex-1 flex flex-col justify-between h-full gap-4 text-center md:text-left w-full">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="rounded-lg bg-red-500/10 p-1.5 text-red-500">
                <FileText size={14} />
              </div>
              <h4 className="font-heading text-sm font-bold text-foreground">Reglas Oficiales en PDF</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              El reglamento oficial está cargado y listo para su consulta directa en la aplicación o descarga offline.
            </p>
            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-1 rounded w-fit mx-auto md:mx-0 truncate max-w-full">
              {pdfUrl.split("/").pop() || pdfUrl}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <button
              type="button"
              onClick={() => setIsReading(true)}
              className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs px-5 py-3 shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <BookOpen size={14} />
              <span>Leer Reglamento</span>
            </button>
            
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground font-bold text-xs px-4 py-3 shadow-sm transition-all flex items-center gap-1.5"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink size={14} />
              <span>Pestaña nueva</span>
            </a>
          </div>
        </div>

      </div>

      {/* Centered Modal Integrated Reader State */}
      {isReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 animate-backdrop-fade-in">
          
          <div className="relative w-[80vw] max-w-7xl h-[90vh] bg-card border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-modal-scale-up">
            {/* Header Bar */}
            <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={18} className="text-red-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider text-foreground">
                    Lector de Reglamento
                  </span>
                  <span className="text-[9px] text-muted-foreground truncate font-mono">
                    {pdfUrl.split("/").pop() || pdfUrl}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted p-2.5 transition-all flex items-center justify-center shadow-sm"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  type="button"
                  onClick={() => setIsReading(false)}
                  className="rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 p-2.5 transition-all flex items-center justify-center ml-2 cursor-pointer shadow-sm"
                  title="Cerrar lector"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* PDF Frame */}
            <div className="flex-1 bg-zinc-950 relative w-full">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-none"
                title="Manual PDF Integrated Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
