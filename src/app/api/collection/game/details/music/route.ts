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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("id");
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!gameId) {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 });
    }

    // 1. Fetch game details from DB
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { name: true, musicPlaylist: true },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // 2. Check cache (30 days TTL)
    if (game.musicPlaylist && !forceRefresh) {
      try {
        const cache: PlaylistData = JSON.parse(game.musicPlaylist);
        const lastUpdated = new Date(cache.lastUpdated);
        const now = new Date();
        const diffMs = now.getTime() - lastUpdated.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays < 30) {
          console.log(`[Music API Cache] Hit for game: "${game.name}"`);
          return NextResponse.json(cache);
        }
      } catch (err) {
        console.error("[Music API Cache] Error parsing JSON, re-fetching...", err);
      }
    }

    console.log(`[Music API Scraper] Cache miss/force-refresh for: "${game.name}"`);

    let songs: Song[] = [];

    // 3. Query Melodice Autocomplete API
    const cleanName = game.name.replace(/\(.*?\)/g, "").trim();
    const melodiceUrl = `https://melodice.org/api/autocomplete/?term=${encodeURIComponent(cleanName)}`;
    
    try {
      const res = await fetch(melodiceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
      });

      if (res.ok) {
        const autocompleteResults = await res.json() as { value: string; id: string }[];
        // Find best match
        const bestMatch = autocompleteResults.find(
          item => item.value.toLowerCase().trim() === cleanName.toLowerCase().trim()
        ) || autocompleteResults[0];

        if (bestMatch && bestMatch.id) {
          // Melodice playlist URL
          const playlistUrl = `https://melodice.org${bestMatch.id}`;
          console.log(`[Music API Scraper] Fetching Melodice playlist: ${playlistUrl}`);

          const playRes = await fetch(playlistUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
          });

          if (playRes.ok) {
            const html = await playRes.text();
            
            // Regex to parse songs from Melodice
            // E.g., <li ... data-eid="YOUTUBE_ID" data-title="SONG_TITLE">
            const songRegex = /data-eid="([^"]+)"\s*data-title="([^"]+)"/g;
            const matches = [...html.matchAll(songRegex)];

            if (matches.length > 0) {
              songs = matches.map(m => ({
                eid: m[1],
                title: m[2],
              }));
              console.log(`[Music API Scraper] Parsed ${songs.length} songs from Melodice.`);
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[Music API Scraper] Melodice fetch failed: ${err}`);
    }

    // 4. YouTube Fallback
    if (songs.length === 0) {
      console.log(`[Music API Scraper] Melodice not found/failed. Using YouTube Fallback for: "${cleanName}"`);
      try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanName + " soundtrack")}`;
        const ytRes = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "es-ES,es;q=0.9",
          }
        });

        if (ytRes.ok) {
          const html = await ytRes.text();
          // Find first videoId
          const match = html.match(/"videoId":"([^"]+)"/);
          if (match) {
            songs = [{
              eid: match[1],
              title: `${cleanName} Soundtrack (Ambient Music)`
            }];
            console.log(`[Music API Scraper] YouTube Fallback match: ${match[1]}`);
          }
        }
      } catch (err) {
        console.error(`[Music API Scraper] YouTube Fallback failed: ${err}`);
      }
    }

    // 5. Save in SQLite Cache
    const cacheData: PlaylistData = {
      lastUpdated: new Date().toISOString(),
      songs,
    };

    await prisma.game.update({
      where: { id: gameId },
      data: {
        musicPlaylist: JSON.stringify(cacheData),
      },
    });

    return NextResponse.json(cacheData);
  } catch (error) {
    console.error(`[Music API] Failed to get music playlist:`, error);
    return NextResponse.json({ error: "Failed to get music playlist" }, { status: 500 });
  }
}
