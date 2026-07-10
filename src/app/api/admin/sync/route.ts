import { NextRequest, NextResponse } from "next/server";
import { runSync, runSyncTopBgg, runForceReSyncAll } from "@/lib/sync";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "collection";
    const username = searchParams.get("username") || process.env.BGG_USERNAME || "boardgamegeek";

    if (type === "ranking") {
      console.log(`[API Admin Sync] Triggering background sync for BGG Ranking Top 1000`);

      runSyncTopBgg(1000)
        .then((result) => {
          console.log(
            `[API Admin Sync] Background ranking sync finished successfully. Games synced: ${result.count}`
          );
        })
        .catch((err) => {
          console.error(`[API Admin Sync] Background ranking sync failed:`, err);
        });

      return NextResponse.json(
        {
          status: "started",
          message: `Synchronization started in the background for BGG Ranking Top 1000. Check server logs for details.`,
        },
        { status: 202 }
      );
    } else if (type === "force-re-sync") {
      console.log(`[API Admin Sync] Triggering background force re-sync of all games`);

      runForceReSyncAll()
        .then((result) => {
          console.log(
            `[API Admin Sync] Background force re-sync finished successfully. Games updated: ${result.count}`
          );
        })
        .catch((err) => {
          console.error(`[API Admin Sync] Background force re-sync failed:`, err);
        });

      return NextResponse.json(
        {
          status: "started",
          message: `Force re-synchronization of all games started in the background. This will replace any mock/fake images with real BGG images. Check server logs for details.`,
        },
        { status: 202 }
      );
    } else {
      console.log(`[API Admin Sync] Triggering background collection sync for user: "${username}"`);

      runSync(username)
        .then((result) => {
          console.log(
            `[API Admin Sync] Background collection sync finished successfully. Source: ${result.source}, Games synced: ${result.count}`
          );
        })
        .catch((err) => {
          console.error(`[API Admin Sync] Background collection sync failed:`, err);
        });

      return NextResponse.json(
        {
          status: "started",
          message: `Synchronization started in the background for user: "${username}". Check server logs for details.`,
        },
        { status: 202 }
      );
    }
  } catch (error) {
    console.error(`[API Admin Sync] Error initiating sync:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to start sync" }, { status: 500 });
  }
}
