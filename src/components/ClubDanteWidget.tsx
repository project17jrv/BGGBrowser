"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, RefreshCw, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { ClubDantePost } from "@/app/api/collection/hotness/clubdante/route";

export default function ClubDanteWidget() {
  const [posts, setPosts] = useState<ClubDantePost[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary border transition-all disabled:opacity-50"
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
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-muted border">
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="object-cover h-full w-full group-hover:scale-102 transition-transform duration-500"
                />
                {post.rating && (
                  <span className="absolute top-2.5 right-2.5 rounded-md bg-primary px-2 py-0.5 text-[10px] font-black text-white shadow-sm border border-primary/20">
                    Nota: {post.rating}
                  </span>
                )}
              </div>
            ) : (
              <div className="aspect-video w-full rounded-xl bg-muted border flex items-center justify-center text-muted-foreground text-xs font-semibold">
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
              
              <h3 className="font-heading font-black text-sm text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">
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
              <a
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
              >
                <span>Leer artículo</span>
                <ExternalLink size={10} />
              </a>
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
          className="rounded-xl border bg-card hover:bg-secondary text-foreground text-xs font-black uppercase tracking-wider px-4 py-2.5 shadow-sm transition-all disabled:opacity-30 flex items-center gap-1.5"
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
          className="rounded-xl border bg-card hover:bg-secondary text-foreground text-xs font-black uppercase tracking-wider px-4 py-2.5 shadow-sm transition-all disabled:opacity-30 flex items-center gap-1.5"
        >
          Siguiente
        </button>
      </div>

    </div>
  );
}
