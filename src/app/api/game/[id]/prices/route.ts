import { NextRequest, NextResponse } from "next/server";
import { getLudonautaPrices } from "@/lib/ludonauta";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await props.params;
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const data = await getLudonautaPrices(resolvedParams.id, forceRefresh);
    if (!data) {
      return NextResponse.json({ error: "Game not found or pricing scraping failed" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API Game Prices] Error fetching prices:`, error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await props.params;
    const body = await req.json();
    const { includedLinks } = body;

    const game = await prisma.game.findUnique({
      where: { id: resolvedParams.id },
      select: { ludonautaCache: true }
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    let cacheData: any = {};
    if (game.ludonautaCache) {
      try {
        cacheData = JSON.parse(game.ludonautaCache);
      } catch (e) {
        // ignore
      }
    }

    cacheData.includedLinks = includedLinks;

    await prisma.game.update({
      where: { id: resolvedParams.id },
      data: {
        ludonautaCache: JSON.stringify(cacheData)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API Game Prices POST] Error:`, error);
    return NextResponse.json({ error: "Failed to save prices selections" }, { status: 500 });
  }
}
