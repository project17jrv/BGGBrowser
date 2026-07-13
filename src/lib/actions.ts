"use server";

import { prisma } from "./db";
import { Prisma } from "@prisma/client";
import { getLudonautaPrices } from "./ludonauta";
import { revalidatePath } from "next/cache";

export interface GetGamesParams {
  search?: string;
  page?: number;
  size?: number;
  minRating?: number;
  maxRating?: number;
  minRank?: number;
  maxRank?: number;
  minYear?: number;
  maxYear?: number;
  players?: number;
  bestPlayers?: number;
  minPlayTime?: number;
  maxPlayTime?: number;
  minComplexity?: number;
  maxComplexity?: number;
  categories?: string[];
  mechanics?: string[];
  sortBy?: "rank" | "averageRating" | "name" | "yearPublished" | "complexityWeight";
  sortOrder?: "asc" | "desc";
  favoriteBggIds?: number[];
  showFavoritesOnly?: boolean;
  ownedOnly?: boolean;
  showExpansions?: boolean;
  excludeUnranked?: boolean;
  showOwned?: boolean;
  showWishlist?: boolean;
  showInteresting?: boolean;
  interestingOnly?: boolean;
}

export async function getGames(params: GetGamesParams) {
  const page = params.page || 1;
  const size = params.size || 12;
  const skip = (page - 1) * size;

  // Build where conditions
  const where: Prisma.GameWhereInput = { AND: [] };
  const andConditions = where.AND as Prisma.GameWhereInput[];

  // Owned only filter (includes owned games, BGG wishlist, and local wishlist)
  if (params.ownedOnly) {
    const orConditions: Prisma.GameWhereInput[] = [];
    if (params.showOwned !== false) {
      orConditions.push({ owned: true });
    }
    if (params.showWishlist !== false) {
      orConditions.push({ status: "wishlist" });
    }
    if (params.showInteresting !== false) {
      orConditions.push({ isInteresting: true });
    }

    if (orConditions.length > 0) {
      andConditions.push({
        OR: orConditions
      });
    } else {
      // Force 0 results if all toggled off
      andConditions.push({
        id: "none"
      });
    }
  }
  
  // Interesting only filter
  if (params.interestingOnly) {
    andConditions.push({
      isInteresting: true,
    });
  }

  // Expansions filter
  if (params.showExpansions === false) {
    andConditions.push({
      isExpansion: false,
    });
  }

  // Search by Name (full or partial, case-insensitive)
  if (params.search) {
    andConditions.push({
      OR: [
        {
          name: {
            contains: params.search,
          },
        },
        {
          spanishName: {
            contains: params.search,
          },
        },
      ],
    });
  }

  // Rating filter
  if (params.minRating !== undefined || params.maxRating !== undefined) {
    andConditions.push({
      averageRating: {
        gte: params.minRating ?? 0,
        lte: params.maxRating ?? 10,
      },
    });
  }

  // Rank filter
  if (params.minRank !== undefined || params.maxRank !== undefined) {
    // Note: unranked games (rank = null) are excluded if a rank filter is active
    andConditions.push({
      rank: {
        not: null,
        gte: params.minRank ?? 1,
        lte: params.maxRank ?? 999999,
      },
    });
  } else if (params.excludeUnranked) {
    andConditions.push({
      rank: {
        not: null,
      },
    });
  }

  // Year filter
  if (params.minYear !== undefined || params.maxYear !== undefined) {
    andConditions.push({
      yearPublished: {
        gte: params.minYear ?? 1800,
        lte: params.maxYear ?? 2030,
      },
    });
  }

  // Players count filter (supports both exact match and range fit)
  if (params.players !== undefined) {
    andConditions.push({
      minPlayers: { lte: params.players },
      maxPlayers: { gte: params.players },
    });
  }

  // Best players count filter (exact or CSV lookup)
  if (params.bestPlayers !== undefined) {
    const val = String(params.bestPlayers);
    andConditions.push({
      OR: [
        { bestPlayers: { equals: val } },
        { bestPlayers: { startsWith: `${val},` } },
        { bestPlayers: { endsWith: `, ${val}` } },
        { bestPlayers: { contains: `, ${val},` } }
      ]
    });
  }

  // Playtime duration filter (overlap check)
  if (params.minPlayTime !== undefined || params.maxPlayTime !== undefined) {
    const minDur = params.minPlayTime ?? 0;
    const maxDur = params.maxPlayTime ?? 9999;
    andConditions.push({
      minPlayTime: { lte: maxDur },
      maxPlayTime: { gte: minDur },
    });
  }

  // Complexity weight filter
  if (params.minComplexity !== undefined || params.maxComplexity !== undefined) {
    andConditions.push({
      complexityWeight: {
        gte: params.minComplexity ?? 1.0,
        lte: params.maxComplexity ?? 5.0,
      },
    });
  }

  // Categories filter (OR match)
  if (params.categories && params.categories.length > 0) {
    andConditions.push({
      categories: {
        some: {
          name: {
            in: params.categories,
          },
        },
      },
    });
  }

  // Mechanics filter (OR match)
  if (params.mechanics && params.mechanics.length > 0) {
    andConditions.push({
      mechanics: {
        some: {
          name: {
            in: params.mechanics,
          },
        },
      },
    });
  }

  // Favorites filter
  if (params.showFavoritesOnly) {
    const favIds = params.favoriteBggIds || [];
    andConditions.push({
      bggId: {
        in: favIds,
      },
    });
  }

  // Sorting
  const sortBy = params.sortBy || "rank";
  const sortOrder = params.sortOrder || (sortBy === "averageRating" ? "desc" : "asc");
  
  let orderBy: Prisma.GameOrderByWithRelationInput = {};

  if (sortBy === "rank") {
    orderBy = {
      rank: {
        sort: sortOrder,
        nulls: "last",
      },
    };
  } else {
    orderBy = { [sortBy]: sortOrder };
  }

  try {
    const [games, totalCount] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy,
        skip,
        take: size,
        include: {
          categories: true,
          mechanics: true,
        },
      }),
      prisma.game.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / size);

    return {
      games,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize: size,
    };
  } catch (error) {
    console.error("Error executing getGames query:", error);
    return {
      games: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: page,
      pageSize: size,
    };
  }
}

