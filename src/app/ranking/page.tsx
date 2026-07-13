import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getGames, getFilterMetadata } from "@/lib/actions";
import Header from "@/components/Header";
import Filters from "@/components/Filters";
import GameCard from "@/components/GameCard";
import SearchInput from "@/components/SearchInput";
import SortAndSize from "@/components/SortAndSize";
import Pagination from "@/components/Pagination";
import Onboarding from "@/components/Onboarding";
import BggImportButton from "@/components/BggImportButton";
import { Layers } from "lucide-react";

export const metadata = {
  title: "Top BGG - BoardGameGeek Explorer",
  description: "Explora los mejores juegos de mesa según el ranking global de BoardGameGeek.",
};

interface RankingProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RankingPage({ searchParams }: RankingProps) {
  const resolvedSearchParams = await searchParams;

  // Check if database has any games. If empty, show Onboarding.
  const dbGamesCount = await prisma.game.count();
  if (dbGamesCount === 0) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <Header />
        <Onboarding />
      </main>
    );
  }

  // Fetch filter configuration metadata (ownedOnly = false)
  const metadata = await getFilterMetadata(false);
  const getParam = (val: string | string[] | undefined): string | undefined => {
    if (!val) return undefined;
    return Array.isArray(val) ? val[0] : val;
  };

  // Parse parameters for data fetching
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

  const showExpansions = getParam(resolvedSearchParams.expansions) !== "false";
  const interestingOnly = getParam(resolvedSearchParams.interestingOnly) === "true";

  // Execute database query (ownedOnly = false)
  const queryResult = await getGames({
    page,
    size,
    search,
    minRating,
    maxRating,
    minRank,
    maxRank: maxRank ?? 1000,
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
    ownedOnly: false,
    showExpansions,
    excludeUnranked: true,
    interestingOnly,
  });

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Layout: Sidebar and Content */}
        <div className="flex flex-col gap-8 lg:flex-row items-start">
          
          {/* Filters Sidebar (1/4 width on desktop) */}
          <aside className="w-full shrink-0 lg:w-72 lg:sticky lg:top-22">
            <Suspense fallback={<div className="h-[500px] w-full rounded-2xl border bg-card animate-pulse" />}>
              <Filters
                categories={metadata.categories}
                mechanics={metadata.mechanics}
                minYear={metadata.minYear}
                maxYear={metadata.maxYear}
                maxRank={Math.min(metadata.maxRank, 1000)}
                basePath="/ranking"
              />
            </Suspense>
          </aside>

          {/* Main Grid View Content (3/4 width on desktop) */}
          <section className="flex-1 w-full flex flex-col gap-6">
            
            {/* Topbar: Search and Sorting controls */}
            <Suspense fallback={<div className="h-16 w-full rounded-2xl border bg-card animate-pulse" />}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-card p-4 shadow-premium transition-all duration-300">
                <SearchInput basePath="/ranking" />
                <SortAndSize basePath="/ranking" />
              </div>
            </Suspense>

            {/* Games Grid Status Header */}
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
              <span>
                Mostrando <span className="font-bold text-foreground">{queryResult.games.length}</span> de{" "}
                <span className="font-bold text-foreground">{queryResult.totalCount}</span> juegos en el ranking general
              </span>
              {showFavoritesOnly && (
                <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-500">
                  Filtro: Favoritos Activo
                </span>
              )}
            </div>

            {/* Top Pagination Controls */}
            <Suspense fallback={<div className="h-10 w-full rounded-2xl border bg-card animate-pulse" />}>
              <Pagination currentPage={queryResult.currentPage} totalPages={queryResult.totalPages} basePath="/ranking" />
            </Suspense>

            {/* Grid display */}
            {queryResult.games.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {queryResult.games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              /* Empty Search / Filters Result State */
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-12 text-center shadow-sm min-h-[300px] transition-all duration-300">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground mb-4">
                  <Layers size={22} />
                </div>
                <h3 className="font-heading text-sm font-bold text-foreground">
                  No se encontraron juegos
                </h3>
                <p className="mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
                  Prueba a ajustar o limpiar los parámetros de búsqueda o valoración para ver otros títulos.
                </p>

                <div className="mt-6 flex flex-col items-center border-t border-dashed w-full pt-6 max-w-xs gap-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    ¿No está importado en la base de datos?
                  </p>
                  <BggImportButton query={search || ""} />
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            <Suspense fallback={<div className="h-10 w-full rounded-2xl border bg-card animate-pulse" />}>
              <Pagination currentPage={queryResult.currentPage} totalPages={queryResult.totalPages} basePath="/ranking" />
            </Suspense>

          </section>

        </div>
      </div>
    </main>
  );
}
