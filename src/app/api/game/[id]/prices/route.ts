import { NextRequest, NextResponse } from "next/server";
import { getLudonautaPrices } from "@/lib/ludonauta";

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
