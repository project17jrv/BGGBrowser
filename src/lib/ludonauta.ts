import { prisma } from "./db";

export interface LudonautaOffer {
  storeName: string;
  price: number | null;
  link: string;
  stock: string;
}

export interface LudonautaCacheData {
  lastUpdated: string;
  slug: string;
  offers: LudonautaOffer[];
  includedLinks?: string[];
}

function calculateSimilarity(s1: string, s2: string): number {
  const clean = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const c1 = clean(s1);
  const c2 = clean(s2);
  if (c1 === c2) return 1.0;
  if (c1.includes(c2) || c2.includes(c1)) {
    return Math.min(c1.length, c2.length) / Math.max(c1.length, c2.length) * 0.9;
  }
  let matches = 0;
  for (let i = 0; i < c1.length; i++) {
    if (c2.includes(c1[i])) matches++;
  }
  return matches / Math.max(c1.length, c2.length);
}

function parseOffersFromHtml(html: string): LudonautaOffer[] {
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const matches = [...html.matchAll(trRegex)];
  const offers: LudonautaOffer[] = [];

  for (const match of matches) {
    const content = match[0];
    if (content.includes("Ir a tienda:") || content.includes("product-price")) {
      // Parse store name
      const storeMatch = content.match(/title="Ir a tienda: «([^»]+)»"/);
      if (!storeMatch) continue;
      const storeName = storeMatch[1];

      // Parse price (e.g. 44<span class="small">,00&#8364;</span>)
      const priceMatch = content.match(/(\d+)\s*<span[^>]*>,(\d{2})/);
      const price = priceMatch ? parseFloat(`${priceMatch[1]}.${priceMatch[2]}`) : null;

      // Parse link
      const linkMatch = content.match(/href="([^"]+)"/);
      let link = linkMatch ? linkMatch[1] : "";
      if (link && link.startsWith("/")) {
        link = `https://www.ludonauta.es${link}`;
      }
      // Clean HTML entities from link
      link = link.replace(/&amp;/g, "&");

      // Parse stock status
      const stockMatch = content.match(/title="(En stock|Agotado|Pre-venta|En reposición|Bajo pedido|Reservar|Agotado temporalmente)"/);
      const stock = stockMatch ? stockMatch[1] : "Agotado";

      offers.push({ storeName, price, link, stock });
    }
  }

  return offers;
}

