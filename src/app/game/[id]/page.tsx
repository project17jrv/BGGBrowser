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
import GameTabs from "@/components/GameTabs";
import TutorialForm from "@/components/TutorialForm";

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

        {/* Three-Column Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT SIDEBAR COLUMN: Portada, Música, Fundas (3/12 width) */}
          <div className="flex flex-col gap-6 lg:col-span-3">
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-muted border shadow-sm group">
              <Image
                src={game.imageUrl || "/images/placeholder.svg"}
                alt={game.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-102"
              />
            </div>
            <MusicWidget gameId={game.id} />
            <SleevesWidget gameId={game.id} />
          </div>

          {/* CENTER MAIN CONTENT COLUMN: Game Info (5/12 width) */}
          <div className="flex flex-col gap-6 lg:col-span-5 rounded-2xl border bg-card p-6 md:p-8 shadow-premium">
            
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
                  <span className={`font-black uppercase tracking-wider text-[9px] rounded-full border px-2 py-0.5 ${
                    game.status === "in_collection" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    game.status === "for_sale" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                    game.status === "sold" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    "bg-muted-foreground/10 text-muted-foreground"
                  }`}>
                    {game.status === "in_collection" ? "En Colección" :
                     game.status === "for_sale" ? "En Venta" :
                     game.status === "sold" ? "Vendido" : "Deseado"}
                  </span>
                  {game.personalRating && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <Star size={10} className="fill-amber-500 text-amber-500" />
                      <span>Nota: {game.personalRating}/10</span>
                    </span>
                  )}
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
              <div className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans bg-muted/10 p-4 rounded-2xl border max-h-[160px] overflow-y-auto">
                {game.description ? game.description : "Sin descripción disponible."}
              </div>
            </div>

            {/* Quick Specs Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Rating Spec */}
              <div className="rounded-xl border bg-muted/20 p-2 text-center">
                <Star size={15} className="mx-auto text-amber-500 fill-amber-500 mb-1" />
                <span className="block text-[9px] text-muted-foreground font-semibold uppercase">Valoración</span>
                <span className="text-xs font-bold text-foreground">
                  {game.averageRating ? game.averageRating.toFixed(2) : "N/A"}
                </span>
              </div>

              {/* Rank Spec */}
              <div className="rounded-xl border bg-muted/20 p-2 text-center">
                <Award size={15} className="mx-auto text-indigo-500 mb-1" />
                <span className="block text-[9px] text-muted-foreground font-semibold uppercase">Ranking</span>
                <span className="text-xs font-bold text-foreground">
                  #{game.rank || "N/A"}
                </span>
              </div>

              {/* Players Spec */}
              <div className="rounded-xl border bg-muted/20 p-2 text-center flex flex-col justify-center items-center">
                <Users size={15} className="text-sky-500 mb-1" />
                <span className="block text-[9px] text-muted-foreground font-semibold uppercase leading-none">Jugadores</span>
                <span className="text-[10px] font-bold text-foreground mt-0.5 leading-none">
                  {playersText}
                </span>
                {game.bestPlayers && (
                  <span className="block text-[8px] font-black text-emerald-500 mt-1 leading-none uppercase tracking-wider">
                    Mejor: {game.bestPlayers}
                  </span>
                )}
              </div>

              {/* Complexity Spec */}
              <div className="rounded-xl border bg-muted/20 p-2 text-center">
                <Flame size={15} className="mx-auto text-purple-500 mb-1" />
                <span className="block text-[9px] text-muted-foreground font-semibold uppercase">Complejidad</span>
                <span className="text-xs font-bold text-foreground">
                  {game.complexityWeight ? game.complexityWeight.toFixed(2) : "N/A"}
                </span>
              </div>
            </div>

            {/* Categories & Mechanics Tag Clouds */}
            <div className="flex flex-col gap-4 border-t pt-4">
              {game.categories.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                    Categorías
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {game.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="rounded-full bg-secondary border px-2.5 py-0.5 text-[9px] font-semibold text-muted-foreground"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {game.mechanics.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                    Mecánicas
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {game.mechanics.map((mec) => (
                      <span
                        key={mec.id}
                        className="rounded-full bg-secondary border px-2.5 py-0.5 text-[9px] font-semibold text-muted-foreground"
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
                <span className="text-foreground/90 font-medium block mt-1">
                  {game.publishers.map(p => p.name).join(", ")}
                </span>
              </div>
            )}



          </div>

          {/* RIGHT SIDEBAR COLUMN: Tabs Panel (4/12 width) */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <GameTabs
              ludotecaContent={
                <div className="w-full animate-fade-in">
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
              }
              preciosContent={
                <div className="flex flex-col gap-6 w-full animate-fade-in">
                  <PricesWidget gameId={game.id} />
                  <WallapopWidget
                    gameId={game.id}
                    gameName={game.spanishName || game.name}
                    initialItems={game.linkedWallapop.map(item => ({
                      id: item.id,
                      title: item.title,
                      price: item.price,
                      webLink: item.webLink,
                      location: item.location
                    }))}
                    initialExcluded={game.excludedWallapopIds || ""}
                  />
                </div>
              }
              aprendeContent={
                <div className="flex flex-col gap-6 w-full animate-fade-in">
                  <ReviewVideosWidget gameId={game.id} customYoutubeUrl={game.youtubeUrl} />
                  <TutorialForm bggId={game.bggId} gameName={game.spanishName || game.name} initialYoutubeUrl={game.youtubeUrl || ""} initialPdfUrl={game.pdfUrl || ""} />
                  {/* Rules PDF manual (if exists) */}
                  {game.pdfUrl && (
                    <div className="rounded-2xl border bg-card p-5 shadow-premium flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-red-500/10 p-2.5 text-red-500 shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="font-heading text-xs font-bold text-foreground">Reglas Oficiales en PDF</h4>
                          <p className="text-[10px] text-muted-foreground">Instrucciones de juego listas para leer o descargar.</p>
                        </div>
                      </div>
                      <a
                        href={game.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4 py-2.5 shadow-sm transition-all"
                      >
                        Ver Reglamento
                      </a>
                    </div>
                  )}

                  {/* Reseñas (Misut Meeple review if exists) */}
                  {review ? (
                    <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <h4 className="font-heading text-xs font-bold text-foreground">Reseña Misut Meeple</h4>
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Sello {review.rating}
                        </span>
                      </div>
                      <div className="flex items-start gap-4">
                        <img
                          src={`/misut-meeple/sello-${review.rating}.png`}
                          alt={`Sello ${review.rating}`}
                          className="h-16 w-16 object-contain shrink-0 bg-muted/10 p-1.5 rounded-xl border"
                        />
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-muted-foreground leading-normal">
                            Esta copia dispone de una reseña analítica redactada por el blog de referencia **Misut Meeple**, habiendo obtenido la calificación de **Sello {review.rating}**.
                          </p>
                          <a
                            href={review.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline self-start mt-1"
                          >
                            <span>Leer Reseña Completa</span>
                            <span>&rarr;</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed bg-muted/5 p-5 text-center text-xs text-muted-foreground">
                      No hay reseña escrita de Misut Meeple disponible para este juego.
                    </div>
                  )}
                </div>
              }
            />
          </div>

        </div>

      </div>
    </main>
  );
}
