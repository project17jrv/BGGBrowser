import fs from "fs";
import path from "path";

export interface MisutMeepleReview {
  name: string;
  url: string;
  rating: "sobresaliente" | "notable" | "aprobado" | "suspenso";
  year?: number;
}

let cachedReviews: MisutMeepleReview[] | null = null;

// Normalize text for matching: lowercases, removes accents, non-alphanumeric chars and leading articles
function normalize(str: string): string {
  if (!str) return "";
  
  let normalized = str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove accents

  // Remove leading articles: el, la, los, las, the, der, die, das
  const articlesRegex = /^(?:el|la|los|las|the|der|die|das|un|una|unos|unas|an)\s+/;
  normalized = normalized.replace(articlesRegex, "").trim();

  // Keep only alphanumeric characters
  return normalized.replace(/[^a-z0-9]/g, "");
}

// Extract slug from Misut Meeple url (e.g. resena-3-ring-circus)
function getSlugFromUrl(url: string): string {
  try {
    const parts = url.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/^resena-/, "");
  } catch {
    return "";
  }
}

export function getMisutMeepleReview(
  name: string,
  spanishName?: string | null
): MisutMeepleReview | null {
  try {
    // 1. Load reviews into memory if not cached
    if (!cachedReviews) {
      const filePath = path.join(process.cwd(), "src", "lib", "misutmeeple_reviews.json");
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        cachedReviews = JSON.parse(raw) as MisutMeepleReview[];
      } else {
        console.warn(`[Misut Meeple] JSON file not found at ${filePath}`);
        return null;
      }
    }

    if (!cachedReviews || cachedReviews.length === 0) return null;

    const normName = normalize(name);
    const normSpanishName = spanishName ? normalize(spanishName) : "";

    // 2. Search matches
    let bestMatch: MisutMeepleReview | null = null;
    let highestScore = 0; // 0: no match, 1: slug match, 2: partial title match, 3: exact title match

    for (const review of cachedReviews) {
      const normReviewName = normalize(review.name);
      const reviewSlug = normalize(getSlugFromUrl(review.url));

      // Exact match with English or Spanish name
      if (normReviewName === normName || (normSpanishName && normReviewName === normSpanishName)) {
        return review; // Perfect match
      }

      // Exact match with URL slug
      if (reviewSlug === normName || (normSpanishName && reviewSlug === normSpanishName)) {
        bestMatch = review;
        highestScore = 3;
        continue;
      }

      // Check if one contains the other (only if score is lower than 3)
      if (highestScore < 3) {
        if (
          normReviewName.includes(normName) ||
          normName.includes(normReviewName) ||
          (normSpanishName && (normReviewName.includes(normSpanishName) || normSpanishName.includes(normReviewName)))
        ) {
          bestMatch = review;
          highestScore = 2;
        }
      }
    }

    return bestMatch;
  } catch (err) {
    console.error("[Misut Meeple] Error matching review:", err);
    return null;
  }
}