export async function getFilterMetadata(ownedOnly?: boolean) {
  try {
    const [categories, mechanics, aggregates] = await Promise.all([
      prisma.category.findMany({
        where: ownedOnly ? { games: { some: { owned: true } } } : undefined,
        orderBy: { name: "asc" },
        select: { name: true },
      }),
      prisma.mechanic.findMany({
        where: ownedOnly ? { games: { some: { owned: true } } } : undefined,
        orderBy: { name: "asc" },
        select: { name: true },
      }),
      prisma.game.aggregate({
        where: ownedOnly ? { owned: true } : undefined,
        _min: {
          yearPublished: true,
          rank: true,
        },
        _max: {
          yearPublished: true,
          rank: true,
        },
      }),
    ]);

    return {
      categories: categories.map((c) => c.name),
      mechanics: mechanics.map((m) => m.name),
      minYear: aggregates._min.yearPublished || 1990,
      maxYear: aggregates._max.yearPublished || new Date().getFullYear(),
      maxRank: aggregates._max.rank || 1000,
    };
  } catch (error) {
    console.error("Error fetching filter metadata:", error);
    return {
      categories: [],
      mechanics: [],
      minYear: 1990,
      maxYear: new Date().getFullYear(),
      maxRank: 1000,
    };
  }
}

export async function getGameDetail(id: string) {
  try {
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        categories: true,
        mechanics: true,
        designers: true,
        publishers: true,
        linkedWallapop: true,
      },
    });

    if (game && game.description) {
      const hasEnglish = /\b(the|and|of|is|with|players|game|board|rules)\b/i.test(game.description);
      if (hasEnglish) {
        console.log(`[Auto-Translate] Automatically translating description to Spanish for: ${game.name}`);
        try {
          const translatedText = await translateText(game.description);
          if (translatedText && translatedText !== game.description) {
            await prisma.game.update({
              where: { id },
              data: { description: translatedText },
            });
            game.description = translatedText;
          }
        } catch (err) {
          console.error(`[Auto-Translate] Failed to auto-translate for ${game.name}:`, err);
        }
      }
    }

    return game;
  } catch (error) {
    console.error(`Error fetching game detail for ID "${id}":`, error);
    return null;
  }
}

export async function clearDatabase() {
  try {
    await prisma.$transaction([
      prisma.game.deleteMany(),
      prisma.category.deleteMany(),
      prisma.mechanic.deleteMany(),
      prisma.designer.deleteMany(),
      prisma.publisher.deleteMany(),
      prisma.linkedWallapopItem.deleteMany(),
      prisma.playSession.deleteMany(),
      prisma.playSessionPlayer.deleteMany(),
    ]);
    return { success: true };
  } catch (error) {
    console.error("Failed to clear database:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// --- ACCIONES FINANCIERAS Y DE LUDOTECA PREMIUM ---

import { Game } from "@prisma/client";

export async function updateGameFinancials(bggId: number, data: Partial<Game>) {
  try {
    const updated = await prisma.game.update({
      where: { bggId },
      data: {
        status: data.status,
        purchasePrice: data.purchasePrice !== undefined ? data.purchasePrice : undefined,
        sellPrice: data.sellPrice !== undefined ? data.sellPrice : undefined,
        soldPrice: data.soldPrice !== undefined ? data.soldPrice : undefined,
        personalRating: data.personalRating !== undefined ? data.personalRating : undefined,
        physicalState: data.physicalState,
        retentionStatus: data.retentionStatus,
        played: data.played !== undefined ? data.played : undefined,
        notes: data.notes,
        spanishName: data.spanishName,
        youtubeUrl: data.youtubeUrl,
        pdfUrl: data.pdfUrl,
        purchaseCondition: data.purchaseCondition,
        isInteresting: data.isInteresting !== undefined ? data.isInteresting : undefined,
        // sync owned boolean with status if applicable
        owned: data.status ? (data.status === "in_collection" || data.status === "for_sale") : undefined,
      },
    });
    return { success: true, game: updated };
  } catch (error) {
    console.error(`Failed to update financials for BGG ID ${bggId}:`, error);
    return { success: false, error: String(error) };
  }
}

export async function getFinancialSummary() {
  try {
    // Fetch all games with financial fields
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { owned: true },
          { status: "sold" }
        ]
      },
      select: {
        id: true,
        bggId: true,
        name: true,
        status: true,
        purchasePrice: true,
        soldPrice: true,
        ludonautaCache: true,
        excludedWallapopIds: true,
        linkedWallapop: true,
      },
    });

    let totalInvestment = 0; // purchasePrice of non-sold games
    let totalRevenue = 0;    // soldPrice of sold games
    let soldInvestment = 0;  // purchasePrice of sold games

    for (const game of games) {
      const buyPrice = game.purchasePrice || 0;
      if (game.status === "sold") {
        totalRevenue += game.soldPrice || 0;
        soldInvestment += buyPrice;
      } else {
        totalInvestment += buyPrice;
      }
    }

    const netProfitOnSales = totalRevenue - soldInvestment;
    const roiOnSales = soldInvestment > 0 ? (netProfitOnSales / soldInvestment) * 100 : 0;
    const netCashflow = totalRevenue - (totalInvestment + soldInvestment);

    // Calculate Estimated Market Value for owned games
    // Sum of minimum price of Ludonauta or average price of Wallapop of games in collection / for_sale
    let estimatedMarketValue = 0;
    const activeInventory = games.filter(g => g.status === "in_collection" || g.status === "for_sale");

    for (const game of activeInventory) {
      let gameVal = 0;
      
      // 1. Manual Wallapop average price (if available)
      const excludedIds = game.excludedWallapopIds ? game.excludedWallapopIds.split(",").filter(Boolean) : [];
      const activeWallapop = game.linkedWallapop.filter(item => !excludedIds.includes(item.id));
      
      if (activeWallapop.length > 0) {
        const sum = activeWallapop.reduce((acc, item) => acc + item.price, 0);
        gameVal = sum / activeWallapop.length;
      } else if (game.ludonautaCache) {
        // 2. Ludonauta average price of in-stock offers
        try {
          const cache = JSON.parse(game.ludonautaCache) as { offers?: { price: number | null; stock: string }[] };
          const inStockOffers = cache.offers?.filter((o) => o.stock === "En stock" && o.price !== null) || [];
          if (inStockOffers.length > 0) {
            const prices = inStockOffers.map((o) => o.price as number);
            const sum = prices.reduce((acc, p) => acc + p, 0);
            gameVal = sum / prices.length;
          } else if (cache.offers && cache.offers.length > 0) {
            // Fallback to average of any offer
            const allPrices = cache.offers.map((o) => o.price).filter((p): p is number => p !== null);
            if (allPrices.length > 0) {
              const sum = allPrices.reduce((acc, p) => acc + p, 0);
              gameVal = sum / allPrices.length;
            }
          }
        } catch {
          // ignore cache parse error
        }
      }

      // If no market data, fallback to purchase price
      estimatedMarketValue += gameVal > 0 ? gameVal : (game.purchasePrice || 0);
    }

    return {
      totalInvestment,
      totalRevenue,
      soldInvestment,
      netProfitOnSales,
      roiOnSales,
      netCashflow,
      estimatedMarketValue,
    };
  } catch (error) {
    console.error("Failed to fetch financial summary:", error);
    return {
      totalInvestment: 0,
      totalRevenue: 0,
      soldInvestment: 0,
      netProfitOnSales: 0,
      roiOnSales: 0,
      netCashflow: 0,
      estimatedMarketValue: 0,
    };
  }
}

