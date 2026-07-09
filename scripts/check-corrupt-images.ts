import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("Auditing image file sizes on disk...");
  const publicDir = path.join(process.cwd(), "public");
  const games = await prisma.game.findMany({
    select: {
      id: true,
      bggId: true,
      name: true,
      imageUrl: true,
      thumbnailUrl: true,
    },
  });

  let corruptCount = 0;
  const corruptGames: typeof games = [];

  for (const game of games) {
    let isCorrupt = false;

    if (game.imageUrl && game.imageUrl.startsWith("/images/")) {
      const fullPath = path.join(publicDir, game.imageUrl);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        if (stats.size < 500) { // less than 500 bytes is likely corrupt or error response
          console.log(`[Corrupt Image] Game: "${game.name}" (BGG ID: ${game.bggId}) - file: ${game.imageUrl} is only ${stats.size} bytes.`);
          isCorrupt = true;
        }
      }
    }

    if (game.thumbnailUrl && game.thumbnailUrl.startsWith("/images/")) {
      const fullPath = path.join(publicDir, game.thumbnailUrl);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        if (stats.size < 500) {
          console.log(`[Corrupt Thumbnail] Game: "${game.name}" (BGG ID: ${game.bggId}) - file: ${game.thumbnailUrl} is only ${stats.size} bytes.`);
          isCorrupt = true;
        }
      }
    }

    if (isCorrupt) {
      corruptCount++;
      corruptGames.push(game);
    }
  }

  console.log(`Audited ${games.length} games. Found ${corruptCount} corrupt images.`);
}

main()
  .catch((err) => {
    console.error("Audit failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
