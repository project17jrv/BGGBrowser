import { NextRequest, NextResponse } from "next/server";
import { getGameSleeves } from "@/lib/sleeves";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await props.params;
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const data = await getGameSleeves(resolvedParams.id, forceRefresh);
    if (!data) {
      return NextResponse.json({ error: "Game not found or sleeves scraping failed" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API Game Sleeves] Error fetching sleeves:`, error);
    return NextResponse.json({ error: "Failed to fetch sleeves" }, { status: 500 });
  }
}