// --- DIARIO DE PARTIDAS ACTIONS ---

export interface PlaySessionInput {
  bggId?: number;
  gameName: string;
  gameThumbnail?: string;
  playedAt: Date;
  location?: string;
  durationMinutes?: number;
  mode: string; // "competitive" | "cooperative" | "solo" | "team"
  result?: string; // "win" | "loss" | "draw" | "unfinished"
  notes?: string;
  rating?: number;
  players: {
    name: string;
    score?: number;
    isWinner: boolean;
    faction?: string;
    role?: string;
  }[];
}

export async function createPlaySession(data: PlaySessionInput) {
  try {
    const play = await prisma.playSession.create({
      data: {
        bggId: data.bggId,
        gameName: data.gameName,
        gameThumbnail: data.gameThumbnail,
        playedAt: data.playedAt,
        location: data.location,
        durationMinutes: data.durationMinutes,
        mode: data.mode,
        result: data.result,
        notes: data.notes,
        rating: data.rating,
        players: {
          create: data.players,
        },
      },
      include: {
        players: true,
      },
    });

    // Mark game as played in Collection if it exists
    if (data.bggId) {
      await prisma.game.updateMany({
        where: { bggId: data.bggId },
        data: { played: true },
      });
    }

    return { success: true, play };
  } catch (error) {
    console.error("Failed to create play session:", error);
    return { success: false, error: String(error) };
  }
}

export async function deletePlaySession(id: string) {
  try {
    await prisma.playSession.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete play session:", error);
    return { success: false, error: String(error) };
  }
}

export async function getPlaySessions() {
  try {
    const sessions = await prisma.playSession.findMany({
      orderBy: { playedAt: "desc" },
      include: {
        players: true,
      },
    });
    return sessions;
  } catch (error) {
    console.error("Failed to get play sessions:", error);
    return [];
  }
}

