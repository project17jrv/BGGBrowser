import { prisma } from "./db";

export interface SleeveSize {
  name: string;
  count: number;
  width: number;
  height: number;
  packsNeeded: number; // calculated based on 50 or 100 units per pack (we'll show packages needed)
}

export interface SleevesCacheData {
  lastUpdated: string;
  sizes: SleeveSize[];
}

// Local fallback database of card sleeves for popular games
const SLEEVES_FALLBACK_DB: Record<number, Omit<SleeveSize, "packsNeeded">[]> = {
  // Root (237182)
  237182: [
    { name: "Standard Card Game (63.5x88 mm)", count: 98, width: 63.5, height: 88 }
  ],
  // Wingspan (266191)
  266191: [
    { name: "Standard Card Game (57x87 mm)", count: 212, width: 57, height: 87 }
  ],
  // Terraforming Mars (167791)
  167791: [
    { name: "Standard Card Game (63.5x88 mm)", count: 270, width: 63.5, height: 88 }
  ],
  // Catan (13)
  13: [
    { name: "Mini European (44x68 mm)", count: 120, width: 44, height: 68 }
  ],
  // Everdell (199792)
  199792: [
    { name: "Standard Card Game (63.5x88 mm)", count: 128, width: 63.5, height: 88 },
    { name: "Mini European (44x63 mm)", count: 128, width: 44, height: 63 }
  ],
  // 7 Wonders (68448)
  68448: [
    { name: "7 Wonders (65x100 mm)", count: 148, width: 65, height: 100 }
  ],
  // Dixit (39856)
  39856: [
    { name: "Dixit (80x120 mm)", count: 84, width: 80, height: 120 }
  ],
  // Carcassonne (822)
  822: [], // No cards
  // Pandemic (30549)
  30549: [
    { name: "Standard Card Game (63.5x88 mm)", count: 118, width: 63.5, height: 88 }
  ],
  // Gloomhaven (174430)
  174430: [
    { name: "Standard Card Game (63.5x88 mm)", count: 727, width: 63.5, height: 88 },
    { name: "Mini European (44x68 mm)", count: 975, width: 44, height: 68 }
  ],
  // Azul (230826)
  230826: [], // No cards
  // Ark Nova (342942)
  342942: [
    { name: "Standard Card Game (63.5x88 mm)", count: 255, width: 63.5, height: 88 }
  ],
  // Scythe (169786)
  169786: [
    { name: "Standard Card Game (57x87 mm)", count: 142, width: 57, height: 87 },
    { name: "Mini European (44x68 mm)", count: 54, width: 44, height: 68 },
    { name: "Large (70x110 mm)", count: 42, width: 70, height: 110 }
  ],
};

function getSleeveName(w: number, h: number): string {
  if (w >= 63 && w <= 64 && h >= 87 && h <= 89) {
    return "Standard Card Game (63.5x88 mm)";
  }
  if (w >= 56 && w <= 58 && h >= 87 && h <= 90) {
    return "Standard American / Chimera (57x89 mm)";
  }
  if (w >= 58 && w <= 60 && h >= 91 && h <= 93) {
    return "Standard European (59x92 mm)";
  }
  if (w >= 43 && w <= 45 && h >= 67 && h <= 69) {
    return "Mini European (44x68 mm)";
  }
  if (w >= 40 && w <= 42 && h >= 62 && h <= 64) {
    return "Mini American (41x63 mm)";
  }
  if (w >= 69 && w <= 71 && h >= 109 && h <= 112) {
    return "Tarot (70x110 mm)";
  }
  if (w >= 79 && w <= 81 && h >= 119 && h <= 122) {
    return "Dixit / Large (80x120 mm)";
  }
  if (w >= 68 && w <= 72 && h >= 68 && h <= 72) {
    return "Square (70x70 mm)";
  }
  return `${w}x${h} mm`;
}

export async function getGameSleeves(gameId: string, forceRefresh = false): Promise<SleevesCacheData | null> {
  try {
    // 1. Fetch game from SQLite
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { bggId: true, sleevesCache: true },
    });

    if (!game) return null;

    // 2. Check cache (30 days TTL)
    if (game.sleevesCache && !forceRefresh) {
      try {
        const cache: SleevesCacheData = JSON.parse(game.sleevesCache);
        const lastUpdated = new Date(cache.lastUpdated);
        const now = new Date();
        const diffMs = now.getTime() - lastUpdated.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays < 30) {
          console.log(`[Sleeves Cache] Hit for game BGG ID: "${game.bggId}"`);
          return cache;
        }
      } catch (err) {
        console.error("[Sleeves Cache] Error parsing cache JSON, re-fetching...", err);
      }
    }

    console.log(`[Sleeves Scraper] Cache miss/force-refresh for BGG ID: "${game.bggId}"`);

    let sizes: SleeveSize[] = [];

    // Query cardsetsbygame BGG JSON API (free of Cloudflare checks)
    const url = `https://boardgamegeek.com/api/cardsetsbygame?objectid=${game.bggId}&objecttype=thing`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
      });

      if (res.status === 200) {
        const data = await res.json();
        const cardSets = data.cardSets || [];
        const nonAddons = cardSets.filter((cs: any) => !cs.addon);
        const targetSets = nonAddons.length > 0 ? nonAddons : cardSets;

        const sizeMap: Record<string, { width: number; height: number; count: number; name: string }> = {};
        for (const cs of targetSets) {
          const cardTypes = cs.cardTypes || [];
          for (const ct of cardTypes) {
            const w = parseFloat(ct.width);
            const h = parseFloat(ct.height);
            const qty = parseInt(ct.quantity, 10);
            if (isNaN(w) || isNaN(h) || isNaN(qty) || qty <= 0) continue;

            const roundedW = Math.round(w * 10) / 10;
            const roundedH = Math.round(h * 10) / 10;
            const sizeKey = `${roundedW}x${roundedH}`;

            if (!sizeMap[sizeKey] || sizeMap[sizeKey].count < qty) {
              sizeMap[sizeKey] = {
                width: roundedW,
                height: roundedH,
                count: qty,
                name: ct.name || cs.name || "Cards",
              };
            }
          }
        }

        sizes = Object.values(sizeMap).map(item => ({
          name: getSleeveName(item.width, item.height),
          count: item.count,
          width: item.width,
          height: item.height,
          packsNeeded: Math.ceil(item.count / 50)
        }));
      }
    } catch (err) {
      console.warn(`[Sleeves Scraper] BGG cardsets API failed, using fallback database. Error: ${err}`);
    }

    // 3. Fallback database lookup
    if (sizes.length === 0) {
      const fallback = SLEEVES_FALLBACK_DB[game.bggId];
      if (fallback) {
        sizes = fallback.map(item => ({
          ...item,
          packsNeeded: Math.ceil(item.count / 50) // Standard 50-pack count
        }));
        console.log(`[Sleeves Scraper] Found fallback data for game BGG ID: "${game.bggId}"`);
      } else {
        sizes = [];
      }
    }

    // 4. Update SQLite database
    const cacheData: SleevesCacheData = {
      lastUpdated: new Date().toISOString(),
      sizes,
    };

    await prisma.game.update({
      where: { id: gameId },
      data: {
        sleevesCache: JSON.stringify(cacheData),
      },
    });

    return cacheData;
  } catch (error) {
    console.error(`[Sleeves Scraper] Failed to fetch sleeves for game ID: "${gameId}"`, error);
    return null;
  }
}
