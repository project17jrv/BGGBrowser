import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import AdminSync from "@/components/AdminSync";
import { Settings } from "lucide-react";

export const metadata = {
  title: "Administración - BoardGameGeek Explorer",
  description: "Panel de control para la sincronización y administración de la base de datos local.",
};

export default async function AdminPage() {
  // Query all database stats and last update dates in parallel
  const [
    gamesCount,
    ownedGamesCount,
    categoriesCount,
    mechanicsCount,
    designersCount,
    publishersCount,
    recentGames,
    lastCollectionSync,
    lastRankingSync,
    lastGlobalSync
  ] = await Promise.all([
    prisma.game.count(),
    prisma.game.count({ where: { owned: true } }),
    prisma.category.count(),
    prisma.mechanic.count(),
    prisma.designer.count(),
    prisma.publisher.count(),
    prisma.game.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        bggId: true,
        rank: true,
        averageRating: true,
      },
    }),
    prisma.game.findFirst({
      where: {
        OR: [
          { owned: true },
          { status: "wishlist" }
        ]
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true }
    }),
    prisma.game.findFirst({
      where: { rank: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true }
    }),
    prisma.game.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true }
    })
  ]);

  const stats = {
    games: gamesCount,
    ownedGames: ownedGamesCount,
    categories: categoriesCount,
    mechanics: mechanicsCount,
    designers: designersCount,
    publishers: publishersCount,
  };

  const defaultUsername = process.env.BGG_USERNAME || "boardgamegeek";

  const lastSyncDates = {
    collection: lastCollectionSync?.updatedAt?.toISOString() || null,
    ranking: lastRankingSync?.updatedAt?.toISOString() || null,
    global: lastGlobalSync?.updatedAt?.toISOString() || null,
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col pb-12">
      <Header />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6">
        
        {/* Page Header */}
        <div className="flex items-center gap-2 border-b pb-4">
          <Settings size={22} className="text-primary stroke-[2.5]" />
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Panel Administrativo
            </h1>
            <p className="text-xs text-muted-foreground">
              Gestiona e importa tu catálogo local de juegos de mesa desde BoardGameGeek.
            </p>
          </div>
        </div>

        {/* Sync panel */}
        <AdminSync
          stats={stats}
          recentGames={recentGames}
          defaultUsername={defaultUsername}
          lastSyncDates={lastSyncDates}
        />

      </div>
    </main>
  );
}