export async function getPlayStats() {
  try {
    const sessions = await prisma.playSession.findMany({
      include: {
        players: true,
      },
    });

    const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const totalHours = parseFloat((totalMinutes / 60).toFixed(1));

    // Top games played this year
    const currentYear = new Date().getFullYear();
    const gamePlayCounts: Record<string, { count: number; thumbnail?: string; bggId?: number }> = {};

    for (const session of sessions) {
      const year = new Date(session.playedAt).getFullYear();
      if (year === currentYear) {
        const name = session.gameName;
        if (!gamePlayCounts[name]) {
          gamePlayCounts[name] = { count: 0, thumbnail: session.gameThumbnail || undefined, bggId: session.bggId || undefined };
        }
        gamePlayCounts[name].count += 1;
      }
    }

    const topGames = Object.entries(gamePlayCounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        thumbnail: data.thumbnail,
        bggId: data.bggId,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Player win rates
    const playerStats: Record<string, { plays: number; wins: number }> = {};
    for (const session of sessions) {
      for (const p of session.players) {
        const name = p.name.trim();
        if (!name) continue;
        if (!playerStats[name]) {
          playerStats[name] = { plays: 0, wins: 0 };
        }
        playerStats[name].plays += 1;
        if (p.isWinner) {
          playerStats[name].wins += 1;
        }
      }
    }

    const winRates = Object.entries(playerStats)
      .map(([name, stats]) => ({
        name,
        plays: stats.plays,
        wins: stats.wins,
        winRate: parseFloat(((stats.wins / stats.plays) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.winRate - a.winRate);

    // Pile of Shame: owned and in_collection, but played == false OR no play sessions logged
    const playedBggIds = sessions.map(s => s.bggId).filter((id): id is number => id !== null);
    const uniquePlayedBggIds = [...new Set(playedBggIds)];

    const pileOfShame = await prisma.game.findMany({
      where: {
        status: "in_collection",
        played: false,
        bggId: {
          notIn: uniquePlayedBggIds,
        },
      },
      select: {
        id: true,
        bggId: true,
        name: true,
        thumbnailUrl: true,
        rank: true,
        averageRating: true,
      },
      orderBy: {
        rank: "asc",
      },
    });

    return {
      totalHours,
      totalPlays: sessions.length,
      topGames,
      winRates,
      pileOfShame,
    };
  } catch (error) {
    console.error("Failed to compute play stats:", error);
    return {
      totalHours: 0,
      totalPlays: 0,
      topGames: [],
      winRates: [],
      pileOfShame: [],
    };
  }
}

export async function linkWallapopItem(gameId: string, data: { title: string; price: number; webLink: string; location?: string; imageUrl?: string }) {
  try {
    // Check if the link already exists for this game
    const existing = await prisma.linkedWallapopItem.findFirst({
      where: {
        gameId,
        webLink: data.webLink,
      },
    });

    if (existing) {
      return { success: false, error: "Este anuncio ya está vinculado a este juego." };
    }

    const item = await prisma.linkedWallapopItem.create({
      data: {
        gameId,
        title: data.title,
        price: data.price,
        webLink: data.webLink,
        location: data.location,
        imageUrl: data.imageUrl,
      },
    });
    return { success: true, item };
  } catch (error) {
    console.error(`Failed to link Wallapop item for game ${gameId}:`, error);
    return { success: false, error: String(error) };
  }
}

export async function deleteWallapopItem(id: string) {
  try {
    await prisma.linkedWallapopItem.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete Wallapop item ${id}:`, error);
    return { success: false, error: String(error) };
  }
}

export async function toggleExcludeWallapopId(gameId: string, itemId: string) {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { excludedWallapopIds: true },
    });
    if (!game) return { success: false, error: "Game not found" };

    let excluded = game.excludedWallapopIds ? game.excludedWallapopIds.split(",").filter(Boolean) : [];
    if (excluded.includes(itemId)) {
      excluded = excluded.filter(id => id !== itemId);
    } else {
      excluded.push(itemId);
    }

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: {
        excludedWallapopIds: excluded.join(","),
      },
    });
    return { success: true, excludedWallapopIds: updated.excludedWallapopIds };
  } catch (error) {
    console.error(`Failed to toggle exclude Wallapop ID:`, error);
    return { success: false, error: String(error) };
  }
}

export async function translateGameDescription(bggId: number) {
  try {
    const game = await prisma.game.findUnique({
      where: { bggId },
      select: { description: true },
    });
    if (!game || !game.description) {
      return { success: false, error: "Juego o descripción no encontrados." };
    }

    const translatedText = await translateText(game.description);
    
    await prisma.game.update({
      where: { bggId },
      data: { description: translatedText },
    });

    return { success: true, description: translatedText };
  } catch (error) {
    console.error("Failed to translate description:", error);
    return { success: false, error: String(error) };
  }
}

async function translateText(text: string): Promise<string> {
  if (!text) return "";
  try {
    const chunks = text.match(/[\s\S]{1,1000}/g) || [text];
    const translatedChunks: string[] = [];
    
    for (const chunk of chunks) {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(chunk)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }
      });
      if (res.ok) {
        const json = await res.json() as [string, string, ...unknown[]][][];
        const translatedPart = json[0]?.map((item) => item[0]).join("") || "";
        translatedChunks.push(translatedPart);
      } else {
        translatedChunks.push(chunk);
      }
    }
    
    return translatedChunks.join("");
  } catch (error) {
    console.error("Translation helper error:", error);
    return text;
  }
}

const GENERIC_SELLING_WORDS = new Set([
  // Selling adjectives
  'nuevo', 'precintado', 'impecable', 'perfecto', 'excelente', 'ingles', 'english', 'espanol', 'spanish', 'multilingue', 'idioma', 'castellano',
  'como', 'completamente', 'completo', 'usado', 'barato', 'rebajado', 'regalo', 'original', 'particular', 'vendo', 'vende', 'oportunidad',
  'estrenar', 'abierto', 'sin', 'jugar', 'jugado', 'veces', 'partida', 'partidas', 'buen', 'estado', 'conservacion', 'caja', 'componentes',
  'enfundado', 'fundas', 'sleeves', 'cartas', 'fichas', 'dados', 'tablero', 'reglamento', 'instrucciones', 'manual', 'traduccion',
  // Brands/Publishers
  'devir', 'edge', 'asmodee', 'masqueoca', 'maldito', 'games', 'sd', 'ludonova', 'zacatrus', 'gmt', 'ravensburger', 'hasbro', 'mattel', 'dias', 'de', 'fuego',
  // Common terms/adjectives in listings
  'juego', 'mesa', 'juegos', 'boardgame', 'boardgames', 'board', 'game', 'edition', 'version', 'edicion', 'deluxe', 'collector', 'collectors',
  'bgg', 'geek', 'kickstarter', 'ks', 'retail', 'promo', 'promos', 'extra', 'extras', 'lote', 'pack', 'unitario', 'individual',
  // Numbers & connector words
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'de', 'la', 'el', 'en', 'y', 'o', 'a', 'con', 'para', 'por', 'del', 'los', 'las', 'un', 'una',
  'the', 'of', 'and', 'or', 'in', 'on', 'with', 'for', 'to', 'by', 'at', 'an', 'a', 'is', 'segunda', 'mano', 'solo', 'solo'
]);

function isWallapopTitleValid(
  gameName: string,
  gameSpanishName: string | null,
  listingTitle: string
): boolean {
  const STOP_WORDS = new Set([
    'de', 'la', 'el', 'en', 'y', 'o', 'a', 'con', 'para', 'por', 'del', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'the', 'of', 'and', 'or', 'in', 'on', 'with', 'for', 'to', 'by', 'at', 'an', 'a', 'is', 'juego', 'mesa', 'juegos',
    'de segunda mano', 'segunda mano'
  ]);

  const VERY_GENERIC_WORDS = new Set([
    'edicion', 'version', 'juego', 'mesa', 'juegos', 'board', 'game', 'edition', 'version', 'play', 'players', 'caja', 'box', 'pack'
  ]);

  const normalize = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, " ")     // replace non-alphanumeric with spaces
      .replace(/\s+/g, " ")
      .trim();
  };

  const normListing = normalize(listingTitle);
  const listingWords = new Set(normListing.split(" ").filter(w => w.length > 0));

  const normGameFull = normalize(gameName + " " + (gameSpanishName || ""));
  const gameWordsSet = new Set(normGameFull.split(" "));

  // 1. Prevent matching listings that are clearly expansions or sub-items of the game.
  const listingParts = listingTitle.split(/[:\-\(\)]/);
  if (listingParts.length > 1) {
    const listingSubtitle = listingParts.slice(1).join(" ");
    const normListSub = normalize(listingSubtitle);
    const listSubWords = normListSub.split(" ").filter(w => w.length > 0 && !STOP_WORDS.has(w));
    const specificListSubWords = listSubWords.filter(w => !VERY_GENERIC_WORDS.has(w));

    if (specificListSubWords.length > 0) {
      const hasAnyInGame = specificListSubWords.some(w => gameWordsSet.has(w));
      if (!hasAnyInGame) {
        return false;
      }
    }
  }

  const checkSingleName = (candidateName: string): boolean => {
    const parts = candidateName.split(/[:\-\(\)]/);
    const mainPart = parts[0] || "";
    const subtitlePart = parts.slice(1).join(" ");

    const normMain = normalize(mainPart);
    const normSubtitle = normalize(subtitlePart);

    const mainWords = normMain.split(" ").filter(w => w.length > 0 && !STOP_WORDS.has(w));
    const subtitleWords = normSubtitle.split(" ").filter(w => w.length > 0 && !STOP_WORDS.has(w));

    if (mainWords.length === 0) return false;

    const specificMainWords = mainWords.filter(w => !VERY_GENERIC_WORDS.has(w));

    const matchedSpecificMain = specificMainWords.filter(w => listingWords.has(w));
    if (matchedSpecificMain.length < specificMainWords.length) {
      return false;
    }

    const specificSubtitleWords = subtitleWords.filter(w => !VERY_GENERIC_WORDS.has(w));

    if (specificSubtitleWords.length > 0) {
      const matchedSpecificSub = specificSubtitleWords.filter(w => listingWords.has(w));

      if (specificMainWords.length <= 1) {
        if (matchedSpecificSub.length < specificSubtitleWords.length) {
          return false;
        }
      }
    }

    // --- EXTRA SPECIFIC WORDS CHECK TO PREVENT MATCHING EXPANSIONS ---
    const candidateWords = new Set([
      ...normMain.split(" "),
      ...normSubtitle.split(" ")
    ].filter(w => w.length > 0));

    const extraWords = [...listingWords].filter(w => 
      !candidateWords.has(w) && 
      !STOP_WORDS.has(w) && 
      !VERY_GENERIC_WORDS.has(w) && 
      !GENERIC_SELLING_WORDS.has(w)
    );

    if (extraWords.length > 0) {
      return false;
    }

    return true;
  };

  if (checkSingleName(gameName)) return true;
  if (gameSpanishName && checkSingleName(gameSpanishName)) return true;

  return false;
}

export async function autoImportWallapop(gameId: string) {
  try {
    // 1. Get the game info from DB
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        name: true,
        spanishName: true,
        isExpansion: true,
        linkedWallapop: {
          select: { id: true, title: true, webLink: true }
        }
      }
    });

    if (!game) {
      return { success: false, error: "Juego no encontrado." };
    }

    // Proactively clean up any pre-existing linked items that are no longer valid
    const invalidExistingIds: string[] = [];
    const existingLinks = new Set<string>();

    for (const item of game.linkedWallapop) {
      if (!isWallapopTitleValid(game.name, game.spanishName, item.title)) {
        invalidExistingIds.push(item.id);
      } else {
        existingLinks.add(item.webLink);
      }
    }

    if (invalidExistingIds.length > 0) {
      console.log(`[Wallapop Auto-Import] Deleting ${invalidExistingIds.length} invalid pre-existing items for game ${game.spanishName || game.name}...`);
      await prisma.linkedWallapopItem.deleteMany({
        where: { id: { in: invalidExistingIds } }
      });
    }

    // Build optimized search queries. Primary includes "juego de mesa" to narrow results.
    // Secondary omits it, to catch listings whose titles don't include that phrase.
    let baseName = game.spanishName || game.name;
    // Clean up punctuation that might mess up search index match
    baseName = baseName.replace(/[!\?\(\):\-]/g, " ").replace(/\s+/g, " ").trim();
    const searchQuery = baseName.toLowerCase().includes("juego")
      ? baseName
      : `${baseName} juego de mesa`;
    // Secondary query uses just the base name (no "juego de mesa" suffix)
    const secondaryQuery = baseName;

    const isGameAnExpansion = game.isExpansion || 
      ['ampliacion', 'ampliación', 'expansion', 'expansión', 'expansiones'].some(kw => 
        game.name.toLowerCase().includes(kw) || (game.spanishName && game.spanishName.toLowerCase().includes(kw))
      );

    console.log(`[Wallapop Auto-Import] Starting search for: "${searchQuery}" (Is expansion: ${isGameAnExpansion})`);
    // Query the optimized direct Wallapop API search
    const searchRes = await searchWallapopUrls(game.spanishName || game.name);
    if (!searchRes.success || !searchRes.urls) {
      return { success: false, error: searchRes.error || "No se pudieron encontrar anuncios." };
    }

    const uniqueUrls = searchRes.urls;
    if (uniqueUrls.length === 0) {
      return { success: true, count: 0, message: "No se encontraron anuncios para este juego en Wallapop." };
    }

    console.log(`[Wallapop Auto-Import] Found ${uniqueUrls.length} active Wallapop item links.`);

    
    // Optimized exclusions lists
    const EXCLUSION_KEYWORDS = [
      'inserto', 'organizador', 'organizer', '3d print', 'impreso en 3d', 'impresión 3d', 'impresion 3d',
      'piezas', 'repuestos', 'componentes', 'manual', 'folleto', 'reglamento', 'fundas', 'cartas promo', 
      'meeple upgrades', 'promos', 'promo',
      'caja vacia', 'caja vacía', 'cajas vacias', 'cajas vacías', 'solo caja', 'sólo caja', 'empty box'
    ];
    
    const EXPANSION_KEYWORDS = ['expansion', 'expansión', 'expansiones', 'ampliacion', 'ampliación'];

    let addedCount = 0;
    let skippedCount = 0;
    const addedTitles: string[] = [];

    // Parse up to 6 listings to keep it fast and avoid rate limits
    const urlsToProcess = uniqueUrls.slice(0, 6);

    for (const url of urlsToProcess) {
      if (existingLinks.has(url)) {
        skippedCount++;
        continue;
      }

      try {
        // Fetch individual item page
        const itemRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "es-ES,es;q=0.9",
          }
        });

        if (!itemRes.ok) {
          console.warn(`[Wallapop Auto-Import] Failed to fetch item page: ${url}`);
          continue;
        }

        const itemHtml = await itemRes.text();

        // 1. Extract Title
        let title = "";
        const titleMatch = itemHtml.match(/<meta[^>]*?(?:property|name)="og:title"[^>]*?content="([^"]+)"/i) ||
                           itemHtml.match(/<meta[^>]*?content="([^"]+)"[^>]*?(?:property|name)="og:title"/i) ||
                           itemHtml.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].split(" de segunda mano por")[0].trim();
          title = title.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
        }

        if (!title) {
          console.warn(`[Wallapop Auto-Import] Could not parse title for item: ${url}`);
          continue;
        }

        // 2. Extract Price
        let price = 0;
        const priceMatch = itemHtml.match(/"price":\s*"(\d+(?:\.\d+)?)"/) ||
                           itemHtml.match(/"price":\s*(\d+(?:\.\d+)?)/) ||
                           itemHtml.match(/(?:property|name)="product:price:amount"\s+content="([^"]+)"/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1]);
        } else {
          const descMatch = itemHtml.match(/por\s+(\d+(?:\.\d+)?)\s*EUR/i) ||
                            itemHtml.match(/(\d+(?:\.\d+)?)\s*€/);
          if (descMatch && descMatch[1]) {
            price = parseFloat(descMatch[1]);
          }
        }

        // 3. Extract Location
        let location = "";
        const locMatch = itemHtml.match(/"address":\s*"([^"]+)"/) ||
                         itemHtml.match(/"location":\s*{\s*"city":\s*"([^"]+)"/);
        if (locMatch && locMatch[1]) {
          location = locMatch[1];
        }

        // 4. Extract Image
        let imageUrl = "";
        const imgMatch = itemHtml.match(/<meta[^>]*?(?:property|name)="og:image"[^>]*?content="([^"]+)"/i) ||
                         itemHtml.match(/<meta[^>]*?content="([^"]+)"[^>]*?(?:property|name)="og:image"/i) ||
                         itemHtml.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1];
        }

        // --- OPTIMIZED FILTERING ---
        // A. Title validation: Ensure listing title matches the game name (ignoring case, accents, and punctuation)
        const matchesName = isWallapopTitleValid(game.name, game.spanishName, title);

        if (!matchesName) {
          console.log(`[Wallapop Auto-Import] Skipped "${title}" -> Does not match game name "${game.spanishName || game.name}"`);
          continue;
        }

        // B. Price filter
        if (price < 5) {
          console.log(`[Wallapop Auto-Import] Skipped "${title}" (${price}€) -> Price below 5€ limit.`);
          continue;
        }

        // C. Exclusions filter
        const titleLower = title.toLowerCase();
        let shouldExclude = false;

        // Check general accessory/insert/box keywords
        for (const kw of EXCLUSION_KEYWORDS) {
          if (titleLower.includes(kw)) {
            console.log(`[Wallapop Auto-Import] Skipped "${title}" -> Contains exclusion keyword: "${kw}"`);
            shouldExclude = true;
            break;
          }
        }

        if (shouldExclude) continue;

        // Check expansion keywords only if the game itself is NOT an expansion
        if (!isGameAnExpansion) {
          for (const kw of EXPANSION_KEYWORDS) {
            if (titleLower.includes(kw)) {
              console.log(`[Wallapop Auto-Import] Skipped "${title}" -> Contains expansion keyword: "${kw}"`);
              shouldExclude = true;
              break;
            }
          }
        }

        if (shouldExclude) continue;

        // --- SAVE TO DATABASE ---
        await prisma.linkedWallapopItem.create({
          data: {
            gameId,
            title,
            price,
            webLink: url,
            imageUrl,
            location: location || "Importación Automática",
          }
        });

        addedCount++;
        addedTitles.push(title);
        console.log(`[Wallapop Auto-Import] Linked new item: "${title}" - ${price}€`);

      } catch (err) {
        console.error(`[Wallapop Auto-Import] Error processing item: ${url}`, err);
      }
    }

    let message = "";
    if (addedCount > 0) {
      message = `Se han encontrado y vinculado ${addedCount} anuncio(s) nuevo(s) de segunda mano.`;
    } else if (skippedCount > 0 && uniqueUrls.length > 0) {
      message = "No se encontraron anuncios nuevos. Los anuncios existentes ya están vinculados.";
    } else {
      message = "No se encontraron anuncios que correspondan al juego base completo.";
    }

    return {
      success: true,
      count: addedCount,
      message,
      titles: addedTitles
    };

  } catch (error) {
    console.error(`[Wallapop Auto-Import] Failed:`, error);
    return { success: false, error: "Error en el servidor al realizar la búsqueda de Wallapop." };
  }
}

/**
 * Searches Wallapop items using Brave, Yahoo (multiple pages and query variations), DuckDuckGo, and Bing in parallel.
 * Collects up to 60 unique Spanish item URLs and returns them.
 */
function calculateWallapopSimilarity(s1: string, s2: string): number {
  const clean = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const c1 = clean(s1);
  const c2 = clean(s2);
  if (c1 === c2) return 1.0;

  const cleanWords = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
  const w1 = cleanWords(s1);
  const w2 = cleanWords(s2);
  if (w1.length === 0 || w2.length === 0) return 0.0;

  const getBigrams = (str: string) => {
    const text = cleanWords(str).join(" ");
    const bigrams: string[] = [];
    for (let i = 0; i < text.length - 1; i++) bigrams.push(text.substring(i, i + 2));
    return bigrams;
  };
  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  if (b1.length === 0 || b2.length === 0) return 0.0;

  let intersection = 0;
  const b2Copy = [...b2];
  for (const bigram of b1) {
    const idx = b2Copy.indexOf(bigram);
    if (idx !== -1) {
      intersection++;
      b2Copy.splice(idx, 1);
    }
  }
  return (2.0 * intersection) / (b1.length + b2.length);
}

function calculateWallapopRelevance(url: string, query: string): number {
  const match = url.match(/\/item\/([^/]+)$/);
  if (!match) return 0;
  const parts = match[1].split("-");
  if (parts.length > 1) parts.pop(); // remove ID
  const slugText = parts.join(" ");

  const sim = calculateWallapopSimilarity(query, slugText);

  // If all query words are contained in the slug, increase relevance significantly
  const cleanWords = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
  const queryWords = cleanWords(query);
  const slugWords = cleanWords(slugText);

  const containsAllWords = queryWords.every((qw) => slugWords.includes(qw));
  if (containsAllWords) {
    return sim + 1.0; // Boost exact word match
  }

  return sim;
}

export async function searchWallapopUrls(query: string) {
  try {
    const url = `https://api.wallapop.com/api/v3/search?keywords=${encodeURIComponent(query)}&source=api`;
    
    // Headers optimized to query Wallapop API v3 without triggering Cloudflare blocks
    const headers = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "es,es-ES;q=0.9",
      "Connection": "keep-alive",
      "DeviceOS": "0",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "X-DeviceOS": "0"
    };

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Wallapop API responded with status ${res.status}`);
    }

    const json = await res.json();
    const items = json.data?.section?.payload?.items || [];

    const urls = items
      .map((item: any) => {
        const slug = item.web_slug;
        return slug ? `https://es.wallapop.com/item/${slug}` : null;
      })
      .filter(Boolean) as string[];

    // Sort URLs by relevance to the query based on the slug
    const sortedUrls = urls.sort((a, b) => {
      const relA = calculateWallapopRelevance(a, query);
      const relB = calculateWallapopRelevance(b, query);
      return relB - relA; // Descending order
    });

    const uniqueUrls = [...new Set(sortedUrls)].slice(0, 60);
    return { success: true, urls: uniqueUrls };
  } catch (error) {
    console.error("searchWallapopUrls failed:", error);
    return { success: false, error: "Error al buscar las ofertas de Wallapop." };
  }
}

/**
 * Fetches details for a chunk of Wallapop URLs.
 * Limits execution concurrency to keep it extremely fast and bypass rate limiting.
 */
export async function fetchWallapopDetailsForUrls(urls: string[]) {
  try {
    const USER_AGENTS = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ];

    const items: Array<{
      title: string;
      price: number;
      location: string;
      imageUrl: string;
      webLink: string;
    } | null> = [];
    const BATCH_SIZE = 3;
    const DELAY_MS = 150;

    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          try {
            const res = await fetch(url, {
              headers: {
                "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
                "Accept-Language": "es-ES,es;q=0.9",
              }
            });
            if (!res.ok) return null;
            const html = await res.text();

            // Title
            let title = "";
            const titleMatch = html.match(/<meta[^>]*?(?:property|name)="og:title"[^>]*?content="([^"]+)"/i) ||
                               html.match(/<meta[^>]*?content="([^"]+)"[^>]*?(?:property|name)="og:title"/i) ||
                               html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/i) ||
                               html.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1].split(" de segunda mano por")[0].trim();
              title = title.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
            }

            if (!title) return null;

            // Price
            let price = 0;
            const priceMatch = html.match(/"price":\s*"(\d+(?:\.\d+)?)"/) ||
                               html.match(/"price":\s*(\d+(?:\.\d+)?)/) ||
                               html.match(/(?:property|name)="product:price:amount"\s+content="([^"]+)"/);
            if (priceMatch && priceMatch[1]) {
              price = parseFloat(priceMatch[1]);
            } else {
              const descMatch = html.match(/por\s+(\d+(?:\.\d+)?)\s*EUR/i) ||
                                html.match(/(\d+(?:\.\d+)?)\s*€/);
              if (descMatch && descMatch[1]) {
                price = parseFloat(descMatch[1]);
              }
            }

            // Filter out cheap placeholders under 5€
            if (price < 5) return null;

            // Check for negative filters in title (double-check defense)
            const forbiddenWords = ["inserto", "recurso", "organizador", "expansion", "expansión", "promo", "token", "tokens", "organizer", "componentes", "3d", "pintado"];
            const titleLower = title.toLowerCase();
            if (forbiddenWords.some(word => titleLower.includes(word))) {
              return null; // Skip this accessory/expansion item
            }

            // Location
            let location = "";
            const locMatch = html.match(/"address":\s*"([^"]+)"/) ||
                             html.match(/"location":\s*{\s*"city":\s*"([^"]+)"/);
            if (locMatch && locMatch[1]) {
              location = locMatch[1];
            }

            // Image
            let imageUrl = "";
            const imgMatch = html.match(/<meta[^>]*?(?:property|name)="og:image"[^>]*?content="([^"]+)"/i) ||
                             html.match(/<meta[^>]*?content="([^"]+)"[^>]*?(?:property|name)="og:image"/i) ||
                             html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
            if (imgMatch && imgMatch[1]) {
              imageUrl = imgMatch[1];
            }

            return { title, price, location: location || "España", imageUrl, webLink: url };
          } catch (err) {
            console.warn(`[fetchWallapopDetailsForUrls] Failed parsing ${url}:`, err);
            return null;
          }
        })
      );

      items.push(...batchResults);
      if (i + BATCH_SIZE < urls.length) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }

    return {
      success: true,
      items: items.filter(Boolean) as Array<{
        title: string;
        price: number;
        location: string;
        imageUrl: string;
        webLink: string;
      }>
    };
  } catch (error) {
    console.error("fetchWallapopDetailsForUrls failed:", error);
    return { success: false, error: "Error al cargar detalles de los anuncios." };
  }
}

