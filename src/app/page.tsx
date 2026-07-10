import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getGames, getFilterMetadata, getFinancialSummary, getPlaySessions, getPlayStats } from "@/lib/actions";
import Header from "@/components/Header";
import Filters from "@/components/Filters";
import GameCard from "@/components/GameCard";
import SearchInput from "@/components/SearchInput";
import SortAndSize from "@/components/SortAndSize";
import Pagination from "@/components/Pagination";
import Onboarding from "@/components/Onboarding";
import PlayLogForm from "@/components/PlayLogForm";
import DeletePlayButton from "@/components/DeletePlayButton";
import ImportBggPlays from "@/components/ImportBggPlays";
import QuickStatusButton from "@/components/QuickStatusButton";
import ClubDanteWidget from "@/components/ClubDanteWidget";
import {
  Layers,
  Wallet,
  DollarSign,
  TrendingUp,
  Percent,
  Trophy,
  Clock,
  Gamepad2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  Calendar,
  Sparkles,
  Inbox,
  MapPin
} from "lucide-react";

interface HomeProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: HomeProps) {
  // Await search parameters as required in Next.js 15
  const resolvedSearchParams = await searchParams;

  // Check if database is populated. If empty, show Onboarding.
  const dbGamesCount = await prisma.game.count();
  if (dbGamesCount === 0) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <Header />
        <Onboarding />
      </main>
    );
  }

  // Active Tab
  const activeTab = (resolvedSearchParams.tab as string) || "shelves";

  // Autocomplete games list (needed for PlayLogForm)
  const autocompleteGames = await prisma.game.findMany({
    select: {
      bggId: true,
      name: true,
      thumbnailUrl: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col pb-16">
      <Header />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-6 overflow-x-auto gap-5 scrollbar-none">
          <Link
            href="/?tab=shelves"
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 shrink-0 ${
              activeTab === "shelves"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Mi Estantería
          </Link>
          <Link
            href="/?tab=finances"
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 shrink-0 ${
              activeTab === "finances"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Mercadillo & Finanzas
          </Link>
          <Link
            href="/?tab=plays"
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 shrink-0 ${
              activeTab === "plays"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Diario de Partidas
          </Link>
          <Link
            href="/?tab=purga"
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 shrink-0 ${
              activeTab === "purga"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Pérdida de Tiempo / Purga
          </Link>
          <Link
            href="/?tab=comunidad"
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 shrink-0 ${
              activeTab === "comunidad"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Comunidad
          </Link>
        </div>

        {/* Dynamic Tab Render */}
        {activeTab === "shelves" && (
          <ShelvesTab resolvedSearchParams={resolvedSearchParams} />
        )}

        {activeTab === "finances" && (
          <FinancesTab />
        )}

        {activeTab === "plays" && (
          <PlaysTab autocompleteGames={autocompleteGames} />
        )}

        {activeTab === "purga" && (
          <PurgaTab />
        )}

        {activeTab === "comunidad" && (
          <ClubDanteWidget />
        )}

      </div>
    </main>
  );
}

interface ShelvesTabParams {
  page?: string;
  size?: string;
  search?: string;
  minRating?: string;
  maxRating?: string;
  minRank?: string;
  maxRank?: string;
  minYear?: string;
  maxYear?: string;
  players?: string;
  bestPlayers?: string;
  minPlayTime?: string;
  maxPlayTime?: string;
  minComplexity?: string;
  maxComplexity?: string;
  categories?: string;
  mechanics?: string;
  sortBy?: string;
  sortOrder?: string;
  favorites?: string;
  favIds?: string;
  expansions?: string;
}

// ==========================================
// 1. SHELVES TAB (Mi Estantería)
// ==========================================
async function ShelvesTab({ resolvedSearchParams }: { resolvedSearchParams: ShelvesTabParams }) {
  const metadata = await getFilterMetadata(true);

  const getParam = (val: string | string[] | undefined): string | undefined => {
    if (!val) return undefined;
    return Array.isArray(val) ? val[0] : val;
  };

  // Parse filters
  const page = parseInt(getParam(resolvedSearchParams.page) || "1", 10);
  const size = parseInt(getParam(resolvedSearchParams.size) || "12", 10);
  const search = getParam(resolvedSearchParams.search);
  
  const rawMinRating = getParam(resolvedSearchParams.minRating);
  const minRating = rawMinRating ? parseFloat(rawMinRating) : undefined;
  const rawMaxRating = getParam(resolvedSearchParams.maxRating);
  const maxRating = rawMaxRating ? parseFloat(rawMaxRating) : undefined;
  
  const rawMinRank = getParam(resolvedSearchParams.minRank);
  const minRank = rawMinRank ? parseInt(rawMinRank, 10) : undefined;
  const rawMaxRank = getParam(resolvedSearchParams.maxRank);
  const maxRank = rawMaxRank ? parseInt(rawMaxRank, 10) : undefined;
  
  const rawMinYear = getParam(resolvedSearchParams.minYear);
  const minYear = rawMinYear ? parseInt(rawMinYear, 10) : undefined;
  const rawMaxYear = getParam(resolvedSearchParams.maxYear);
  const maxYear = rawMaxYear ? parseInt(rawMaxYear, 10) : undefined;
  
  const rawPlayers = getParam(resolvedSearchParams.players);
  const players = rawPlayers ? parseInt(rawPlayers, 10) : undefined;
  const rawBestPlayers = getParam(resolvedSearchParams.bestPlayers);
  const bestPlayers = rawBestPlayers ? parseInt(rawBestPlayers, 10) : undefined;
  
  const rawMinPlayTime = getParam(resolvedSearchParams.minPlayTime);
  const minPlayTime = rawMinPlayTime ? parseInt(rawMinPlayTime, 10) : undefined;
  const rawMaxPlayTime = getParam(resolvedSearchParams.maxPlayTime);
  const maxPlayTime = rawMaxPlayTime ? parseInt(rawMaxPlayTime, 10) : undefined;
  
  const rawMinComplexity = getParam(resolvedSearchParams.minComplexity);
  const minComplexity = rawMinComplexity ? parseFloat(rawMinComplexity) : undefined;
  const rawMaxComplexity = getParam(resolvedSearchParams.maxComplexity);
  const maxComplexity = rawMaxComplexity ? parseFloat(rawMaxComplexity) : undefined;
  
  const rawCategories = getParam(resolvedSearchParams.categories);
  const categories = rawCategories ? rawCategories.split(",").filter(Boolean) : undefined;
  const rawMechanics = getParam(resolvedSearchParams.mechanics);
  const mechanics = rawMechanics ? rawMechanics.split(",").filter(Boolean) : undefined;
 
  const sortBy = (getParam(resolvedSearchParams.sortBy) as "rank" | "averageRating" | "name" | "yearPublished" | "complexityWeight") || "rank";
  const sortOrder = (getParam(resolvedSearchParams.sortOrder) as "asc" | "desc") || undefined;

  const showFavoritesOnly = getParam(resolvedSearchParams.favorites) === "true";
  const rawFavIds = getParam(resolvedSearchParams.favIds);
  const favoriteBggIds = rawFavIds
    ? rawFavIds
        .split(",")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id))
    : undefined;

  const showExpansions = resolvedSearchParams.expansions !== "false";

  // Fetch games (ownedOnly = true)
  const queryResult = await getGames({
    page,
    size,
    search,
    minRating,
    maxRating,
    minRank,
    maxRank,
    minYear,
    maxYear,
    players,
    bestPlayers,
    minPlayTime,
    maxPlayTime,
    minComplexity,
    maxComplexity,
    categories,
    mechanics,
    sortBy,
    sortOrder,
    favoriteBggIds,
    showFavoritesOnly,
    ownedOnly: true,
    showExpansions,
  });

  return (
    <div className="flex flex-col gap-8 lg:flex-row items-start animate-in fade-in duration-300">
      {/* Sidebar Filters */}
      <aside className="w-full shrink-0 lg:w-72 lg:sticky lg:top-22">
        <Suspense fallback={<div className="h-[500px] w-full rounded-2xl border bg-card animate-pulse" />}>
          <Filters
            categories={metadata.categories}
            mechanics={metadata.mechanics}
            minYear={metadata.minYear}
            maxYear={metadata.maxYear}
            maxRank={metadata.maxRank}
            basePath="/"
          />
        </Suspense>
      </aside>

      {/* Grid Content */}
      <section className="flex-1 w-full flex flex-col gap-6">
        <Suspense fallback={<div className="h-16 w-full rounded-2xl border bg-card animate-pulse" />}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-card p-4 shadow-premium transition-all duration-300">
            <SearchInput basePath="/" />
            <SortAndSize basePath="/" />
          </div>
        </Suspense>

        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
          <span>
            Mostrando <span className="font-bold text-foreground">{queryResult.games.length}</span> de{" "}
            <span className="font-bold text-foreground">{queryResult.totalCount}</span> juegos encontrados
          </span>
          {showFavoritesOnly && (
            <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-500">
              Filtro: Favoritos Activo
            </span>
          )}
        </div>

        {queryResult.games.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {queryResult.games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-12 text-center shadow-sm min-h-[300px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground mb-4">
              <Layers size={22} />
            </div>
            <h3 className="font-heading text-sm font-bold text-foreground">No se encontraron juegos</h3>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
              Prueba a ajustar o limpiar los parámetros de búsqueda o valoración para ver otros títulos.
            </p>
          </div>
        )}

        <Suspense fallback={<div className="h-10 w-full rounded-2xl border bg-card animate-pulse" />}>
          <Pagination currentPage={queryResult.currentPage} totalPages={queryResult.totalPages} basePath="/" />
        </Suspense>
      </section>
    </div>
  );
}

// ==========================================
// 2. FINANCES TAB (Mercadillo & Finanzas)
// ==========================================
async function FinancesTab() {
  const summary = await getFinancialSummary();

  // Fetch games in sale/sold
  const financialGames = await prisma.game.findMany({
    where: {
      status: { in: ["for_sale", "sold"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Aggregates Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Investment */}
        <div className="rounded-2xl border bg-card p-4.5 shadow-premium flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Inversión Activa</span>
            <Wallet size={16} className="text-primary" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-heading font-black text-foreground block">
              {summary.totalInvestment.toFixed(2)}€
            </span>
            <span className="text-[9px] text-muted-foreground block mt-0.5">
              Valor de compra de stock actual
            </span>
          </div>
        </div>

        {/* Estimated Market Value */}
        <div className="rounded-2xl border bg-card p-4.5 shadow-premium flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Valor de Mercado</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-heading font-black text-emerald-500 block">
              {summary.estimatedMarketValue.toFixed(2)}€
            </span>
            <span className="text-[9px] text-muted-foreground block mt-0.5">
              Suma de precios mínimos/medios
            </span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="rounded-2xl border bg-card p-4.5 shadow-premium flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ventas / Recuperado</span>
            <DollarSign size={16} className="text-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-heading font-black text-indigo-500 block">
              {summary.totalRevenue.toFixed(2)}€
            </span>
            <span className="text-[9px] text-muted-foreground block mt-0.5">
              Capital recuperado vendido
            </span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="rounded-2xl border bg-card p-4.5 shadow-premium flex flex-col justify-between min-h-[110px]">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Beneficio Ventas</span>
            {summary.netProfitOnSales >= 0 ? (
              <TrendingUp size={16} className="text-emerald-500" />
            ) : (
              <TrendingDown size={16} className="text-red-500" />
            )}
          </div>
          <div className="mt-2">
            <span className={`text-xl font-heading font-black block ${
              summary.netProfitOnSales >= 0 ? "text-emerald-500" : "text-red-500"
            }`}>
              {summary.netProfitOnSales >= 0 ? "+" : ""}{summary.netProfitOnSales.toFixed(2)}€
            </span>
            <span className="text-[9px] text-muted-foreground block mt-0.5">
              Beneficio real sobre vendidos
            </span>
          </div>
        </div>

        {/* ROI */}
        <div className="rounded-2xl border bg-card p-4.5 shadow-premium flex flex-col justify-between min-h-[110px] col-span-2 lg:col-span-1">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">ROI Real</span>
            <Percent size={16} className="text-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-heading font-black text-foreground block">
              {summary.roiOnSales.toFixed(1)}%
            </span>
            <span className="text-[9px] text-muted-foreground block mt-0.5">
              Retorno sobre inversión de ventas
            </span>
          </div>
        </div>

      </div>

      {/* Mercadillo Table */}
      <div className="rounded-2xl border bg-card p-5 shadow-premium">
        <h3 className="font-heading text-sm font-bold text-foreground mb-4">
          Catálogo del Mercadillo (En Venta y Vendidos)
        </h3>

        {financialGames.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            Ningún juego en venta o marcado como vendido todavía. Modifica las finanzas en la ficha de detalle de un juego.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground font-bold">
                  <th className="pb-3 w-12" />
                  <th className="pb-3">Juego</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">P. Compra</th>
                  <th className="pb-3">P. Objetivo / Final</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {financialGames.map((game) => (
                  <tr key={game.id} className="hover:bg-muted/10 transition-colors">
                    {/* Thumbnail */}
                    <td className="py-3">
                      {game.thumbnailUrl && (
                        <img
                          src={game.thumbnailUrl}
                          alt={game.name}
                          className="h-9 w-9 rounded-lg object-cover border bg-muted"
                        />
                      )}
                    </td>
                    {/* Title */}
                    <td className="py-3 font-semibold text-foreground">
                      <div className="flex flex-col gap-0.5">
                        <span>{game.spanishName || game.name}</span>
                        {game.spanishName && game.name !== game.spanishName && (
                          <span className="text-[9px] text-muted-foreground font-normal italic">{game.name}</span>
                        )}
                      </div>
                    </td>
                    {/* Status Badge */}
                    <td className="py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        game.status === "for_sale"
                          ? "bg-orange-500/10 border border-orange-500/20 text-orange-500"
                          : "bg-red-500/10 border border-red-500/20 text-red-500"
                      }`}>
                        {game.status === "for_sale" ? "En Venta" : "Vendido"}
                      </span>
                    </td>
                    {/* Purchase Price */}
                    <td className="py-3 font-medium text-foreground">
                      {game.purchasePrice !== null ? `${game.purchasePrice.toFixed(2)}€` : "-"}
                    </td>
                    {/* Sell or Sold Price */}
                    <td className="py-3 font-bold text-foreground">
                      {game.status === "sold" ? (
                        <span className="text-indigo-500">
                          {game.soldPrice !== null ? `${game.soldPrice.toFixed(2)}€` : "-"}
                        </span>
                      ) : (
                        <span className="text-orange-500">
                          {game.sellPrice !== null ? `${game.sellPrice.toFixed(2)}€` : "-"}
                        </span>
                      )}
                    </td>
                    {/* Link */}
                    <td className="py-3 text-right">
                      <Link
                        href={`/game/${game.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-secondary hover:bg-primary hover:text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        <span>Ficha</span>
                        <ArrowRight size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

// ==========================================
// 3. PLAYS TAB (Diario de Partidas)
// ==========================================
async function PlaysTab({ autocompleteGames }: { autocompleteGames: { bggId: number; name: string; thumbnailUrl: string | null }[] }) {
  const sessions = await getPlaySessions();
  const stats = await getPlayStats();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
      
      {/* Left Column: Register Form */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <PlayLogForm games={autocompleteGames} />
        <ImportBggPlays />
      </div>

      {/* Right Column: Statistics & Logs */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        
        {/* Plays Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-card p-4 shadow-premium text-center">
            <Gamepad2 size={18} className="mx-auto text-primary mb-1.5" />
            <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Partidas</span>
            <span className="text-lg font-heading font-black text-foreground mt-0.5 block">{stats.totalPlays}</span>
          </div>
          
          <div className="rounded-2xl border bg-card p-4 shadow-premium text-center">
            <Clock size={18} className="mx-auto text-emerald-500 mb-1.5" />
            <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Horas de Juego</span>
            <span className="text-lg font-heading font-black text-foreground mt-0.5 block">{stats.totalHours}h</span>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-premium text-center">
            <Trophy size={18} className="mx-auto text-amber-500 mb-1.5" />
            <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Win Rate Top</span>
            <span className="text-lg font-heading font-black text-foreground mt-0.5 block">
              {stats.winRates.length > 0 ? `${stats.winRates[0].winRate}%` : "N/A"}
            </span>
          </div>
        </div>

        {/* Win Rates list */}
        {stats.winRates.length > 0 && (
          <div className="rounded-2xl border bg-card p-5 shadow-premium">
            <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <Trophy size={14} className="text-amber-500" />
              <span>Tasa de Victorias de Jugadores</span>
            </h4>
            <div className="flex flex-wrap gap-3">
              {stats.winRates.map((w, idx) => (
                <div key={idx} className="rounded-xl border bg-muted/10 px-3 py-2 text-xs flex items-center gap-2">
                  <span className="font-bold text-foreground">{w.name}</span>
                  <div className="h-3 w-px bg-muted" />
                  <span className="text-muted-foreground">{w.wins}/{w.plays} wins</span>
                  <span className="font-black text-emerald-500">{w.winRate}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Played Games (Current Year) */}
        {stats.topGames.length > 0 && (
          <div className="rounded-2xl border bg-card p-5 shadow-premium">
            <h4 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              <span>Top Juegos Más Jugados ({new Date().getFullYear()})</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              {stats.topGames.map((game, idx) => (
                <div key={idx} className="rounded-xl border bg-muted/20 p-2.5 text-center flex flex-col items-center justify-between min-h-[110px]">
                  {game.thumbnail ? (
                    <img src={game.thumbnail} alt={game.name} className="h-10 w-10 rounded-md object-cover border bg-muted" />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center text-muted-foreground"><Gamepad2 size={16} /></div>
                  )}
                  <span className="font-semibold text-[10px] text-foreground leading-tight line-clamp-2 mt-1 w-full">{game.name}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.2 text-[9px] font-black text-primary mt-1 shrink-0">{game.count} part.</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chronological List of Play Sessions */}
        <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4">
          <h3 className="font-heading text-sm font-bold text-foreground border-b pb-3">
            Historial de Partidas
          </h3>

          {sessions.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              Aún no has registrado ninguna partida. Completa el formulario de la izquierda o importa tus datos de BGG.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 max-h-[500px] overflow-y-auto pr-1">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-xl border bg-muted/10 p-3.5 flex items-start justify-between gap-4 text-xs hover:bg-muted/20 transition-all">
                  
                  {/* Left: Thumbnail & Session Details */}
                  <div className="flex gap-3">
                    {s.gameThumbnail ? (
                      <img src={s.gameThumbnail} alt={s.gameName} className="h-12 w-12 rounded-lg object-cover border bg-muted shrink-0 mt-0.5" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0 border mt-0.5"><Gamepad2 size={20} /></div>
                    )}
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-bold text-foreground leading-tight">{s.gameName}</span>
                      
                      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground font-semibold">
                        <span className="flex items-center gap-0.5"><Calendar size={10} /> {new Date(s.playedAt).toLocaleDateString()}</span>
                        {s.durationMinutes && <span className="flex items-center gap-0.5"><Clock size={10} /> {s.durationMinutes} min</span>}
                        {s.location && <span className="flex items-center gap-0.5"><MapPin size={10} /> {s.location}</span>}
                        <span className="rounded-full bg-secondary/80 px-2 py-0.2 text-[8px] font-black uppercase text-muted-foreground border">{s.mode}</span>
                        {s.rating && <span className="rounded-full bg-amber-500/10 px-2 py-0.2 text-[8px] font-black text-amber-500 flex items-center gap-0.5 border border-amber-500/20"><Sparkles size={8} />{s.rating}/10</span>}
                      </div>

                      {/* Players */}
                      {s.players.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {s.players.map((p) => (
                            <span
                              key={p.id}
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-semibold border ${
                                p.isWinner
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-bold"
                                  : "bg-muted border-transparent text-foreground"
                              }`}
                            >
                              <span>{p.name}</span>
                              {p.score !== null && <span className="opacity-75 font-normal">({p.score})</span>}
                              {p.faction && <span className="text-[8px] opacity-75 font-normal">[{p.faction}]</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {s.notes && (
                        <p className="text-[10px] text-muted-foreground italic leading-relaxed border-t border-dashed mt-2.5 pt-2 whitespace-pre-wrap max-w-lg">
                          &quot;{s.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Deletion */}
                  <DeletePlayButton id={s.id} />

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

// ==========================================
// 4. PURGA TAB (Pérdida de Tiempo / Purga)
// ==========================================
async function PurgaTab() {
  // Fetch active collection
  const activeCollection = await prisma.game.findMany({
    where: {
      owned: true,
      status: { in: ["in_collection", "for_sale"] }
    },
    include: {
      linkedWallapop: true
    }
  });

  // Fetch all plays
  const allSessions = await prisma.playSession.findMany({
    select: { bggId: true, playedAt: true }
  });

  // Maps plays to BGG IDs
  const playDatesMap: Record<number, Date[]> = {};
  for (const s of allSessions) {
    if (s.bggId !== null) {
      if (!playDatesMap[s.bggId]) {
        playDatesMap[s.bggId] = [];
      }
      playDatesMap[s.bggId].push(new Date(s.playedAt));
    }
  }

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Compute purge score (1 to 100)
  const purgeCandidates = activeCollection.map(game => {
    let score = 0;
    const gamePlayDates = playDatesMap[game.bggId] || [];
    const playedInLast12Months = gamePlayDates.some(date => date >= twelveMonthsAgo);

    // Score components:
    // 1. Not played in last 12 months (+30 pts)
    if (!playedInLast12Months) score += 30;
    // 2. Rating < 6 (+25 pts)
    if (game.personalRating !== null && game.personalRating < 6) score += 25;
    // 3. Retention status is "expendable" (+30 pts)
    if (game.retentionStatus === "expendable") score += 30;
    // 4. Never played (+15 pts)
    if (!game.played && gamePlayDates.length === 0) score += 15;

    return {
      id: game.id,
      bggId: game.bggId,
      name: game.name,
      spanishName: game.spanishName,
      thumbnailUrl: game.thumbnailUrl,
      personalRating: game.personalRating,
      retentionStatus: game.retentionStatus,
      played: game.played,
      score,
      playedInLast12Months,
      playsCount: gamePlayDates.length
    };
  })
  .filter(game => game.score > 0)
  .sort((a, b) => b.score - a.score);

  // Task Queue (Inconsistencies)
  const tasks: { type: "price" | "sold" | "expendable"; game: (typeof activeCollection)[number]; text: string; actionLabel: string }[] = [];

  for (const game of activeCollection) {
    // 1. Owned but no purchasePrice
    if (game.purchasePrice === null) {
      tasks.push({
        type: "price",
        game,
        text: `El juego "${game.spanishName || game.name}" está en posesión pero no tiene registrado un precio de compra.`,
        actionLabel: "Añadir precio",
      });
    }

    // 2. Expendable but has high market value (Ludonauta price > 30€)
    if (game.retentionStatus === "expendable" && game.ludonautaCache) {
      try {
        const cache = JSON.parse(game.ludonautaCache) as { offers?: { price: number | null; stock: string }[] };
        const inStockOffers = cache.offers?.filter((o) => o.stock === "En stock" && o.price !== null) || [];
        if (inStockOffers.length > 0) {
          const minPrice = Math.min(...inStockOffers.map((o) => o.price as number));
          if (minPrice > 30) {
            tasks.push({
              type: "expendable",
              game,
              text: `"${game.spanishName || game.name}" es "Prescindible", pero cotiza a ${minPrice.toFixed(2)}€ en Ludonauta.`,
              actionLabel: "Poner en venta",
            });
          }
        }
      } catch {
        // ignore parse error
      }
    }
  }

  // Sold but no soldPrice
  const soldGamesMissingPrice = await prisma.game.findMany({
    where: {
      status: "sold",
      soldPrice: null,
    },
    include: {
      linkedWallapop: true
    }
  });

  for (const game of soldGamesMissingPrice) {
    tasks.push({
      type: "sold",
      game,
      text: `El juego "${game.spanishName || game.name}" está "Vendido" pero no se ha registrado su precio final de venta.`,
      actionLabel: "Saldar",
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
      
      {/* Left Column: Task Queue */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="font-heading text-sm font-bold text-foreground">
              Cola de Diagnóstico de Datos
            </h3>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 size={22} className="text-emerald-500" />
              <span>¡Felicidades! No se han encontrado inconsistencias en tu base de datos contable.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {tasks.map((task, idx) => (
                <div key={idx} className="rounded-xl border border-dashed p-3 text-xs flex flex-col gap-3.5 bg-muted/5">
                  <p className="text-muted-foreground leading-relaxed leading-normal">{task.text}</p>
                  
                  <div className="flex items-center justify-between border-t border-dashed pt-3">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Acción Sugerida</span>
                    
                    {task.type === "expendable" ? (
                      <QuickStatusButton
                        bggId={task.game.bggId}
                        newStatus="for_sale"
                        label={task.actionLabel}
                      />
                    ) : (
                      <Link
                        href={`/game/${task.game.id}`}
                        className="rounded-lg bg-secondary hover:bg-primary hover:text-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-foreground transition-all shadow-sm"
                      >
                        {task.actionLabel}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Purge Candidates */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="rounded-2xl border bg-card p-5 shadow-premium flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Inbox size={18} className="text-primary" />
              <h3 className="font-heading text-sm font-bold text-foreground">
                Algoritmo Inteligente: Candidatos a Purga
              </h3>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              Prioridad por Puntuación
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed border-b pb-4 border-dashed">
            Esta lista muestra los juegos de tu colección ordenados según su grado de prescindibilidad (puntuación del 1 al 100), calculado en base a partidas registradas en el último año, valoraciones bajas y etiquetas de retención manuales.
          </p>

          {purgeCandidates.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              No hay candidatos con puntuación de purga activa en tu colección. ¡Buen trabajo!
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {purgeCandidates.map((c) => (
                <div key={c.id} className="rounded-xl border bg-muted/10 p-3 flex items-center justify-between gap-4 hover:bg-muted/20 transition-all text-xs">
                  
                  {/* Thumbnail & Title */}
                  <div className="flex items-center gap-3">
                    {c.thumbnailUrl ? (
                      <img src={c.thumbnailUrl} alt={c.name} className="h-11 w-11 rounded-lg object-cover border bg-muted shrink-0" />
                    ) : (
                      <div className="h-11 w-11 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0 border"><Gamepad2 size={16} /></div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-foreground leading-tight">{c.spanishName || c.name}</span>
                      
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground font-semibold flex-wrap">
                        <span className={`px-1 text-[8px] rounded uppercase ${c.playedInLast12Months ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                          {c.playedInLast12Months ? "Jugado este año" : "Sin jugar este año"}
                        </span>
                        {c.retentionStatus && (
                          <span className="text-muted-foreground">Retención: {c.retentionStatus}</span>
                        )}
                        {c.personalRating && (
                          <span>Nota: {c.personalRating}/10</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score & Quick sell action */}
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Score badge */}
                    <div className="text-center">
                      <span className="block text-[8px] text-muted-foreground uppercase font-black tracking-wider">Purga</span>
                      <span className="text-sm font-heading font-black text-primary">{c.score} pts</span>
                    </div>

                    <QuickStatusButton
                      bggId={c.bggId}
                      newStatus="for_sale"
                      label="Vender"
                      className="rounded-lg bg-orange-500 hover:bg-orange-600 text-[10px] font-black uppercase tracking-wider text-white shadow-sm px-2.5 py-1.5 transition-all"
                    />
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
