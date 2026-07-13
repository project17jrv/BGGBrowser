"use client";

import { useState } from "react";
import { X, ExternalLink, Globe } from "lucide-react";

interface MisutMeepleReview {
  url: string;
  rating: string;
}

interface MisutMeepleBadgeProps {
  review: MisutMeepleReview;
}

export default function MisutMeepleBadge({ review }: MisutMeepleBadgeProps) {
  const [isReading, setIsReading] = useState(false);

  return (
    <>
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

      {/* Clickable Badge */}
      <button
        type="button"
        onClick={() => setIsReading(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider hover:scale-105 transition-all duration-200 cursor-pointer text-left"
        title={`Leer reseña Misut Meeple: Sello ${review.rating}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/misut-meeple/sello-${review.rating}.png`}
          alt={`Sello ${review.rating}`}
          className="h-3 w-3 object-contain shrink-0"
        />
        <span>Misut Meeple: Sello {review.rating}</span>
      </button>

      {/* Centered Modal Integrated Browser Reader */}
      {isReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 animate-backdrop-fade-in text-foreground">
          
          <div className="relative w-[80vw] max-w-7xl h-[90vh] bg-card border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-modal-scale-up">
            {/* Header Bar */}
            <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
                  <Globe size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider text-foreground">
                    Navegador Integrado: Misut Meeple
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate font-mono max-w-[400px]">
                    Sello {review.rating} — Reseña completa
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={review.url}
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
                  title="Cerrar navegador"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Embedded Web Frame */}
            <div className="flex-1 bg-zinc-950 relative w-full">
              <iframe
                src={review.url}
                className="w-full h-full border-none bg-white"
                title="Integrated Browser Viewer - Misut Meeple"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