export async function excludeLudonautaOffer(gameId: string, offerLink: string) {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { ludonautaCache: true }
    });

    if (!game || !game.ludonautaCache) {
      return { success: false, error: "Juego o caché no encontrados." };
    }

    const cache = JSON.parse(game.ludonautaCache);
    if (cache.offers) {
      // Filter out the offer with matching link
      const filteredOffers = (cache.offers as Array<{ link: string }>).filter((o) => o.link !== offerLink);
      
      const updatedCache = {
        ...cache,
        offers: filteredOffers
      };

      await prisma.game.update({
        where: { id: gameId },
        data: {
          ludonautaCache: JSON.stringify(updatedCache)
        }
      });

      return { success: true, cache: updatedCache };
    }

    return { success: false, error: "Caché no contiene ofertas." };
  } catch (error) {
    console.error("excludeLudonautaOffer failed:", error);
    return { success: false, error: "Error al descartar la oferta de Ludonauta." };
  }
}

export async function registerLotPurchase(updates: { id: string; purchasePrice: number }[]) {
  try {
    const results = [];
    for (const update of updates) {
      const updated = await prisma.game.update({
        where: { id: update.id },
        data: {
          purchasePrice: update.purchasePrice,
          status: "in_collection",
          owned: true
        }
      });
      results.push(updated);
    }
    return { success: true, count: results.length };
  } catch (error) {
    console.error("registerLotPurchase failed:", error);
    return { success: false, error: "Error al registrar la compra por lote." };
  }
}

