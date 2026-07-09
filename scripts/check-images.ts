import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("Checking database games for image issues...");
  const games = await prisma.game.findMany({
    select: {
      id: true,
      bggId: true,
      name: true,
      imageUrl: true,
      thumbnailUrl: true,
    },
  });

  console.log(`Total games in DB: ${games.length}`);

  let missingCount = 0;
  let localFileMissingCount = 0;
  let fallbackCount = 0;

  const publicDir = path.join(process.cwd(), "public");

  for (const game of games) {
    const imgUrl = game.imageUrl;
    const thumbUrl = game.thumbnailUrl;

    if (!imgUrl || !thumbUrl) {
      console.log(`[Missing URL] Game: "${game.name}" (BGG ID: ${game.bggId}) - image: ${imgUrl}, thumb: ${thumbUrl}`);
      missingCount++;
      continue;
    }

    if (imgUrl.startsWith("/images/")) {
      const localPath = path.join(publicDir, imgUrl);
      if (!fs.existsSync(localPath)) {
        console.log(`[File Not Found] Game: "${game.name}" (BGG ID: ${game.bggId}) - expected local file: ${localPath}`);
        localFileMissingCount++;
      }
    } else if (imgUrl.startsWith("http")) {
      fallbackCount++;
    }
  }

  console.log("=== Image Audit Results ===");
  console.log(`Missing image/thumbnail URL in DB: ${missingCount}`);
  console.log(`Local image file missing on disk: ${localFileMissingCount}`);
  console.log(`Falling back to BGG CDN directly: ${fallbackCount}`);
}

main()
  .catch((err) => {
    console.error("Audit failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
