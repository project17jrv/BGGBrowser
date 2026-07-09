import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("Checking image file headers (magic numbers)...");
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

  let invalidCount = 0;
  const invalidFiles: { path: string; gameName: string; bggId: number; type: string }[] = [];

  for (const game of games) {
    if (game.imageUrl && game.imageUrl.startsWith("/images/")) {
      const fullPath = path.join(publicDir, game.imageUrl);
      if (fs.existsSync(fullPath)) {
        const buffer = Buffer.alloc(4);
        const fd = fs.openSync(fullPath, "r");
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);

        // Check if file starts with '<' (HTML start) or doesn't match JPEG/PNG magic bytes
        const isHtml = buffer[0] === 0x3c; // '<'
        const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
        const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46; // GIF

        if (isHtml || (!isJpeg && !isPng && !isGif)) {
          console.log(`[Invalid Image Header] Game: "${game.name}" (BGG ID: ${game.bggId}) - file: ${game.imageUrl} has magic bytes [${buffer.toString("hex")}], looks like HTML: ${isHtml}`);
          invalidFiles.push({ path: fullPath, gameName: game.name, bggId: game.bggId, type: "imageUrl" });
          invalidCount++;
        }
      }
    }

    if (game.thumbnailUrl && game.thumbnailUrl.startsWith("/images/")) {
      const fullPath = path.join(publicDir, game.thumbnailUrl);
      if (fs.existsSync(fullPath)) {
        const buffer = Buffer.alloc(4);
        const fd = fs.openSync(fullPath, "r");
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);

        const isHtml = buffer[0] === 0x3c;
        const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
        const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;

        if (isHtml || (!isJpeg && !isPng && !isGif)) {
          console.log(`[Invalid Thumbnail Header] Game: "${game.name}" (BGG ID: ${game.bggId}) - file: ${game.thumbnailUrl} has magic bytes [${buffer.toString("hex")}], looks like HTML: ${isHtml}`);
          invalidFiles.push({ path: fullPath, gameName: game.name, bggId: game.bggId, type: "thumbnailUrl" });
          invalidCount++;
        }
      }
    }
  }

  console.log(`=== Audit Complete ===`);
  console.log(`Found ${invalidCount} invalid image files.`);
}

main()
  .catch((err) => {
    console.error("Audit failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
