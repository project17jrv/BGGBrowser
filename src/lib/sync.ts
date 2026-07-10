/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { prisma } from "./db";

// Token checks
const apiKey = process.env.BGG_API_KEY || process.env.BGG_TOKEN || "";

// Convert XML node to array
function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined) return [];
  return Array.isArray(val) ? val : [val];
}

// Helper to delay execution
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Ensure output directories exist
const imagesDir = path.join(process.cwd(), "public", "images", "games");

function ensureDirectoryExists() {
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
}

// Helper to download an image from a URL and save it locally
async function downloadImage(url: string, bggId: number, isThumb = false): Promise<string> {
  if (!url) return "";
  ensureDirectoryExists();
  const filename = `${bggId}${isThumb ? "-thumb" : ""}.jpg`;
  const filepath = path.join(imagesDir, filename);
  const relativePath = `/images/games/${filename}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    return relativePath;
  } catch (error) {
    console.warn(`[Warning] Could not download image ${url}. Falling back to CDN. Error: ${error instanceof Error ? error.message : error}`);
    return url; // fallback to BGG CDN URL
  }
}

interface BggCollectionItem {
  bggId: number;
  owned: boolean;
  status: string;
  name: string;
}

// Fetch the user's collection from BGG XML API2
async function fetchCollection(username: string): Promise<BggCollectionItem[]> {
  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}`;
  console.log(`[Collection] Fetching collection for user: "${username}" from ${url}`);

  const maxRetries = 10;
  let delay = 3000;

  const headers: HeadersInit = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, { headers });

    if (response.status === 401) {
      throw new Error("401_UNAUTHORIZED");
    }

    if (response.status === 202) {
      console.log(`[Collection] BGG returned 202 (Accepted/Processing). Retrying in ${delay / 1000}s (Attempt ${attempt}/${maxRetries})...`);
      await sleep(delay);
      delay = Math.min(delay * 1.5, 15000);
      continue;
    }

    if (!response.ok) {
      throw new Error(`BGG API returned error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    
    if (xmlText.includes("Your request for this collection has been accepted and will be processed")) {
      console.log(`[Collection] XML body contains queue message. Retrying in ${delay / 1000}s (Attempt ${attempt}/${maxRetries})...`);
      await sleep(delay);
      delay = Math.min(delay * 1.5, 15000);
      continue;
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const parsed = parser.parse(xmlText);
    
    if (parsed.errors) {
      throw new Error(`Failed to parse XML: ${JSON.stringify(parsed.errors)}`);
    }

    const items = toArray(parsed.items?.item);
    console.log(`[Collection] Successfully retrieved ${items.length} items from BGG collection.`);

    const collectionItems: BggCollectionItem[] = [];
    for (const item of items) {
      const bggId = parseInt(item["@_objectid"], 10);
      if (isNaN(bggId)) continue;

      const isOwned = item.status?.["@_own"] === "1";
      const isWishlist = item.status?.["@_wishlist"] === "1";
      const name = item.name?.["#text"] || item.name || "";

      if (isOwned || isWishlist) {
        collectionItems.push({
          bggId,
          owned: isOwned,
          status: isOwned ? "in_collection" : "wishlist",
          name,
        });
      }
    }
    return collectionItems;
  }

  throw new Error(`[Collection] Max retries exceeded. BGG collection is still processing.`);
}

// Fetch detailed game data for a list of BGG IDs
async function fetchGameDetails(bggIds: number[]): Promise<any[]> {
  console.log(`[Details] Fetching details for ${bggIds.length} games...`);
  const chunkSize = 20;
  const gamesDetails: any[] = [];

  const headers: HeadersInit = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  for (let i = 0; i < bggIds.length; i += chunkSize) {
    const chunk = bggIds.slice(i, i + chunkSize);
    const idList = chunk.join(",");
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${idList}&stats=1`;

    console.log(`[Details] Fetching chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(bggIds.length / chunkSize)} (IDs: ${chunk.length})...`);
    
    let attempt = 0;
    let xmlText = "";
    while (attempt < 5) {
      try {
        const response = await fetch(url, { headers });
        if (response.status === 401) {
          throw new Error("401_UNAUTHORIZED");
        }
        if (!response.ok) {
          throw new Error(`Thing API error: ${response.status} ${response.statusText}`);
        }
        xmlText = await response.text();
        break;
      } catch (err: any) {
        if (err.message === "401_UNAUTHORIZED") {
          throw err;
        }
        attempt++;
        console.warn(`[Details] Attempt ${attempt} failed. Retrying in 3s...`, err);
        await sleep(3000);
      }
    }

    if (!xmlText) {
      console.error(`[Error] Could not fetch details for chunk: ${idList}`);
      continue;
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const parsed = parser.parse(xmlText);
    const items = toArray(parsed.items?.item);

    gamesDetails.push(...items);
    
    if (i + chunkSize < bggIds.length) {
      await sleep(1500);
    }
  }

  return gamesDetails;
}

// Helper to extract the "best" player count from community suggested_numplayers poll
function getBestPlayerCount(item: any): string | null {
  if (!item || !item.poll) return null;
  const polls = toArray(item.poll);
  const playerPoll = polls.find((p: any) => p["@_name"] === "suggested_numplayers");
  if (!playerPoll) return null;

  const totalVotes = parseInt(playerPoll["@_totalvotes"] || "0", 10);
  if (isNaN(totalVotes) || totalVotes === 0) return null;

  const resultsList = toArray(playerPoll.results);
  let maxBestVotes = -1;
  let bestPlayerCounts: string[] = [];

  for (const res of resultsList) {
    const numPlayers = res["@_numplayers"];
    if (!numPlayers) continue;

    const results = toArray(res.result);
    const bestResult = results.find((r: any) => r["@_value"] === "Best");
    if (bestResult) {
      const bestVotes = parseInt(bestResult["@_numvotes"] || "0", 10);
      if (!isNaN(bestVotes)) {
        if (bestVotes > maxBestVotes) {
          maxBestVotes = bestVotes;
          bestPlayerCounts = [numPlayers];
        } else if (bestVotes === maxBestVotes && maxBestVotes > 0) {
          bestPlayerCounts.push(numPlayers);
        }
      }
    }
  }

  if (maxBestVotes <= 0) return null;
  return bestPlayerCounts.join(", ");
}

interface SyncOptions {
  markAsOwned?: boolean;
  statusMap?: Record<number, { owned: boolean; status: string; spanishName?: string | null }>;
}

// Process details and upsert into the DB
async function syncGamesToDb(gamesDetails: any[], options?: SyncOptions) {
  console.log(`[Sync] Upserting ${gamesDetails.length} games to SQLite...`);
  let successCount = 0;

  for (const item of gamesDetails) {
    try {
      const bggId = parseInt(item["@_id"], 10);
      if (isNaN(bggId)) continue;

      const names = toArray(item.name);
      const primaryNameObj = names.find((n: any) => n["@_type"] === "primary");
      const name = primaryNameObj ? primaryNameObj["@_value"] : (names[0]?.["@_value"] || "Unknown Board Game");

      const yearPublished = item.yearpublished ? parseInt(item.yearpublished["@_value"], 10) : null;
      const description = item.description || "";
      const minPlayers = item.minplayers ? parseInt(item.minplayers["@_value"], 10) : null;
      const maxPlayers = item.maxplayers ? parseInt(item.maxplayers["@_value"], 10) : null;
      const minPlayTime = item.minplaytime ? parseInt(item.minplaytime["@_value"], 10) : null;
      const maxPlayTime = item.maxplaytime ? parseInt(item.maxplaytime["@_value"], 10) : null;
      const minAge = item.minage ? parseInt(item.minage["@_value"], 10) : null;
      const bestPlayers = getBestPlayerCount(item);

      const stats = item.statistics?.ratings;
      const usersRated = stats?.usersrated ? parseInt(stats.usersrated["@_value"], 10) : null;
      const averageRating = stats?.average ? parseFloat(stats.average["@_value"]) : null;
      const complexityWeight = stats?.averageweight ? parseFloat(stats.averageweight["@_value"]) : null;

      const ranks = toArray(stats?.ranks?.rank);
      const boardgameRankObj = ranks.find((r: any) => r["@_name"] === "boardgame");
      let rank: number | null = null;
      if (boardgameRankObj && boardgameRankObj["@_value"]) {
        const parsedRank = parseInt(boardgameRankObj["@_value"], 10);
        if (!isNaN(parsedRank)) {
          rank = parsedRank;
        }
      }

      const links = toArray(item.link);
      const categories = links.filter((l: any) => l["@_type"] === "boardgamecategory").map((l: any) => l["@_value"].trim());
      const mechanics = links.filter((l: any) => l["@_type"] === "boardgamemechanic").map((l: any) => l["@_value"].trim());
      const designers = links.filter((l: any) => l["@_type"] === "boardgamedesigner").map((l: any) => l["@_value"].trim());
      const publishers = links.filter((l: any) => l["@_type"] === "boardgamepublisher").map((l: any) => l["@_value"].trim());

      const isExpansion = item["@_type"] === "boardgameexpansion";

      const localImageUrl = await downloadImage(item.image, bggId, false);
      const localThumbUrl = await downloadImage(item.thumbnail, bggId, true);

      const collectionName = options?.statusMap && options.statusMap[bggId]?.spanishName;
      const spanishName = collectionName && collectionName !== name ? collectionName : null;

      await prisma.game.upsert({
        where: { bggId },
        update: {
          name,
          yearPublished: isNaN(yearPublished as any) ? null : yearPublished,
          imageUrl: localImageUrl,
          thumbnailUrl: localThumbUrl,
          rank,
          averageRating: isNaN(averageRating as any) ? null : averageRating,
          usersRated: isNaN(usersRated as any) ? null : usersRated,
          complexityWeight: isNaN(complexityWeight as any) ? null : complexityWeight,
          minPlayers: isNaN(minPlayers as any) ? null : minPlayers,
          maxPlayers: isNaN(maxPlayers as any) ? null : maxPlayers,
          bestPlayers,
          minPlayTime: isNaN(minPlayTime as any) ? null : minPlayTime,
          maxPlayTime: isNaN(maxPlayTime as any) ? null : maxPlayTime,
          minAge: isNaN(minAge as any) ? null : minAge,
          isExpansion,
          ...(options?.statusMap && options.statusMap[bggId]
            ? {
                owned: options.statusMap[bggId].owned,
                status: options.statusMap[bggId].status,
                ...(spanishName ? { spanishName } : {}),
              }
            : options?.markAsOwned
            ? { owned: true }
            : {}),
          categories: {
            set: [],
            connectOrCreate: categories.map((cat: string) => ({
              where: { name: cat },
              create: { name: cat },
            })),
          },
          mechanics: {
            set: [],
            connectOrCreate: mechanics.map((mec: string) => ({
              where: { name: mec },
              create: { name: mec },
            })),
          },
          designers: {
            set: [],
            connectOrCreate: designers.map((des: string) => ({
              where: { name: des },
              create: { name: des },
            })),
          },
          publishers: {
            set: [],
            connectOrCreate: publishers.map((pub: string) => ({
              where: { name: pub },
              create: { name: pub },
            })),
          },
        },
        create: {
          bggId,
          name,
          yearPublished: isNaN(yearPublished as any) ? null : yearPublished,
          imageUrl: localImageUrl,
          thumbnailUrl: localThumbUrl,
          description,
          rank,
          averageRating: isNaN(averageRating as any) ? null : averageRating,
          usersRated: isNaN(usersRated as any) ? null : usersRated,
          complexityWeight: isNaN(complexityWeight as any) ? null : complexityWeight,
          minPlayers: isNaN(minPlayers as any) ? null : minPlayers,
          maxPlayers: isNaN(maxPlayers as any) ? null : maxPlayers,
          bestPlayers,
          minPlayTime: isNaN(minPlayTime as any) ? null : minPlayTime,
          maxPlayTime: isNaN(maxPlayTime as any) ? null : maxPlayTime,
          minAge: isNaN(minAge as any) ? null : minAge,
          owned: options?.statusMap && options.statusMap[bggId]
            ? options.statusMap[bggId].owned
            : (options?.markAsOwned ?? false),
          status: options?.statusMap && options.statusMap[bggId]
            ? options.statusMap[bggId].status
            : "in_collection",
          spanishName,
          isExpansion,
          categories: {
            connectOrCreate: categories.map((cat: string) => ({
              where: { name: cat },
              create: { name: cat },
            })),
          },
          mechanics: {
            connectOrCreate: mechanics.map((mec: string) => ({
              where: { name: mec },
              create: { name: mec },
            })),
          },
          designers: {
            connectOrCreate: designers.map((des: string) => ({
              where: { name: des },
              create: { name: des },
            })),
          },
          publishers: {
            connectOrCreate: publishers.map((pub: string) => ({
              where: { name: pub },
              create: { name: pub },
            })),
          },
        },
      });

      successCount++;
    } catch (err) {
      console.error(`[Error] Failed to sync game "${item.name?.["@_value"] || "Unknown"}"`, err);
    }
  }

  console.log(`[Sync] Successfully sync'd ${successCount}/${gamesDetails.length} games.`);
  return successCount;
}

// Seed mock data
async function seedMockData() {
  const mockPath = path.join(process.cwd(), "scripts", "mock-games.json");
  if (!fs.existsSync(mockPath)) {
    throw new Error(`Mock data file not found at ${mockPath}`);
  }
  console.log(`[Sync] Seeding database with high-quality fallback...`);
  const mockData = JSON.parse(fs.readFileSync(mockPath, "utf-8"));
  return await syncGamesToDb(mockData, { markAsOwned: true });
}

// Core execution function accessible by CLI and Web routes
export async function runSync(username: string): Promise<{ success: boolean; count: number; source: "bgg" | "mock" }> {
  try {
    if (username === "demo_fallback" || !apiKey) {
      console.warn(`[Warning] Demo fallback or no API Key configured. Seeding mock fallback...`);
      const count = await seedMockData();
      return { success: true, count, source: "mock" };
    }

    const collectionItems = await fetchCollection(username);
    if (collectionItems.length === 0) {
      console.log(`[Sync] No games found for user: ${username}`);
      return { success: true, count: 0, source: "bgg" };
    }

    const bggIds = collectionItems.map((item) => item.bggId);
    const statusMap: Record<number, { owned: boolean; status: string; spanishName?: string | null }> = {};
    for (const item of collectionItems) {
      statusMap[item.bggId] = {
        owned: item.owned,
        status: item.status,
        spanishName: item.name,
      };
    }

    const details = await fetchGameDetails(bggIds);
    const count = await syncGamesToDb(details, { statusMap });

    // Clean up collection items that are no longer owned
    await prisma.game.updateMany({
      where: {
        bggId: { notIn: bggIds },
        owned: true,
      },
      data: {
        owned: false,
      },
    });

    // Clean up collection items that are no longer wishlisted
    const wishlistBggIds = collectionItems.filter((i) => i.status === "wishlist").map((i) => i.bggId);
    await prisma.game.updateMany({
      where: {
        bggId: { notIn: wishlistBggIds },
        status: "wishlist",
      },
      data: {
        status: "in_collection", // reset to default
      },
    });

    return { success: true, count, source: "bgg" };
  } catch (error: any) {
    if (error.message === "401_UNAUTHORIZED") {
      console.error(`[API Error] 401 Unauthorized. Seeding mock fallback...`);
      const count = await seedMockData();
      return { success: true, count, source: "mock" };
    } else {
      console.error(`[Sync] Sync failed with error:`, error);
      throw error;
    }
  }
}

// Synchronize general BGG ranking games (top games)
export async function runSyncTopBgg(limit = 250): Promise<{ success: boolean; count: number }> {
  try {
    console.log(`[Sync Top BGG] Starting sync of top ${limit} BGG games...`);

    // Fetch CSV ranking data (try today, yesterday, and fallbacks)
    const today = new Date();
    const datesToTry: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      datesToTry.push(`${yyyy}-${mm}-${dd}`);
    }
    datesToTry.push("2026-06-15"); // known stable fallback

    let csvText = "";
    for (const dateStr of datesToTry) {
      const url = `https://raw.githubusercontent.com/beefsack/bgg-ranking-historicals/master/${dateStr}.csv`;
      try {
        console.log(`[Sync Top BGG] Trying to fetch CSV from: ${url}`);
        const response = await fetch(url);
        if (response.ok) {
          csvText = await response.text();
          console.log(`[Sync Top BGG] Successfully fetched CSV for date: ${dateStr}`);
          break;
        }
      } catch (e) {
        console.warn(`[Sync Top BGG] Failed to fetch CSV for date ${dateStr}:`, e);
      }
    }

    if (!csvText) {
      throw new Error("Could not fetch any BGG ranking CSV file from beefsack/bgg-ranking-historicals");
    }

    // Parse BGG IDs
    const lines = csvText.split("\n");
    const bggIds: number[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("ID,Name") || trimmed.startsWith("---")) {
        continue;
      }
      const parts = trimmed.split(",");
      const id = parseInt(parts[0], 10);
      if (!isNaN(id)) {
        bggIds.push(id);
        if (bggIds.length >= limit) {
          break;
        }
      }
    }

    if (bggIds.length === 0) {
      throw new Error("Parsed 0 IDs from the BGG ranking CSV.");
    }

    console.log(`[Sync Top BGG] Parsed ${bggIds.length} top game IDs from CSV.`);

    // Fetch details in chunks from BGG Thing API
    const details = await fetchGameDetails(bggIds);

    // Sync details to DB (markAsOwned = false, so it won't overwrite true owned games)
    const count = await syncGamesToDb(details, { markAsOwned: false });

    return { success: true, count };
  } catch (error) {
    console.error(`[Sync Top BGG] Sync failed with error:`, error);
    throw error;
  }
}

// Force re-sync all games in the DB to fetch real details and images from BGG
export async function runForceReSyncAll(): Promise<{ success: boolean; count: number }> {
  try {
    console.log(`[Force Re-Sync] Fetching all games from database...`);
    const games = await prisma.game.findMany({
      select: {
        bggId: true,
      },
    });

    if (games.length === 0) {
      console.log(`[Force Re-Sync] No games found in database to re-sync.`);
      return { success: true, count: 0 };
    }

    const bggIds = games.map((g) => g.bggId);
    console.log(`[Force Re-Sync] Found ${bggIds.length} games to re-sync.`);

    // Fetch details in chunks from BGG Thing API
    const details = await fetchGameDetails(bggIds);

    // Sync details back to DB (markAsOwned = false preserves their existing owned status)
    const count = await syncGamesToDb(details, { markAsOwned: false });

    return { success: true, count };
  } catch (error) {
    console.error(`[Force Re-Sync] Re-sync failed with error:`, error);
    throw error;
  }
}