async function checkIfWallapopItemIsSold(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      if (res.status === 404 || res.status === 410) {
        return true;
      }
      return false;
    }
    const html = await res.text();
    if (
      html.includes('"saleStatus":"sold"') ||
      html.includes('"status":"sold"') ||
      html.includes('"sale_status":"sold"') ||
      html.toLowerCase().includes('item-status-sold') ||
      html.includes('class="sold"') ||
      html.includes('¡Vendido!') ||
      html.includes('item_sold')
    ) {
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error checking sold status for ${url}:`, error);
    return false;
  }
}

export async function refreshInterestingGamePrices(gameId: string) {
  try {
    // 1. Refresh Ludonauta prices in cache
    await getLudonautaPrices(gameId, true);

    // 1.5 Refresh sold status for manually linked Wallapop items
    const linkedItems = await prisma.linkedWallapopItem.findMany({
      where: { gameId }
    });

    for (const item of linkedItems) {
      try {
        const isSold = await checkIfWallapopItemIsSold(item.webLink);
        const currentIsSold = item.status === "sold";
        if (isSold !== currentIsSold) {
          await prisma.linkedWallapopItem.update({
            where: { id: item.id },
            data: { status: isSold ? "sold" : "available" }
          });
        }
      } catch (err) {
        console.error(`Failed to refresh sold status for linked item ${item.id}:`, err);
      }
    }

    // 2. Fetch Wallapop search items
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { name: true, spanishName: true, wallapopCache: true }
    });

    if (!game) {
      return { success: false, error: "Juego no encontrado." };
    }

    const query = game.spanishName || game.name;
    
    // We query the v3 API directly inside here to get all metadata for the listings in 1 call
    const searchUrl = `https://api.wallapop.com/api/v3/search?keywords=${encodeURIComponent(query)}&source=api`;
    const headers = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "es,es-ES;q=0.9",
      "Connection": "keep-alive",
      "DeviceOS": "0",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "X-DeviceOS": "0"
    };

    const apiRes = await fetch(searchUrl, { headers });
    if (!apiRes.ok) {
      throw new Error(`Wallapop API responded with status ${apiRes.status}`);
    }

    const json = await apiRes.json();
    const items = json.data?.section?.payload?.items || [];

    const listings = items.map((item: any) => ({
      id: item.id || Math.random().toString(),
      title: item.title,
      price: item.price?.amount || 0,
      webLink: item.web_slug ? `https://es.wallapop.com/item/${item.web_slug}` : "",
      imageUrl: item.images?.[0]?.urls?.medium || item.images?.[0]?.urls?.big || "",
      location: item.location?.city ? `${item.location.city}${item.location.region ? `, ${item.location.region}` : ""}` : "Ubicación desconocida"
    })).filter((l: any) => l.price > 0 && l.webLink);

    // Calculate best and average price
    const prices = listings.map((l: any) => l.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : null;

    // Load price history from existing cache
    let priceHistory: Array<{ date: string; bestPrice: number; avgPrice: number | null }> = [];
    if (game.wallapopCache) {
      try {
        const parsed = JSON.parse(game.wallapopCache);
        if (Array.isArray(parsed.priceHistory)) {
          priceHistory = parsed.priceHistory;
        }
      } catch {}
    }

    // Add today's entry to history (Safe YYYY-MM-DD in Spain time zone)
    if (minPrice !== null) {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      const today = formatter.format(new Date());
      const existingIdx = priceHistory.findIndex((h) => h.date === today);
      if (existingIdx !== -1) {
        priceHistory[existingIdx] = { date: today, bestPrice: minPrice, avgPrice: avgPrice };
      } else {
        priceHistory.push({ date: today, bestPrice: minPrice, avgPrice: avgPrice });
      }
      priceHistory = priceHistory.slice(-50); // Keep last 50 entries
    }

    const updatedWallapopCache = {
      lastUpdated: new Date().toISOString(),
      averagePrice: avgPrice,
      listings,
      priceHistory
    };

    await prisma.game.update({
      where: { id: gameId },
      data: {
        wallapopCache: JSON.stringify(updatedWallapopCache)
      }
    });

    return { success: true };
  } catch (error) {
    console.error("refreshInterestingGamePrices failed:", error);
    return { success: false, error: "Error al actualizar precios." };
  }
}

