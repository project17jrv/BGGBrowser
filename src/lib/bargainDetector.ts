export interface MinimalLinkedWallapop {
  id: string;
  title: string;
  price: number;
  webLink: string;
  imageUrl?: string | null;
  location?: string | null;
  status: string;
}

export const BARGAIN_WEIGHTS = {
  wallapopAvg: 0.35, // 35% Wallapop medio
  wallapopMin: 0.30, // 30% Wallapop mínimo histórico
  storeAvg: 0.20,    // 20% Tienda media
  storeMin: 0.15     // 15% Tienda mínima
};

export const BARGAIN_BONUSES = {
  historicMinBonusScore: 0.25, // Bonus score to add if offer_price <= wallapop_min
  historicMinTempBonus: 15     // Bonus degrees to add to final temp
};

export interface BargainResult {
  offerPrice: number;
  title: string;
  webLink: string;
  imageUrl?: string;
  location?: string;
  isLinked: boolean;
  
  // Raw scores
  storeAvgScore: number;
  storeMinScore: number;
  wallapopAvgScore: number;
  wallapopMinScore: number;
  
  // Computed temperature & classification
  temperature: number; // 0 to 100+
  explanation: string;
  label: string; // "Sin interés", "Precio normal", "Buena oferta", "Gran chollo", "Chollo excepcional"
  wallapopDiscountPct: number; // % discount relative to Wallapop avg for sorting ties
}

/**
 * Calculates bargain temperature (0-100) and returns explanation/labels.
 */
export function calculateBargainScore(params: {
  store_avg: number | null;
  store_min: number | null;
  wallapop_avg: number | null;
  wallapop_min: number | null;
  offer_price: number;
}): { temperature: number; explanation: string; label: string; scores: any } {
  const { store_avg, store_min, wallapop_avg, wallapop_min, offer_price } = params;

  let scoreSum = 0;
  let weightSum = 0;

  // 1. Ahorro respecto al precio medio de tiendas
  let storeAvgScore = 0;
  if (store_avg && store_avg > 0) {
    storeAvgScore = (store_avg - offer_price) / store_avg;
    scoreSum += storeAvgScore * BARGAIN_WEIGHTS.storeAvg;
    weightSum += BARGAIN_WEIGHTS.storeAvg;
  }

  // 2. Ahorro respecto al precio mínimo en tiendas
  let storeMinScore = 0;
  if (store_min && store_min > 0) {
    storeMinScore = (store_min - offer_price) / store_min;
    scoreSum += storeMinScore * BARGAIN_WEIGHTS.storeMin;
    weightSum += BARGAIN_WEIGHTS.storeMin;
  }

  // 3. Ahorro respecto al precio medio de Wallapop
  let wallapopAvgScore = 0;
  if (wallapop_avg && wallapop_avg > 0) {
    wallapopAvgScore = (wallapop_avg - offer_price) / wallapop_avg;
    scoreSum += wallapopAvgScore * BARGAIN_WEIGHTS.wallapopAvg;
    weightSum += BARGAIN_WEIGHTS.wallapopAvg;
  }

  // 4. Comparación con el mínimo histórico de Wallapop
  let wallapopMinScore = 0;
  let hasHistoricMinBonus = false;
  if (wallapop_min && wallapop_min > 0) {
    if (offer_price <= wallapop_min) {
      // 100% score for this component + 25% bonus score
      wallapopMinScore = 1.0 + BARGAIN_BONUSES.historicMinBonusScore;
      hasHistoricMinBonus = true;
    } else {
      wallapopMinScore = (wallapop_min - offer_price) / wallapop_min;
    }
    scoreSum += wallapopMinScore * BARGAIN_WEIGHTS.wallapopMin;
    weightSum += BARGAIN_WEIGHTS.wallapopMin;
  }

  // If no weights could be evaluated, default to 0
  const rawScore = weightSum > 0 ? scoreSum / weightSum : 0;

  // Convert rawScore to temperature (0 to 100)
  // R = 0 means normal price (30 degrees)
  // R = 0.40 (40% discount) means 80 degrees
  // R = -0.30 (30% overpriced) means 0 degrees
  let temperature = 30;
  if (rawScore <= -0.3) {
    temperature = 0;
  } else if (rawScore <= 0) {
    // Linear interpolation between -0.3 (0) and 0 (30)
    temperature = 30 + (rawScore / 0.3) * 30;
  } else if (rawScore <= 0.4) {
    // Linear interpolation between 0 (30) and 0.4 (80)
    temperature = 30 + (rawScore / 0.4) * 50;
  } else {
    // Above 40% discount: 80 + additional
    temperature = 80 + (rawScore - 0.4) * 50;
  }

  // Apply flat temperature bonus for hitting a historic minimum
  if (hasHistoricMinBonus) {
    temperature += BARGAIN_BONUSES.historicMinTempBonus;
  }

  // Limit minimum to 0.
  temperature = Math.max(0, Math.round(temperature));

  // Determine label
  let label = "Sin interés";
  if (temperature >= 80) label = "Chollo excepcional";
  else if (temperature >= 60) label = "Gran chollo";
  else if (temperature >= 40) label = "Buena oferta";
  else if (temperature >= 20) label = "Precio normal";

  // If beating historic min, override label if it's high
  if (hasHistoricMinBonus && temperature >= 80) {
    label = "Chollo histórico";
  }

  // Determine explanation
  let explanation = "Precio dentro del rango normal.";
  if (hasHistoricMinBonus) {
    explanation = "¡Mínimo histórico batido o igualado!";
  } else if (store_min && offer_price < store_min * 0.75) {
    const pct = Math.round(((store_min - offer_price) / store_min) * 100);
    explanation = `${pct}% más barato que la tienda más económica.`;
  } else if (wallapop_avg && offer_price < wallapop_avg * 0.8) {
    const pct = Math.round(((wallapop_avg - offer_price) / wallapop_avg) * 100);
    explanation = `${pct}% por debajo de la media de Wallapop.`;
  } else if (store_avg && offer_price < store_avg * 0.75) {
    const pct = Math.round(((store_avg - offer_price) / store_avg) * 100);
    explanation = `${pct}% de ahorro sobre la media en tiendas.`;
  } else if (temperature >= 60) {
    explanation = "Excelente oportunidad de compra.";
  } else if (temperature >= 40) {
    explanation = "Buena oferta de mercado.";
  }

  return {
    temperature,
    explanation,
    label,
    scores: {
      storeAvgScore,
      storeMinScore,
      wallapopAvgScore,
      wallapopMinScore
    }
  };
}

