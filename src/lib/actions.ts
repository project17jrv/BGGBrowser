"use server";

import { prisma } from "./db";
import { Prisma } from "@prisma/client";

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
}

export async function getGames(params: GetGamesParams) {
  const page = params.page || 1;
  const size = params.size || 12;
  const skip = (page - 1) * size;

  // Build where conditions
  const where: Prisma.GameWhereInput = { AND: [] };
  const andConditions = where.AND as Prisma.GameWhereInput[];

  // Owned only filter
  if (params.ownedOnly) {
    andConditions.push({
      owned: true,
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
        // 2. Ludonauta minimum price in stock
        try {
          const cache = JSON.parse(game.ludonautaCache) as { offers?: { price: number | null; stock: string }[] };
          const inStockOffers = cache.offers?.filter((o) => o.stock === "En stock" && o.price !== null) || [];
          if (inStockOffers.length > 0) {
            const prices = inStockOffers.map((o) => o.price as number);
            gameVal = Math.min(...prices);
          } else if (cache.offers && cache.offers.length > 0) {
            // Fallback to min of any offer
            const allPrices = cache.offers.map((o) => o.price).filter((p): p is number => p !== null);
            if (allPrices.length > 0) {
              gameVal = Math.min(...allPrices);
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

// --- WALLAPOP VINCULACIÓN ACTIONS ---

export async function linkWallapopItem(gameId: string, data: { title: string; price: number; webLink: string; location?: string; imageUrl?: string }) {
  try {
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




    // Rotating user agents to avoid per-UA rate limits
    const USER_AGENTS = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    ];

    // Helper: fetch with random UA from pool
    const fetchWithUA = (url: string, extraHeaders: Record<string, string> = {}, uaIndex = 0) =>
      fetch(url, {
        headers: {
          "User-Agent": USER_AGENTS[uaIndex % USER_AGENTS.length],
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9",
          ...extraHeaders,
        },
      });

    // Helper: sleep for ms
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Run all search stages and accumulate all unique URLs (don't stop at first result)
    const allFoundUrls = new Set<string>();

    const extractBraveUrls = (html: string): string[] => {
      const matches = [...html.matchAll(/https:\/\/es\.wallapop\.com\/item\/([^"'\s>&]+)/g)];
      return [...new Set(matches.map(m => `https://es.wallapop.com/item/${m[1]}`))]; 
    };
    const extractYahooUrls = (html: string): string[] => {
      const ruMatches = [...html.matchAll(/RU=([^/&"]+)/g)];
      const decoded = ruMatches.map(m => { try { return decodeURIComponent(m[1]); } catch { return null; } }).filter(Boolean) as string[];
      return [...new Set(decoded.filter(u => u.includes('es.wallapop.com/item/')))];
    };
    const extractDDGUrls = (html: string): string[] => {
      const hrefs = [...html.matchAll(/href="([^"]*uddg=[^"]*)"/g)].map(m => m[1]);
      const decoded = hrefs.map(h => { try { const m = h.match(/uddg=([^&]+)/); return m ? decodeURIComponent(m[1]) : null; } catch { return null; } }).filter(Boolean) as string[];
      return [...new Set(decoded.filter(u => u.includes('es.wallapop.com/item/')))];
    };

    // Helper: try a query on Brave, add results to set
    const tryBrave = async (query: string, uaIdx: number) => {
      try {
        const url = `https://search.brave.com/search?q=site:es.wallapop.com/item+${encodeURIComponent(query)}`;
        const res = await fetchWithUA(url, {}, uaIdx);
        console.log(`[Wallapop Auto-Import] Brave ("${query.slice(0, 30)}...") -> Status: ${res.status}`);
        if (res.ok) {
          const h = await res.text();
          extractBraveUrls(h).forEach(u => allFoundUrls.add(u));
        }
      } catch (err) { console.warn("[Wallapop Auto-Import] Brave error:", err); }
    };

    // Helper: try a query on Yahoo, add results to set
    const tryYahoo = async (query: string, uaIdx: number) => {
      try {
        const url = `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(query)}`;
        const res = await fetchWithUA(url, {}, uaIdx);
        console.log(`[Wallapop Auto-Import] Yahoo ("${query.slice(0, 30)}...") -> Status: ${res.status}`);
        if (res.ok) {
          const h = await res.text();
          extractYahooUrls(h).forEach(u => allFoundUrls.add(u));
        }
      } catch (err) { console.warn("[Wallapop Auto-Import] Yahoo error:", err); }
    };

    // --- SEARCH STAGE 1: Brave (primary query) ---
    await tryBrave(searchQuery, 0);
    if (allFoundUrls.size === 0) {
      await sleep(1000);
      await tryBrave(searchQuery, 1);
    }

    // --- SEARCH STAGE 2: Yahoo (primary query) - always run to complement Brave ---
    await tryYahoo(searchQuery, 1);
    if (allFoundUrls.size === 0) {
      await sleep(1500);
      await tryYahoo(searchQuery, 2);
    }

    // --- SEARCH STAGE 3: Secondary query (no "juego de mesa") on both Brave and Yahoo ---
    if (searchQuery !== secondaryQuery) {
      console.log(`[Wallapop Auto-Import] Trying secondary query without suffix: "${secondaryQuery}"`);
      await sleep(800);
      await tryBrave(secondaryQuery, 2);
      await tryYahoo(secondaryQuery, 3);
    }

    // --- SEARCH STAGE 3b: If game has English name different from Spanish, try English name too ---
    if (game.name && game.spanishName && game.name !== game.spanishName) {
      const englishBase = game.name.replace(/[!\?\(\):\-]/g, " ").replace(/\s+/g, " ").trim();
      if (englishBase !== secondaryQuery) {
        console.log(`[Wallapop Auto-Import] Trying English name query: "${englishBase}"`);
        await tryYahoo(englishBase, 0);
      }
    }

    // --- SEARCH STAGE 4: DuckDuckGo fallback if still nothing ---
    if (allFoundUrls.size === 0) {
      console.log("[Wallapop Auto-Import] No results yet. Trying DuckDuckGo...");
      try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=site:es.wallapop.com/item+${encodeURIComponent(searchQuery)}`;
        const ddgRes = await fetchWithUA(ddgUrl, {}, 2);
        console.log(`[Wallapop Auto-Import] DDG -> Status: ${ddgRes.status}`);
        if (ddgRes.ok) {
          const ddgHtml = await ddgRes.text();
          if (!ddgHtml.includes("bots use") && !ddgHtml.includes("captcha") && !ddgHtml.includes("robot")) {
            extractDDGUrls(ddgHtml).forEach(u => allFoundUrls.add(u));
            console.log(`[Wallapop Auto-Import] DDG found ${allFoundUrls.size} URLs.`);
          } else {
            console.log("[Wallapop Auto-Import] DDG returned a bot-check page.");
          }
        }
      } catch (err) { console.warn("[Wallapop Auto-Import] DuckDuckGo error:", err); }
    }

    // --- SEARCH STAGE 5: Bing fallback ---
    if (allFoundUrls.size === 0) {
      console.log("[Wallapop Auto-Import] DDG empty/blocked. Trying Bing...");
      try {
        const bingUrl = `https://www.bing.com/search?q=site:es.wallapop.com/item+${encodeURIComponent(searchQuery)}`;
        const bingRes = await fetchWithUA(bingUrl, {}, 3);
        console.log(`[Wallapop Auto-Import] Bing -> Status: ${bingRes.status}`);
        if (bingRes.ok) {
          const bingHtml = await bingRes.text();
          if (!bingHtml.includes("desafío") && !bingHtml.includes("captcha") && !bingHtml.includes("authmode")) {
            const matches = [...bingHtml.matchAll(/https:\/\/es\.wallapop\.com\/item\/([^"'\s>&]+)/g)];
            [...new Set(matches.map(m => `https://es.wallapop.com/item/${m[1]}`))].forEach(u => allFoundUrls.add(u));
            console.log(`[Wallapop Auto-Import] Bing found ${allFoundUrls.size} URLs.`);
          } else {
            console.log("[Wallapop Auto-Import] Bing returned a bot-check page.");
          }
        }
      } catch (err) { console.warn("[Wallapop Auto-Import] Bing error:", err); }
    }

    const uniqueUrls = [...allFoundUrls];

    if (uniqueUrls.length === 0) {
      return { success: false, error: "No se pudo conectar con ningún buscador para encontrar anuncios. Los motores de búsqueda han bloqueado temporalmente las peticiones desde este servidor. Inténtalo de nuevo en unos minutos o vincula el anuncio manualmente." };
    }

    console.log(`[Wallapop Auto-Import] Found ${uniqueUrls.length} unique Wallapop item links.`);

    if (uniqueUrls.length === 0) {
      return { success: true, count: 0, message: "No se encontraron anuncios para este juego en Wallapop." };
    }

    
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
export async function searchWallapopUrls(query: string) {
  try {
    const allFoundUrls = new Set<string>();

    const extractBraveUrls = (html: string): string[] => {
      const matches = [...html.matchAll(/https:\/\/es\.wallapop\.com\/item\/([^"'\s>&]+)/g)];
      return [...new Set(matches.map(m => `https://es.wallapop.com/item/${m[1]}`))]; 
    };
    const extractYahooUrls = (html: string): string[] => {
      const ruMatches = [...html.matchAll(/RU=([^/&"]+)/g)];
      const decoded = ruMatches.map(m => { try { return decodeURIComponent(m[1]); } catch { return null; } }).filter(Boolean) as string[];
      return [...new Set(decoded.filter(u => u.includes('es.wallapop.com/item/')))];
    };
    const extractDDGUrls = (html: string): string[] => {
      const hrefs = [...html.matchAll(/href="([^"]*uddg=[^"]*)"/g)].map(m => m[1]);
      const decoded = hrefs.map(h => { try { const m = h.match(/uddg=([^&]+)/); return m ? decodeURIComponent(m[1]) : null; } catch { return null; } }).filter(Boolean) as string[];
      return [...new Set(decoded.filter(u => u.includes('es.wallapop.com/item/')))];
    };

    const USER_AGENTS = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    ];

    const fetchWithUA = (url: string, extraHeaders: Record<string, string> = {}, uaIndex = 0) =>
      fetch(url, {
        headers: {
          "User-Agent": USER_AGENTS[uaIndex % USER_AGENTS.length],
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-ES,s;q=0.9",
          ...extraHeaders,
        },
      });

    // Formulate queries with "juego" and "juego de mesa"
    const cleanQuery = query.toLowerCase();
    const hasJuego = cleanQuery.includes("juego");
    const hasMesa = cleanQuery.includes("mesa");

    const qBase = query;
    const qJuego = hasJuego ? query : `${query} juego`;
    const qJuegoMesa = (hasJuego && hasMesa) ? query : `${query} juego de mesa`;
    const qMesaJuego = (hasJuego && hasMesa) ? query : `juego de mesa ${query}`;

    // Search targets
    const braveUrl = `https://search.brave.com/search?q=site:es.wallapop.com/item+${encodeURIComponent(qJuego)}`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=site:es.wallapop.com/item+${encodeURIComponent(qBase)}`;
    const bingUrl = `https://www.bing.com/search?q=site:es.wallapop.com/item+${encodeURIComponent(qJuegoMesa)}`;

    // Paginating Yahoo is very stable and doesn't rate limit easily.
    const yahooUrls = [
      `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(qJuegoMesa)}&b=1`,
      `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(qJuegoMesa)}&b=11`,
      `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(qJuegoMesa)}&b=21`,
      `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(qJuego)}&b=1`,
      `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(qJuego)}&b=11`,
      `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(qJuego)}&b=21`,
      `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(qBase)}&b=1`,
      `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(qBase)}&b=11`,
      `https://search.yahoo.com/search?p=site:es.wallapop.com/item+${encodeURIComponent(qMesaJuego)}&b=1`
    ];

    // Execute engine searches in parallel
    const enginePromises = [
      fetchWithUA(braveUrl, {}, 0).then(async res => {
        if (res.ok) {
          const h = await res.text();
          extractBraveUrls(h).forEach(u => allFoundUrls.add(u));
        }
      }).catch(() => {}),
      fetchWithUA(ddgUrl, {}, 1).then(async res => {
        if (res.ok) {
          const h = await res.text();
          if (!h.includes("captcha") && !h.includes("robot")) {
            extractDDGUrls(h).forEach(u => allFoundUrls.add(u));
          }
        }
      }).catch(() => {}),
      fetchWithUA(bingUrl, {}, 2).then(async res => {
        if (res.ok) {
          const h = await res.text();
          if (!h.includes("captcha")) {
            const matches = [...h.matchAll(/https:\/\/es\.wallapop\.com\/item\/([^"'\s>&]+)/g)];
            matches.map(m => `https://es.wallapop.com/item/${m[1]}`).forEach(u => allFoundUrls.add(u));
          }
        }
      }).catch(() => {})
    ];

    // Fetch Yahoo sequentially with small delays to ensure 100% success rate
    const fetchYahooSequentially = async () => {
      for (let i = 0; i < yahooUrls.length; i++) {
        try {
          const res = await fetchWithUA(yahooUrls[i], {}, i);
          if (res.ok) {
            const h = await res.text();
            extractYahooUrls(h).forEach(u => allFoundUrls.add(u));
          }
        } catch {}
        if (i < yahooUrls.length - 1) {
          await new Promise(r => setTimeout(r, 80)); // 80ms is enough to avoid concurrency detection
        }
      }
    };

    await Promise.all([...enginePromises, fetchYahooSequentially()]);

    const urls = [...allFoundUrls].slice(0, 60); // Collect up to 60 URLs
    return { success: true, urls };
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


