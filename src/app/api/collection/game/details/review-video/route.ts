import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export interface ReviewVideo {
  id: string; // YouTube Video ID
  title: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("id");
    const customQuery = searchParams.get("q");

    let searchQuery = "";
    if (customQuery) {
      searchQuery = customQuery;
    } else {
      if (!gameId) {
        return NextResponse.json({ error: "Game ID or Search Query is required" }, { status: 400 });
      }
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { name: true, spanishName: true },
      });
      if (!game) {
        return NextResponse.json({ error: "Game not found" }, { status: 404 });
      }
      searchQuery = `${game.spanishName || game.name} tutorial juego de mesa`;
    }

    console.log(`[YouTube Reviews] Searching YouTube for query: "${searchQuery}"`);

    // 2. Fetch YouTube search results page
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch YouTube page: ${res.statusText}`);
    }

    const html = await res.text();
    
    // 3. Extract videoIds and titles using regex
    // YouTube Initial Data contains blocks like: "videoId":"VIDEO_ID" ... "title":{"runs":[{"text":"VIDEO_TITLE"}]}
    // We can extract all "videoId":"..." matches and find their corresponding title
    const videos: ReviewVideo[] = [];
    const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    const matches = [...html.matchAll(videoIdRegex)];
    const uniqueIds = Array.from(new Set(matches.map(m => m[1])));

    // Limit to first 8 unique video IDs
    const targetIds = uniqueIds.slice(0, 8);

    for (const vid of targetIds) {
      // Find the title matching this videoId in the page html
      // Let's do a simple substring lookup
      let title = `${searchQuery} Reseña`;
      const index = html.indexOf(`"videoId":"${vid}"`);
      if (index !== -1) {
        // Look for the next title block nearby (up to 3000 chars)
        const sub = html.substring(index, index + 3000);
        const titleMatch = sub.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}/);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1];
        }
      }
      videos.push({
        id: vid,
        title: title.replace(/\\u0026/g, "&").replace(/\\"/g, '"'),
      });
    }

    return NextResponse.json({ videos });
  } catch (error) {
    console.error(`[YouTube Reviews API] Error searching YouTube:`, error);
    return NextResponse.json({ error: "Failed to load review videos" }, { status: 500 });
  }
}
