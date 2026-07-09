import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getGameDetail } from "@/lib/actions";
import Header from "@/components/Header";
import DetailFavoriteButton from "@/components/DetailFavoriteButton";
import FinancialForm from "@/components/FinancialForm";
import PricesWidget from "@/components/PricesWidget";
import SleevesWidget from "@/components/SleevesWidget";
import WallapopWidget from "@/components/WallapopWidget";
import { ChevronLeft, Star, Award, Users, Clock, Flame, Sparkles, FileText } from "lucide-react";
import { getMisutMeepleReview } from "@/lib/misutMeeple";
import MusicWidget from "@/components/MusicWidget";
import ReviewVideosWidget from "@/components/ReviewVideosWidget";
import TranslateDescriptionButton from "@/components/TranslateDescriptionButton";

interface GameDetailProps {
  params: Promise<{ id: string }>;
}

export default async function GameDetailPage({ params }: GameDetailProps) {
  // Await params as required in Next.js 15 App Router
  const resolvedParams = await params;
  const game = await getGameDetail(resolvedParams.id);

  if (!game) {
    notFound();
  }

  const review = getMisutMeepleReview(game.name, game.spanishName);

  // Format player count text
  const playersText = 
    game.minPlayers === game.maxPlayers
      ? `${game.minPlayers} jugadores`
      : `${game.minPlayers}-${game.maxPlayers} jugadores`;

  // Format playtime text
  const playtimeText = 
    game.minPlayTime === game.maxPlayTime
      ? `${game.minPlayTime} minutos`
      : `${game.minPlayTime}-${game.maxPlayTime} minutos`;

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col pb-16">
      <Header />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Navigation & Actions Topbar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            <ChevronLeft size={16} />
            <span>Volver al Catálogo</span>
          </Link>
          <DetailFavoriteButton bggId={game.bggId} />
        </div>

        {/* Game Detail Panel Layout */}        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 rounded-2xl border bg-card p-6 md:p-8 shadow-premium transition-all duration-300">
          
          {/* Column 1: Portada y Música */}
          <div className="flex flex-col gap-6">
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-muted border shadow-sm group">
              <Image
                src={game.imageUrl || "/images/placeholder.svg"}
                alt={game.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 30vw"
                className="object-cover transition-transform duration-500 group-hover:scale-102"
              />
            </div>

            {/* Music soundtrack widget */}
            <MusicWidget gameId={game.id} />

            {/* FINANCIAL SECTION */}
            <div className="rounded-2xl border bg-card p-5 shadow-premium">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-4">Gestión de Ludoteca</span>
              <FinancialForm game={{
                bggId: game.bggId,
                status: game.status,
                purchasePrice: game.purchasePrice,
                sellPrice: game.sellPrice,
                soldPrice: game.soldPrice,
                personalRating: game.personalRating,
                physicalState: game.physicalState,
                retentionStatus: game.retentionStatus,
                played: game.played,
                notes: game.notes,
                spanishName: game.spanishName,
                youtubeUrl: game.youtubeUrl,
                pdfUrl: game.pdfUrl,
              }} />
            </div>

          </div>
          
          {/* Column 2: Descripción y Categorías */}
          <div className="flex flex-col gap-6">
            {/* Title & Year */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1.5">
                <h1 className="font-heading text-xl md:text-2xl font-black tracking-tight leading-none text-foreground">
                  {game.spanishName || game.name}
                </h1>
                {game.spanishName && game.name !== game.spanishName && (
                  <span className="text-[10px] text-muted-foreground font-semibold block w-full mt-1">
                    Título original: <span className="italic">{game.name}</span>
                  </span>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {game.yearPublished && (
                    <span className="rounded-full bg-secondary border px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {game.yearPublished}
                    </span>
                  )}
                  <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[9px] font-black text-indigo-500 uppercase tracking-wider">
                    BGG ID: {game.bggId}
                  </span>
                  {review && (
                    <a
                      href={review.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider hover:scale-105 transition-all duration-200"
                      title={`Leer reseña Misut Meeple: Sello ${review.rating}`}
                    >
                      <img
                        src={`/misut-meeple/sello-${review.rating}.png`}
                        alt={`Sello ${review.rating}`}
                        className="h-3 w-3 object-contain shrink-0"
                      />
                      <span>Misut Meeple: Sello {review.rating}</span>
                    </a>
                  )}
                  {game.isExpansion && (
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[9px] font-black text-amber-500 uppercase tracking-wider">
                      Expansión
                    </span>
                  )}
                </div>
              </div>
              
              {/* Designers subtitle */}
              {game.designers.length > 0 && (
                <p className="text-[10px] font-semibold text-muted-foreground mt-2">
                  Diseñado por: <span className="text-foreground">{game.designers.map(d => d.name).join(", ")}</span>
                </p>
              )}
            </div>

            {/* Core Details Grid row */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-y py-3 text-[11px] text-muted-foreground font-semibold">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-pink-400" />
                <span>Tiempo: <span className="text-foreground">{playtimeText}</span></span>
              </div>
              {game.minAge && (
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-400" />
                  <span>Edad: <span className="text-foreground">+{game.minAge} años</span></span>
                </div>
              )}
              {game.usersRated && (
                <div className="flex items-center gap-1.5">
                  <Star size={13} className="text-amber-400" />
                  <span>Votos: <span className="text-foreground">{game.usersRated.toLocaleString()}</span></span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-heading text-xs font-bold text-foreground tracking-tight">
                  Descripción del Juego
                </h2>
                {game.description && (
                  <TranslateDescriptionButton bggId={game.bggId} />
                )}
              </div>
              <div className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans bg-muted/10 p-4 rounded-2xl border max-h-[300px] overflow-y-auto">
                {game.description ? game.description : "Sin descripción disponible."}
              </div>
            </div>

            {/* Quick Specs Cards */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Rating Spec */}
              <div className="rounded-xl border bg-muted/20 p-2.5 text-center">
                <Star size={16} className="mx-auto text-amber-500 fill-amber-500 mb-1" />
                <span className="block text-[10px] text-muted-foreground font-semibold">Valoración</span>
                <span className="text-xs font-bold text-foreground">
                  {game.averageRating ? game.averageRating.toFixed(2) : "N/A"}
                </span>
              </div>

              {/* Rank Spec */}
              <div className="rounded-xl border bg-muted/20 p-2.5 text-center">
                <Award size={16} className="mx-auto text-indigo-500 mb-1" />
                <span className="block text-[10px] text-muted-foreground font-semibold">Ranking BGG</span>
                <span className="text-xs font-bold text-foreground">
                  #{game.rank || "N/A"}
                </span>
              </div>

              {/* Players Spec */}
              <div className="rounded-xl border bg-muted/20 p-2.5 text-center flex flex-col justify-center items-center min-h-[76px]">
                <Users size={16} className="text-sky-500 mb-1" />
                <span className="block text-[10px] text-muted-foreground font-semibold">Nº Jugadores</span>
                <span className="text-[10px] font-bold text-foreground leading-tight block mt-0.5">
                  {playersText}
                </span>
                {game.bestPlayers && (
                  <span className="block text-[9px] font-black text-emerald-500 mt-1 leading-none uppercase tracking-wider">
                    Mejor: {game.bestPlayers}
                  </span>
                )}
              </div>

              {/* Complexity Spec */}
              <div className="rounded-xl border bg-muted/20 p-2.5 text-center">
                <Flame size={16} className="mx-auto text-purple-500 mb-1" />
                <span className="block text-[10px] text-muted-foreground font-semibold">Complejidad</span>
                <span className="text-xs font-bold text-foreground">
                  {game.complexityWeight ? game.complexityWeight.toFixed(2) : "N/A"}
                </span>
              </div>
            </div>

            {/* Personal Status Info Badge */}
            <div className="rounded-xl border border-dashed bg-secondary/30 p-3 space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-muted-foreground">Estado:</span>
                <span className={`font-black uppercase tracking-wider text-[9px] rounded px-1.5 py-0.5 ${
                  game.status === "in_collection" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                  game.status === "for_sale" ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                  game.status === "sold" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                  "bg-muted-foreground/10 text-muted-foreground"
                }`}>
                  {game.status === "in_collection" ? "En Colección" :
                   game.status === "for_sale" ? "En Venta" :
                   game.status === "sold" ? "Vendido" : "Deseado"}
                </span>
              </div>
              {game.personalRating && (
                <div className="flex justify-between items-center text-[10px] border-t border-dashed pt-1.5">
                  <span className="font-bold text-muted-foreground">Nota Personal:</span>
                  <span className="font-bold text-foreground flex items-center gap-1">
                    <Star size={11} className="fill-amber-500 text-amber-500" />
                    {game.personalRating}/10
                  </span>
                </div>
              )}
              {game.purchasePrice !== null && (
                <div className="flex justify-between items-center text-[10px] border-t border-dashed pt-1.5">
                  <span className="font-bold text-muted-foreground">P. Compra:</span>
                  <span className="font-bold text-foreground">
                    {game.purchasePrice.toFixed(2)}€
                  </span>
                </div>
              )}
              {game.status === "sold" && game.soldPrice !== null && (
                <div className="flex justify-between items-center text-[10px] border-t border-dashed pt-1.5">
                  <span className="font-bold text-muted-foreground">P. Venta:</span>
                  <span className="font-bold text-indigo-500">
                    {game.soldPrice.toFixed(2)}€
                  </span>
                </div>
              )}
            </div>

            {/* Categories & Mechanics Tag Clouds */}
            <div className="flex flex-col gap-4 border-t pt-4">
              {/* Categories */}
              {game.categories.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                    Categorías
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {game.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="rounded-full bg-secondary border px-2 py-0.5 text-[9px] font-semibold text-muted-foreground"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mechanics */}
              {game.mechanics.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                    Mecánicas
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {game.mechanics.map((mec) => (
                      <span
                        key={mec.id}
                        className="rounded-full bg-secondary border px-2 py-0.5 text-[9px] font-semibold text-muted-foreground"
                      >
                        {mec.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Publishers list */}
            {game.publishers.length > 0 && (
              <div className="border-t pt-4 text-[9px] font-bold text-muted-foreground/80 leading-normal">
                EDITORIALES:{" "}
                <span className="text-foreground/90 font-medium">
                  {game.publishers.map(p => p.name).join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Column 3: Finanzas y todos los Widgets */}
          <div className="flex flex-col gap-6">
            {/* Scraper Widgets */}
            <PricesWidget gameId={game.id} />

            <WallapopWidget
              gameId={game.id}
              initialItems={game.linkedWallapop.map(item => ({
                id: item.id,
                title: item.title,
                price: item.price,
                webLink: item.webLink,
                location: item.location
              }))}
              initialExcluded={game.excludedWallapopIds || ""}
            />

            <SleevesWidget gameId={game.id} />

            <ReviewVideosWidget gameId={game.id} />

            {game.pdfUrl && (
              <div className="rounded-2xl border bg-card p-4 shadow-premium flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-500/10 p-2.5 text-red-500 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-heading text-[10px] font-bold text-foreground">Reglas Oficiales en PDF</h4>
                    <p className="text-[9px] text-muted-foreground">Instrucciones del juego.</p>
                  </div>
                </div>
                <a
                  href={game.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-[10px] px-3 py-2 shadow-sm transition-all"
                >
                  Ver Reglamento
                </a>
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}
