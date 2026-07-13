"use client";
/**
 * Shared mini-card preview tooltip.
 * Renders via ReactDOM.createPortal at <body> level so it is never
 * clipped by overflow:hidden/auto parent containers.
 *
 * Usage:
 *   <PreviewButton url="https://…" preview={offerPreview} label="Tienda XYZ" price="34.99 €" badge="En stock" />
 *
 * For Wallapop items, omit `preview` — the component will fetch OG
 * metadata on the first hover and cache it in component state.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import { MonitorSmartphone } from "lucide-react";

// ── Public types ─────────────────────────────────────────────────────────────

export interface ItemPreview {
  title: string | null;
  description: string | null;
  image: string | null;
}

export interface PreviewButtonProps {
  /** Destination URL (used for domain display and OG fetch fallback) */
  url: string;
  /** Pre-fetched preview data (Ludonauta). If omitted, fetched on hover. */
  preview?: ItemPreview;
  /** Main label shown in the no-image fallback header (store/seller name) */
  label?: string;
  /** Price string, e.g. "34.99 €" */
  price?: string;
  /** Optional stock/status badge text */
  badge?: string;
  /** Badge colour variant */
  badgeVariant?: "green" | "amber" | "red" | "orange";
  /** Accent color for the button when data is available */
  accentClass?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function badgeClass(variant?: "green" | "amber" | "red" | "orange"): string {
  switch (variant) {
    case "green":  return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    case "amber":  return "bg-amber-500/10  border-amber-500/30  text-amber-400";
    case "orange": return "bg-orange-500/10 border-orange-500/30 text-orange-400";
    case "red":
    default:       return "bg-red-500/10    border-red-500/30    text-red-400";
  }
}

// ── OG fetch (client-side, via Next.js API proxy to avoid CORS) ──────────────

