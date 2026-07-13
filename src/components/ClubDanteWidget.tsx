"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ExternalLink, RefreshCw, ThumbsUp, ThumbsDown,
  MessageSquare, X, Globe,
} from "lucide-react";
import { ClubDantePost } from "@/app/api/collection/hotness/clubdante/route";

export default function ClubDanteWidget() {
  const [posts, setPosts] = useState<ClubDantePost[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal browser state
  const [readingPost, setReadingPost] = useState<{ url: string; title: string } | null>(null);

  const fetchFeed = useCallback(async (isRefresh = false, targetPage = page) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/collection/hotness/clubdante?page=${targetPage}`);
      if (!res.ok) {
        throw new Error("No se pudo cargar el feed de El Club de Dante.");
      }
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    fetchFeed(false, page);
  }, [page, fetchFeed]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div className="h-6 w-1/3 bg-muted rounded-md animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-4 space-y-4 animate-pulse">
              <div className="aspect-video w-full bg-muted rounded-xl" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-5/6" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-8 text-center text-xs text-red-500 flex flex-col items-center gap-3 max-w-md mx-auto mt-12">
        <MessageSquare size={24} />
        <p>{error}</p>
        <button
          onClick={() => fetchFeed()}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-4 py-2 font-bold hover:bg-red-500/20 transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Inline styles for custom premium scale and backdrop blur animation (similar to ManualViewer) */}
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

      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-lg font-black text-foreground">
            Feed de la Comunidad: El Club de Dante
          </h2>
          <p className="text-xs text-muted-foreground">
            Últimas reseñas, noticias y artículos del portal de divulgación del juego de mesa.
          </p>
        </div>

        <button
          onClick={() => fetchFeed(true)}
          disabled={refreshing}
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary border transition-all disabled:opacity-50 cursor-pointer"
          title="Actualizar Feed"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Grid of Posts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex flex-col gap-4 rounded-2xl border bg-card p-4 hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 group"
          >
            {/* Featured Image */}
            {post.imageUrl ? (
              <div
                onClick={() => setReadingPost({ url: post.link, title: post.title })}
                className="relative aspect-video w-full rounded-xl overflow-hidden bg-muted border cursor-pointer"
                title="Haga clic para abrir el artículo en el lector"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="object-cover h-full w-full group-hover:scale-[1.03] transition-transform duration-500"
                />
                {post.rating && (
                  <span className="absolute top-2.5 right-2.5 rounded-md bg-primary px-2 py-0.5 text-[10px] font-black text-white shadow-sm border border-primary/20">
                    Nota: {post.rating}
                  </span>
                )}
                {/* Visual indicator overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white bg-zinc-950/80 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl shadow-md transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    Leer en la App
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setReadingPost({ url: post.link, title: post.title })}
                className="aspect-video w-full rounded-xl bg-muted border flex items-center justify-center text-muted-foreground text-xs font-semibold cursor-pointer"
              >
                Sin Imagen
              </div>
            )}

            {/* Title & Info */}
            <div className="flex flex-col flex-grow gap-2">
              <span className="text-[10px] text-muted-foreground font-semibold">
                {new Date(post.date).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              
              <h3
                onClick={() => setReadingPost({ url: post.link, title: post.title })}
                className="font-heading font-black text-sm text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2 cursor-pointer"
                title={post.title}
              >
                {post.title}
              </h3>

              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {post.excerpt}
              </p>
            </div>

            {/* Pros / Cons Lists (only if present) */}
            {(post.pros.length > 0 || post.contras.length > 0) && (
              <div className="border-t border-dashed pt-3 space-y-2 text-[10px]">
                {post.pros.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                      <ThumbsUp size={10} />
                      A favor
                    </span>
                    <ul className="list-disc pl-3 text-muted-foreground space-y-0.5">
                      {post.pros.map((pro, idx) => (
                        <li key={idx} className="line-clamp-1">{pro}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {post.contras.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                      <ThumbsDown size={10} />
                      En contra
                    </span>
                    <ul className="list-disc pl-3 text-muted-foreground space-y-0.5">
                      {post.contras.map((contra, idx) => (
                        <li key={idx} className="line-clamp-1">{contra}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Read Article Button */}
            <div className="border-t pt-3 mt-auto flex items-center justify-end">
              <button
                onClick={() => setReadingPost({ url: post.link, title: post.title })}
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <span>Leer artículo</span>
                <ExternalLink size={10} />
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-4 border-t pt-6 mt-4">
        <button
          onClick={() => {
            setPage(prev => Math.max(prev - 1, 1));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          disabled={page === 1 || loading}
          className="rounded-xl border bg-card hover:bg-secondary text-foreground text-xs font-black uppercase tracking-wider px-4 py-2.5 shadow-sm transition-all disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
        >
          Anterior
        </button>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Página {page} de 10
        </span>
        <button
          onClick={() => {
            setPage(prev => Math.min(prev + 1, 10));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          disabled={page === 10 || posts.length < 12 || loading}
          className="rounded-xl border bg-card hover:bg-secondary text-foreground text-xs font-black uppercase tracking-wider px-4 py-2.5 shadow-sm transition-all disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
        >
          Siguiente
        </button>
      </div>

      {/* Centered Modal Integrated Browser Reader */}
      {readingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 animate-backdrop-fade-in">
          
          <div className="relative w-[80vw] max-w-7xl h-[90vh] bg-card border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-modal-scale-up">
            {/* Header Bar */}
            <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                  <Globe size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider text-foreground">
                    Navegador Integrado
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate font-mono max-w-[400px]" title={readingPost.title}>
                    {readingPost.title}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={readingPost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted p-2.5 transition-all flex items-center justify-center shadow-sm"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink size={15} />
                </a>
                <button
                  type="button"
                  onClick={() => setReadingPost(null)}
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
                src={readingPost.url}
                className="w-full h-full border-none bg-white"
                title="Integrated Browser Viewer"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