export async function updateWallapopItemStatus(itemId: string, status: string) {
  try {
    const updated = await prisma.linkedWallapopItem.update({
      where: { id: itemId },
      data: { status }
    });
    return { success: true, item: updated };
  } catch (error) {
    console.error("updateWallapopItemStatus failed:", error);
    return { success: false, error: String(error) };
  }
}

export async function toggleShopStockOverride(gameId: string, shopLink: string, newStock: string) {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { shopStockOverrides: true }
    });
    if (!game) {
      return { success: false, error: "Juego no encontrado." };
    }
    
    let overrides: Record<string, string> = {};
    if (game.shopStockOverrides) {
      try {
        overrides = JSON.parse(game.shopStockOverrides);
      } catch {}
    }
    
    overrides[shopLink] = newStock;
    
    const updated = await prisma.game.update({
      where: { id: gameId },
      data: {
        shopStockOverrides: JSON.stringify(overrides)
      }
    });
    
    return { success: true, game: updated };
  } catch (error) {
    console.error("toggleShopStockOverride failed:", error);
    return { success: false, error: String(error) };
  }
}

export async function toggleShopPriceOverride(gameId: string, shopLink: string, newPrice: number) {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { shopPriceOverrides: true }
    });
    if (!game) {
      return { success: false, error: "Juego no encontrado." };
    }
    
    let overrides: Record<string, number> = {};
    if (game.shopPriceOverrides) {
      try {
        overrides = JSON.parse(game.shopPriceOverrides);
      } catch {}
    }
    
    overrides[shopLink] = newPrice;
    
    const updated = await prisma.game.update({
      where: { id: gameId },
      data: {
        shopPriceOverrides: JSON.stringify(overrides)
      }
    });
    
    return { success: true, game: updated };
  } catch (error) {
    console.error("toggleShopPriceOverride failed:", error);
    return { success: false, error: String(error) };
  }
}

export async function toggleGameInteresting(bggId: number, isInteresting: boolean) {
  try {
    const updated = await prisma.game.update({
      where: { bggId },
      data: { isInteresting },
    });
    
    // Revalidate paths to refresh catalog and details
    revalidatePath("/");
    revalidatePath(`/game/${updated.id}`);
    
    return { success: true, gameId: updated.id, isInteresting: updated.isInteresting };
  } catch (error) {
    console.error("toggleGameInteresting failed:", error);
    return { success: false, error: String(error) };
  }
}