export async function getLudonautaPrices(gameId: string, forceRefresh = false): Promise<LudonautaCacheData | null> {
  try {
    // 1. Fetch game from SQLite
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { name: true, spanishName: true, isExpansion: true, ludonautaCache: true, shopStockOverrides: true, shopPriceOverrides: true },
    });

    if (!game) return null;

    // 2. Check cache (return instantly if exists and not forcing refresh)
    if (game.ludonautaCache && !forceRefresh) {
      try {
        const cache: LudonautaCacheData = JSON.parse(game.ludonautaCache);
        console.log(`[Ludonauta Cache] Hit (no auto-update) for game: "${game.name}"`);
        
        // Apply stock overrides
        if (game.shopStockOverrides) {
          try {
            const overrides = JSON.parse(game.shopStockOverrides);
            cache.offers = cache.offers.map((o) => ({
              ...o,
              stock: overrides[o.link] || o.stock
            }));
          } catch {}
        }

        // Apply price overrides
        if (game.shopPriceOverrides) {
          try {
            const priceOverrides = JSON.parse(game.shopPriceOverrides);
            cache.offers = cache.offers.map((o) => ({
              ...o,
              price: priceOverrides[o.link] !== undefined ? priceOverrides[o.link] : o.price
            }));
          } catch {}
        }

        return cache;
      } catch (err) {
        console.error("[Ludonauta Cache] Error parsing cache JSON, re-fetching...", err);
      }
    }

    console.log(`[Ludonauta Scraper] Cache miss/force-refresh for: "${game.name}"`);

    // 3. Perform scraping
    const searchName = game.spanishName || game.name;
    const isGameAnExpansion = game.isExpansion ||
      ['ampliacion', 'ampliación', 'expansion', 'expansión', 'expansiones'].some(kw =>
        game.name.toLowerCase().includes(kw) || (game.spanishName && game.spanishName.toLowerCase().includes(kw))
      );
    const searchUrl = "https://www.ludonauta.es/buscar";
    const body = new URLSearchParams();
    body.append("data[Buscador][palabras]", searchName);

    const res = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: body.toString(),
      redirect: "follow",
    });

    const finalUrl = res.url;
    const html = await res.text();
    let slug = "";
    let offers: LudonautaOffer[] = [];

    // Check if redirected to the details page directly
    if (finalUrl.includes("/juegos-mesas/") && !finalUrl.endsWith("/buscar") && !finalUrl.endsWith("/listar")) {
      const match = finalUrl.match(/\/juegos-mesas\/([a-zA-Z0-9-_]+)/);
      if (match) {
        slug = match[1];
        offers = parseOffersFromHtml(html);
      }
    } else {
      // It's a search results page. Parse candidates.
      const candidateRegex = /href="\/juegos-mesas\/([a-zA-Z0-9-_]+)" title="Ver juego de mesa: «([^»]+)»"/g;
      const candidates = [...html.matchAll(candidateRegex)]
        .map(m => ({ slug: m[1], title: m[2] }))
        .filter(c => c.slug !== "listar" && c.slug !== "listar-novedades");

      const EXPANSION_SLUG_KEYWORDS = ['expansion', 'expansión', 'ampliacion', 'ampliación', 'segunda-edicion', 'edicion-revisada', 'big-box'];

      if (candidates.length > 0) {
        // Select candidate with highest name similarity, penalising expansions when game is a base game
        let bestCandidate = candidates[0];
        let maxSimilarity = -1;

        for (const cand of candidates) {
          let sim = calculateSimilarity(searchName, cand.title);

          // If this game is NOT an expansion, heavily penalise candidates whose slug/title contains expansion keywords
          if (!isGameAnExpansion) {
            const slugLower = cand.slug.toLowerCase();
            const titleLower = cand.title.toLowerCase();
            const isExpansionCandidate = EXPANSION_SLUG_KEYWORDS.some(kw => slugLower.includes(kw) || titleLower.includes(kw));
            if (isExpansionCandidate) {
              sim *= 0.3; // heavy penalty — only pick if nothing else matches
              console.log(`[Ludonauta Scraper] Penalising expansion candidate: "${cand.title}" (slug: ${cand.slug})`);
            }
          }

          if (sim > maxSimilarity) {
            maxSimilarity = sim;
            bestCandidate = cand;
          }
        }

        slug = bestCandidate.slug;
        const detailUrl = `https://www.ludonauta.es/juegos-mesas/${slug}`;
        console.log(`[Ludonauta Scraper] Fetching detail page for slug: "${slug}" (similarity: ${maxSimilarity.toFixed(2)})`);

        const detailRes = await fetch(detailUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          }
        });
        const detailHtml = await detailRes.text();
        offers = parseOffersFromHtml(detailHtml);
      } else {
        console.log(`[Ludonauta Scraper] No candidates found for: "${searchName}"`);
      }
    }

    // 4. Update database
    let existingIncludedLinks: string[] = [];
    if (game.ludonautaCache) {
      try {
        const parsed = JSON.parse(game.ludonautaCache);
        if (Array.isArray(parsed.includedLinks)) {
          existingIncludedLinks = parsed.includedLinks;
        }
      } catch {}
    }

    // Apply overrides to fresh scrape
    let overrides: Record<string, string> = {};
    if (game.shopStockOverrides) {
      try {
        overrides = JSON.parse(game.shopStockOverrides);
      } catch {}
    }

    let priceOverrides: Record<string, number> = {};
    if (game.shopPriceOverrides) {
      try {
        priceOverrides = JSON.parse(game.shopPriceOverrides);
      } catch {}
    }

    const parsedOffers = offers.map((o) => ({
      ...o,
      stock: overrides[o.link] || o.stock,
      price: priceOverrides[o.link] !== undefined ? priceOverrides[o.link] : o.price
    }));

    const cacheData: LudonautaCacheData = {
      lastUpdated: new Date().toISOString(),
      slug,
      offers: parsedOffers,
      includedLinks: existingIncludedLinks,
    };

    await prisma.game.update({
      where: { id: gameId },
      data: {
        ludonautaCache: JSON.stringify(cacheData),
      },
    });

    return cacheData;
  } catch (error) {
    console.error(`[Ludonauta Scraper] Failed to fetch Ludonauta prices for game ID: "${gameId}"`, error);
    return null;
  }
}
