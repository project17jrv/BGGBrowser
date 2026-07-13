import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export interface Song {
  eid: string; // YouTube video ID
  title: string;
}

export interface PlaylistData {
  lastUpdated: string;
  songs: Song[];
}

// -------------------------------------------------------
// Melodice helper: try multiple name variants against the
// autocomplete API and return songs if found.
// -------------------------------------------------------
async function fetchFromMelodice(nameVariants: string[]): Promise<Song[]> {
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // 1. Fetch Melodice homepage to obtain visitor session cookies
  let cookieHeader = "";
  try {
    const homeRes = await fetch("https://melodice.org/", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(4000)
    });
    if (homeRes.ok) {
      const cookies = homeRes.headers.getSetCookie 
        ? homeRes.headers.getSetCookie() 
        : (homeRes.headers.get("set-cookie")?.split(/,\s*/) || []);
      cookieHeader = cookies.map(c => c.split(";")[0]).filter(Boolean).join("; ");
    }
  } catch (err) {
    console.warn("[Music API] Failed to fetch Melodice session cookies:", err);
  }

  for (const candidateName of nameVariants) {
    if (!candidateName.trim()) continue;

    const melodiceUrl = `https://melodice.org/api/autocomplete/?term=${encodeURIComponent(candidateName.trim())}`;

    try {
      const res = await fetch(melodiceUrl, {
        headers: {
          "User-Agent": UA,
          "Referer": "https://melodice.org/",
          "Cookie": cookieHeader,
          "X-Requested-With": "XMLHttpRequest"
        },
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) continue;

      const text = await res.text();
      if (text.trim() === "fail") {
        console.warn(`[Music API] Melodice autocomplete returned 'fail' for "${candidateName}"`);
        continue;
      }

      const autocompleteResults = JSON.parse(text) as { value: string; id: string }[];
      if (!autocompleteResults || autocompleteResults.length === 0) continue;

      // 1. Exact match first
      let bestMatch = autocompleteResults.find(
        (item) => item.value.toLowerCase().trim() === candidateName.toLowerCase().trim()
      );

      // 2. Partial match as fallback (starts with query)
      if (!bestMatch) {
        bestMatch = autocompleteResults.find((item) =>
          item.value.toLowerCase().startsWith(candidateName.toLowerCase().split(":")[0].trim().toLowerCase())
        );
      }

      // 3. First result as last resort
      if (!bestMatch) {
        bestMatch = autocompleteResults[0];
      }

      let playlistUrl = "";
      if (bestMatch.id.startsWith("http")) {
        playlistUrl = bestMatch.id;
      } else if (bestMatch.id.startsWith("/")) {
        playlistUrl = `https://melodice.org${bestMatch.id}`;
      } else {
        playlistUrl = `https://melodice.org/playlist/${bestMatch.id}`;
      }

      console.log(
        `[Music API] Trying Melodice playlist: ${playlistUrl} (searched: "${candidateName}", matched: "${bestMatch.value}")`
      );

      const playRes = await fetch(playlistUrl, {
        headers: {
          "User-Agent": UA,
          "Cookie": cookieHeader,
          "Referer": "https://melodice.org/"
        },
        signal: AbortSignal.timeout(4000)
      });
      if (!playRes.ok) continue;

      const html = await playRes.text();
      const songs: Song[] = [];

      // 1. Try modern inline Javascript block parser
      const songsBlockMatch = html.match(/songs\s*=\s*\[([\s\S]*?)\];/);
      if (songsBlockMatch) {
        const blocks = [...songsBlockMatch[1].matchAll(/\{([\s\S]*?)\}/g)].map(m => m[1]);
        for (const block of blocks) {
          const eidMatch = block.match(/['"]?eid['"]?\s*:\s*['"]([^'"]+)['"]/i);
          const titleMatch = block.match(/['"]?title['"]?\s*:\s*['"]([^'"]+)['"]/i);
          if (eidMatch && titleMatch) {
            const title = titleMatch[1]
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">");
            songs.push({ eid: eidMatch[1], title });
          }
        }
      }

      // 2. Fallback to DOM parsing (for legacy compatibility)
      if (songs.length === 0) {
        const songRegex = /data-eid="([^"]+)"\s*data-title="([^"]+)"/g;
        const matches = [...html.matchAll(songRegex)];
        if (matches.length > 0) {
          for (const m of matches) {
            songs.push({ eid: m[1], title: m[2] });
          }
        }
      }

      if (songs.length > 0) {
        console.log(
          `[Music API] Found ${songs.length} songs on Melodice for "${candidateName}" → "${bestMatch.value}"`
        );
        return songs;
      }
    } catch (err) {
      console.warn(`[Music API] Melodice attempt failed for "${candidateName}":`, err);
    }
  }

  return [];
}

// -------------------------------------------------------
// Build a prioritised list of name variants to try
// Always uses the original BGG English name as the base
// -------------------------------------------------------
function buildNameVariants(englishName: string): string[] {
  const variants: string[] = [];
  const base = englishName.replace(/\(.*?\)/g, "").trim(); // Remove parenthetical suffixes

  // 1. Full original English name (most reliable for Melodice)
  variants.push(base);

  // 2. Remove subtitle after colon (e.g., "Gloomhaven: Jaws of the Lion" → "Gloomhaven")
  const withoutSubtitle = base.split(":")[0].trim();
  if (withoutSubtitle !== base) variants.push(withoutSubtitle);

  // 3. Remove leading article (The, A, An)
  const withoutArticle = base.replace(/^(The|A|An)\s+/i, "").trim();
  if (withoutArticle !== base) variants.push(withoutArticle);

  // 4. Remove trailing roman numeral or edition (e.g., "Pandemic II" → "Pandemic")
  const withoutRomanSuffix = base.replace(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)$/i, "").trim();
  if (withoutRomanSuffix !== base) variants.push(withoutRomanSuffix);

  // Remove duplicates while preserving order
  return [...new Set(variants)];
}

// -------------------------------------------------------
// YouTube fallback scraper
// -------------------------------------------------------
async function fetchFromYoutube(englishName: string): Promise<Song[]> {
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  try {
    const query = `${englishName} board game music soundtrack`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const ytRes = await fetch(searchUrl, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    });

    if (!ytRes.ok) return [];

    const html = await ytRes.text();
    const startIdx = html.indexOf("var ytInitialData =");
    if (startIdx === -1) return [];

    // Find matching closing brace
    const endIdx = html.indexOf("};\n", startIdx);
    if (endIdx === -1) return [];

    const jsonStr = html.substring(startIdx + "var ytInitialData =".length, endIdx + 1).trim();

    let data: unknown;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      // Simple regex fallback
      const match = html.match(/"videoId":"([^"]+)"/);
      if (match) {
        return [{ eid: match[1], title: `${englishName} Soundtrack` }];
      }
      return [];
    }

    const results: Song[] = [];

    const findVideos = (obj: unknown) => {
      if (!obj || typeof obj !== "object") return;
      const record = obj as Record<string, unknown>;
      if (record.videoRenderer) {
        const r = record.videoRenderer as Record<string, unknown>;
        const eid = r.videoId as string;
        let title = "";
        if (r.title && typeof r.title === "object") {
          const titleObj = r.title as Record<string, unknown>;
          if (Array.isArray(titleObj.runs) && titleObj.runs[0]) {
            title = ((titleObj.runs[0] as Record<string, unknown>).text as string) || "";
          }
        }
        const lowerTitle = title.toLowerCase();
        if (
          eid &&
          title &&
          !lowerTitle.includes("cómo jugar") &&
          !lowerTitle.includes("how to play") &&
          !lowerTitle.includes("tutorial") &&
          !lowerTitle.includes("review")
        ) {
          results.push({ eid, title });
        }
      } else {
        for (const key in record) {
          if (Object.prototype.hasOwnProperty.call(record, key)) {
            findVideos(record[key]);
          }
        }
      }
    };

    findVideos(data);

    if (results.length > 0) {
      console.log(`[Music API] YouTube fallback found ${results.length} videos for "${englishName}"`);
      return results.slice(0, 15);
    }
  } catch (err) {
    console.error(`[Music API] YouTube fallback failed for "${englishName}":`, err);
  }

  return [];
}

// -------------------------------------------------------
// Main API Route Handler
// -------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("id");
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!gameId) {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 });
    }

    // 1. Fetch game from DB — always use original English name (game.name) for Melodice
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { name: true, spanishName: true, musicPlaylist: true },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // 2. Check cache (30 days TTL)
    if (game.musicPlaylist && !forceRefresh) {
      try {
        const cache: PlaylistData = JSON.parse(game.musicPlaylist);
        const diffDays =
          (Date.now() - new Date(cache.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 30) {
          console.log(`[Music API] Cache hit for: "${game.name}"`);
          return NextResponse.json(cache);
        }
      } catch (err) {
        console.error("[Music API] Cache parse error, re-fetching:", err);
      }
    }

    // The original English name from BGG is always stored in game.name
    const englishName = game.name;
    console.log(`[Music API] Searching music for: "${englishName}" (Spanish: "${game.spanishName ?? "—"}")`);

    // 3. Build name variants and search Melodice (always uses English name)
    const nameVariants = buildNameVariants(englishName);
    console.log(`[Music API] Name variants to try:`, nameVariants);

    let songs: Song[] = await fetchFromMelodice(nameVariants);

    // 4. YouTube fallback if Melodice found nothing
    if (songs.length === 0) {
      console.log(`[Music API] Melodice returned nothing. Trying YouTube fallback...`);
      songs = await fetchFromYoutube(englishName);
    }

    // 5. Save result to DB cache
    const cacheData: PlaylistData = {
      lastUpdated: new Date().toISOString(),
      songs,
    };

    await prisma.game.update({
      where: { id: gameId },
      data: { musicPlaylist: JSON.stringify(cacheData) },
    });

    console.log(`[Music API] Saved ${songs.length} songs for "${englishName}"`);
    return NextResponse.json(cacheData);
  } catch (error) {
    console.error(`[Music API] Fatal error:`, error);
    return NextResponse.json({ error: "Failed to get music playlist" }, { status: 500 });
  }
}
