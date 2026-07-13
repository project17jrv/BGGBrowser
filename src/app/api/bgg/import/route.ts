import { NextRequest, NextResponse } from "next/server";
import { importSingleBggGame } from "@/lib/sync";

export async function POST(req: NextRequest) {
  try {
    const { bggId } = await req.json();
    if (!bggId || isNaN(parseInt(bggId, 10))) {
      return NextResponse.json({ error: "Invalid or missing BGG ID" }, { status: 400 });
    }

    const result = await importSingleBggGame(parseInt(bggId, 10));
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to import game" }, { status: 500 });
    }

    return NextResponse.json({ success: true, gameId: result.gameId });
  } catch (error) {
    console.error("[BGG Import API] Error:", error);
    return NextResponse.json({ error: "Failed to process import request" }, { status: 500 });
  }
}