async function fetchOgPreview(url: string): Promise<ItemPreview> {
  try {
    const res = await fetch(
      `/api/og-preview?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return { title: null, description: null, image: null };
    return await res.json();
  } catch {
    return { title: null, description: null, image: null };
  }
}

// ── Mini-card portal ─────────────────────────────────────────────────────────

interface MiniCardPortalProps {
  url: string;
  preview: ItemPreview | null;
  loading: boolean;
  label?: string;
  price?: string;
  badge?: string;
  badgeVariant?: "green" | "amber" | "red" | "orange";
  anchorRect: DOMRect;
}

function MiniCardPortal({
  url, preview, loading,
  label, price, badge, badgeVariant, anchorRect,
}: MiniCardPortalProps) {
  const CARD_W = 300;
  const CARD_H = 270;

  const spaceAbove = anchorRect.top;
  const showAbove = spaceAbove >= CARD_H + 12;
  const top = showAbove ? anchorRect.top - CARD_H - 8 : anchorRect.bottom + 8;
  const rightEdge = window.innerWidth - anchorRect.right;
  const clampedRight = Math.max(8, Math.min(rightEdge, window.innerWidth - CARD_W - 8));

  const domain = getDomain(url);
  const hasContent = preview && (preview.title || preview.description || preview.image);

  if (typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div
      style={{ position: "fixed", top, right: clampedRight, width: CARD_W, zIndex: 9999, pointerEvents: "none" }}
      className="rounded-2xl border border-white/8 bg-zinc-950 shadow-[0_32px_80px_rgba(0,0,0,0.85)] overflow-hidden animate-fade-in"
    >
      {/* Chrome bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/6 bg-zinc-900">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-red-500/70" />
          <span className="w-2 h-2 rounded-full bg-amber-400/70" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
        </div>
        <span className="text-[10px] text-zinc-400 truncate font-mono flex-1">{domain}</span>
      </div>

      {/* Body */}
      {loading ? (
        /* Skeleton while fetching OG */
        <div className="px-4 py-5 flex flex-col gap-3 animate-pulse">
          <div className="w-full h-28 bg-zinc-900 rounded-xl" />
          <div className="h-3 bg-zinc-800 rounded-full w-3/4" />
          <div className="h-2.5 bg-zinc-800 rounded-full w-full" />
          <div className="h-2.5 bg-zinc-800 rounded-full w-2/3" />
        </div>
      ) : !hasContent ? (
        /* No data */
        <div className="flex flex-col items-center justify-center gap-3 px-5 py-10">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/6 flex items-center justify-center">
            <MonitorSmartphone size={18} className="text-zinc-600" />
          </div>
          <p className="text-[10px] text-center text-zinc-400 leading-relaxed">
            Ficha no disponible.
          </p>
        </div>
      ) : (
        <>
          {/* Hero image */}
          {preview?.image ? (
            <div className="relative w-full overflow-hidden" style={{ height: 148 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.image}
                alt={preview.title || "Imagen"}
                className="w-full h-full object-cover object-center opacity-0 transition-opacity duration-300"
                onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = "1"; }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {/* Gradient scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

              {/* Price */}
              {price && (
                <div className="absolute bottom-3 right-3">
                  <span className="inline-flex items-center rounded-xl bg-white text-zinc-950 px-3 py-1.5 text-[13px] font-black shadow-lg leading-none">
                    {price}
                  </span>
                </div>
              )}

              {/* Badge */}
              {badge && (
                <div className="absolute bottom-3 left-3">
                  <span className={`inline-flex items-center rounded-xl border px-2 py-1 text-[8px] font-black uppercase tracking-widest backdrop-blur-sm ${badgeClass(badgeVariant)}`}>
                    {badge}
                  </span>
                </div>
              )}

              {/* Label */}
              {label && (
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center rounded-lg bg-zinc-950/75 backdrop-blur-sm border border-white/10 px-2 py-1 text-[9px] font-bold text-white">
                    {label}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* No image — compact header band */
            <div className="flex items-center justify-between px-4 py-4 bg-zinc-900 border-b border-white/6">
              <div className="flex flex-col gap-0.5">
                {label && <span className="text-[12px] font-bold text-white">{label}</span>}
                {badge && (
                  <span className={`inline-flex w-fit items-center rounded-lg border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${badgeClass(badgeVariant)}`}>
                    {badge}
                  </span>
                )}
              </div>
              {price && (
                <span className="text-[18px] font-black text-white leading-none">{price}</span>
              )}
            </div>
          )}

          {/* Text body */}
          <div className="px-4 py-3 flex flex-col gap-1.5 bg-zinc-950">
            {preview?.title && (
              <p className="text-[12px] font-bold text-white leading-snug line-clamp-2">
                {preview.title}
              </p>
            )}
            {preview?.description && (
              <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2 mt-0.5">
                {preview.description}
              </p>
            )}
          </div>
        </>
      )}
    </div>,
    document.body
  );
}

// ── Public PreviewButton component ───────────────────────────────────────────

export function PreviewButton({
  url,
  preview: initialPreview,
  label,
  price,
  badge,
  badgeVariant,
  accentClass = "hover:bg-blue-500/15 hover:text-blue-400",
}: PreviewButtonProps) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [preview, setPreview] = useState<ItemPreview | null>(initialPreview ?? null);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchedRef = useRef(false);

  // Reset local state when URL changes (prevents caching previews across different items when keys are reused)
  useEffect(() => {
    setPreview(initialPreview ?? null);
    fetchedRef.current = false;
    setLoading(false);
    setAnchorRect(null);
  }, [url, initialPreview]);

  // If we have pre-fetched data (Ludonauta), use it directly.
  // Otherwise fetch on first hover (Wallapop).
  const hasData = preview && (preview.title || preview.image);

  const handleMouseEnter = useCallback(async () => {
    timerRef.current = setTimeout(async () => {
      if (buttonRef.current) {
        setAnchorRect(buttonRef.current.getBoundingClientRect());
      }
      // Lazy-fetch OG data if not already fetched and not pre-loaded
      if (!initialPreview && !fetchedRef.current) {
        fetchedRef.current = true;
        setLoading(true);
        const data = await fetchOgPreview(url);
        setPreview(data);
        setLoading(false);
      }
    }, 160);
  }, [url, initialPreview]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnchorRect(null);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-all shadow-sm cursor-pointer ${
          hasData ? `text-blue-400 bg-blue-500/15 ${accentClass}` : accentClass
        }`}
        title={hasData ? "Ver ficha del producto" : "Vista previa"}
        tabIndex={-1}
      >
        <MonitorSmartphone size={12} />
      </button>

      {anchorRect && (
        <MiniCardPortal
          url={url}
          preview={preview}
          loading={loading}
          label={label}
          price={price}
          badge={badge}
          badgeVariant={badgeVariant}
          anchorRect={anchorRect}
        />
      )}
    </>
  );
}
