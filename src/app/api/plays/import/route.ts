import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { prisma } from "@/lib/db";

// Helper to convert XML element to array
function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined) return [];
  return Array.isArray(val) ? val : [val];
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username") || process.env.BGG_USERNAME;

    if (!username) {
      return NextResponse.json({ error: "BGG Username is required" }, { status: 400 });
    }

    console.log(`[API Plays Import] Fetching plays for user: "${username}"`);
    const url = `https://boardgamegeek.com/xmlapi2/plays?username=${encodeURIComponent(username)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`BGG Plays API returned error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const parsed = parser.parse(xmlText);
    const plays = toArray(parsed.plays?.play);
    
    console.log(`[API Plays Import] Parsed ${plays.length} plays from XML.`);

    let importedCount = 0;

    for (const play of plays) {
      const bggPlayId = parseInt(play["@_id"], 10);
      if (isNaN(bggPlayId)) continue;

      // Check if already imported
      const exists = await prisma.playSession.findFirst({
        where: { bggPlayId },
      });
      if (exists) continue;

      const gameName = play.item?.["@_name"] || "Unknown Game";
      const bggId = parseInt(play.item?.["@_objectid"], 10) || null;
      const playedAt = new Date(play["@_date"]);
      const durationMinutes = parseInt(play["@_length"], 10) || null;
      const location = play["@_location"] || null;
      const notes = play.comments || null;

      // Extract players
      const rawPlayers = toArray(play.players?.player);
      const players = rawPlayers.map((p: Record<string, string>) => {
        const name = p["@_name"] || p["@_username"] || "Anon";
        const score = parseInt(p["@_score"], 10) || null;
        const isWinner = p["@_win"] === "1" || p["@_win"] === "true";
        const faction = p["@_faction"] || null;
        const role = p["@_role"] || null;
        return { name, score, isWinner, faction, role };
      });

      // Guess session mode
      let mode = "competitive";
      if (players.length === 1) {
        mode = "solo";
      } else if (play["@_incomplete"] === "1") {
        mode = "cooperative"; // or default to competitive, team, etc.
      }

      // Try to match thumbnail from DB
      let gameThumbnail = null;
      if (bggId) {
        const dbGame = await prisma.game.findUnique({
          where: { bggId },
          select: { thumbnailUrl: true },
        });
        if (dbGame) {
          gameThumbnail = dbGame.thumbnailUrl;
        }
      }

      // Create session
      await prisma.playSession.create({
        data: {
          bggPlayId,
          bggId,
          gameName,
          gameThumbnail,
          playedAt,
          durationMinutes,
          location,
          mode,
          notes,
          players: {
            create: players,
          },
        },
      });

      // Mark local game as played if it exists
      if (bggId) {
        await prisma.game.updateMany({
          where: { bggId },
          data: { played: true },
        });
      }

      importedCount++;
    }

    return NextResponse.json({ success: true, count: importedCount });
  } catch (error) {
    console.error("[API Plays Import] Sincronización fallida:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to import plays" }, { status: 500 });
  }
}
