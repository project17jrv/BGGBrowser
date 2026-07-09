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

    // Attempt to scrape BGG (in case Cloudflare allows it or they lift challenges on headers)
    const url = `https://boardgamegeek.com/boardgame/${game.bggId}/any-slug/sleeves`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        }
      });

      if (res.status === 200) {
        const html = await res.text();
        if (!html.includes("cf_chl")) {
          // Cloudflare didn't block it! Let's parse.
          // BGG page uses list items or tables. Let's look for standard patterns:
          // e.g. "50 Sleeves needed" or "Card size: 63.5x88 mm"
          // Since BGG sleeves page is complex, let's look for card size specifications in text
          // Let's write a simple parser based on regular expressions if matches exist.
          // Example pattern: standard BGG sleeve lists use links like /sleevesize/standard-card-game-63-5-x-88-mm
          // Or text like: "Standard Card Game (63.5 x 88 mm) - 100 cards"
          const regex = /([a-zA-Z\s]+)\s*\((\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)\s*mm\)\s*-\s*(\d+)\s*cards/gi;
          const matches = [...html.matchAll(regex)];
          
          if (matches.length > 0) {
            sizes = matches.map(m => {
              const name = m[1].trim();
              const width = parseFloat(m[2]);
              const height = parseFloat(m[3]);
              const count = parseInt(m[4], 10);
              return {
                name: `${name} (${width}x${height} mm)`,
                count,
                width,
                height,
                packsNeeded: Math.ceil(count / 50) // Assuming standard pack of 50
              };
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[Sleeves Scraper] BGG fetch failed, using fallback database. Error: ${err}`);
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
        // Return empty or general suggestion if not found
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