/**
 * Evaluates all available candidates (DB-linked items and search cache listings)
 * and retrieves the best bargain result (highest temperature) for a game.
 */
export function getBestBargainForGame(game: {
  ludonautaCache?: string | null;
  wallapopCache?: string | null;
  linkedWallapop?: MinimalLinkedWallapop[];
}): BargainResult | null {
  // Extract reference store prices
  let store_avg: number | null = null;
  let store_min: number | null = null;
  
  if (game.ludonautaCache) {
    try {
      const cache = JSON.parse(game.ludonautaCache);
      const offers = cache.offers || [];
      const included = cache.includedLinks || [];
      
      // Filter active store offers
      const activeOffers = offers.filter((o: any) => 
        (included.length === 0 || included.includes(o.link)) && 
        o.price !== null && 
        o.stock !== "Agotado" &&
        o.stock !== "Reservar"
      );
      
      if (activeOffers.length > 0) {
        const prices = activeOffers.map((o: any) => o.price);
        store_avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
        store_min = Math.min(...prices);
      }
    } catch {}
  }

  // Extract reference Wallapop prices
  let wallapop_avg: number | null = null;
  let wallapop_min: number | null = null;
  let cacheListings: any[] = [];
  let priceHistory: any[] = [];
  
  if (game.wallapopCache) {
    try {
      const parsed = JSON.parse(game.wallapopCache);
      cacheListings = parsed.listings || [];
      priceHistory = parsed.priceHistory || [];
      wallapop_avg = parsed.averagePrice || null;
    } catch {}
  }

  // Fallback calculations for Wallapop
  if (wallapop_avg === null && cacheListings.length > 0) {
    const prices = cacheListings.map(l => l.price);
    wallapop_avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  
  if (priceHistory.length > 0) {
    wallapop_min = Math.min(...priceHistory.map(h => h.bestPrice));
  } else if (cacheListings.length > 0) {
    wallapop_min = Math.min(...cacheListings.map(l => l.price));
  }

  // Gather all unique offer candidates
  const candidates: Array<{
    title: string;
    price: number;
    webLink: string;
    imageUrl?: string;
    location?: string;
    isLinked: boolean;
  }> = [];

  // 1. Add manually linked items that are available
  if (game.linkedWallapop) {
    game.linkedWallapop.forEach((item) => {
      if (item.status === "available" && item.price > 0 && item.webLink) {
        candidates.push({
          title: item.title,
          price: item.price,
          webLink: item.webLink,
          imageUrl: item.imageUrl || undefined,
          location: item.location || undefined,
          isLinked: true
        });
      }
    });
  }

  // 2. Add scraped cache listings (excluding duplicate links)
  cacheListings.forEach((item) => {
    if (item.price > 0 && item.webLink && !candidates.some(c => c.webLink === item.webLink)) {
      candidates.push({
        title: item.title,
        price: item.price,
        webLink: item.webLink,
        imageUrl: item.imageUrl || undefined,
        location: item.location || undefined,
        isLinked: false
      });
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  // Evaluate scores for all candidates and find the one with highest temperature
  let bestResult: BargainResult | null = null;

  for (const cand of candidates) {
    const { temperature, explanation, label, scores } = calculateBargainScore({
      store_avg,
      store_min,
      wallapop_avg,
      wallapop_min,
      offer_price: cand.price
    });

    const wallapopDiscountPct = wallapop_avg && wallapop_avg > 0
      ? ((wallapop_avg - cand.price) / wallapop_avg) * 100
      : 0;

    const result: BargainResult = {
      offerPrice: cand.price,
      title: cand.title,
      webLink: cand.webLink,
      imageUrl: cand.imageUrl,
      location: cand.location,
      isLinked: cand.isLinked,
      storeAvgScore: scores.storeAvgScore,
      storeMinScore: scores.storeMinScore,
      wallapopAvgScore: scores.wallapopAvgScore,
      wallapopMinScore: scores.wallapopMinScore,
      temperature,
      explanation,
      label,
      wallapopDiscountPct
    };

    if (!bestResult || result.temperature > bestResult.temperature) {
      bestResult = result;
    } else if (result.temperature === bestResult.temperature) {
      // Tie breakers
      if (result.offerPrice < bestResult.offerPrice) {
        bestResult = result;
      } else if (result.offerPrice === bestResult.offerPrice) {
        if (result.wallapopDiscountPct > bestResult.wallapopDiscountPct) {
          bestResult = result;
        }
      }
    }
  }

  return bestResult;
}
