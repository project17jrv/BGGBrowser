import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { prisma } from "../src/lib/db";

const apiKey = process.env.BGG_API_KEY || process.env.BGG_TOKEN || "";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) return false;
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function fetchOriginalUrls(bggId: number): Promise<{ image: string; thumbnail: string } | null> {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`;
  const headers: HeadersInit = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    const xmlText = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(xmlText);
    const item = parsed.items?.item;
    if (!item) return null;

    return {
      image: item.image || "",
      thumbnail: item.thumbnail || "",
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== Starting Image Healing Scan ===");
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

  let healedCount = 0;

  for (const game of games) {
    let needsHeal = false;
    let imageFileToFix = "";
    let thumbnailFileToFix = "";

    // 1. Audit Main Image
    if (game.imageUrl && game.imageUrl.startsWith("/images/")) {
      const fullPath = path.join(publicDir, game.imageUrl);
      if (!fs.existsSync(fullPath)) {
        needsHeal = true;
        imageFileToFix = fullPath;
      } else {
        const stats = fs.statSync(fullPath);
        // If file is extremely small (< 3KB), it's probably corrupt
        if (stats.size < 3000) {
          console.log(`[Suspicious Size] "${game.name}" (${game.imageUrl}) is only ${stats.size} bytes.`);
          needsHeal = true;
          imageFileToFix = fullPath;
        } else {
          // Check magic numbers
          const buffer = Buffer.alloc(4);
          const fd = fs.openSync(fullPath, "r");
          fs.readSync(fd, buffer, 0, 4, 0);
          fs.closeSync(fd);

          const isHtml = buffer[0] === 0x3c; // '<'
          const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
          const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
          const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
          const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46; // RIFF

          if (isHtml || (!isJpeg && !isPng && !isGif && !isWebp)) {
            console.log(`[Corrupt Headers] "${game.name}" (${game.imageUrl}) magic: [${buffer.toString("hex")}]`);
            needsHeal = true;
            imageFileToFix = fullPath;
          }
        }
      }
    }

    // 2. Audit Thumbnail
    if (game.thumbnailUrl && game.thumbnailUrl.startsWith("/images/")) {
      const fullPath = path.join(publicDir, game.thumbnailUrl);
      if (!fs.existsSync(fullPath)) {
        needsHeal = true;
        thumbnailFileToFix = fullPath;
      } else {
        const stats = fs.statSync(fullPath);
        // Thumbnails are smaller, let's use < 1KB as suspicious
        if (stats.size < 1000) {
          console.log(`[Suspicious Size] "${game.name}" Thumbnail (${game.thumbnailUrl}) is only ${stats.size} bytes.`);
          needsHeal = true;
          thumbnailFileToFix = fullPath;
        } else {
          const buffer = Buffer.alloc(4);
          const fd = fs.openSync(fullPath, "r");
          fs.readSync(fd, buffer, 0, 4, 0);
          fs.closeSync(fd);

          const isHtml = buffer[0] === 0x3c;
          const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
          const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
          const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
          const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;

          if (isHtml || (!isJpeg && !isPng && !isGif && !isWebp)) {
            console.log(`[Corrupt Headers] "${game.name}" Thumbnail (${game.thumbnailUrl}) magic: [${buffer.toString("hex")}]`);
            needsHeal = true;
            thumbnailFileToFix = fullPath;
          }
        }
      }
    }

    // 3. Heal if needed
    if (needsHeal) {
      console.log(`[Healing] Fetching fresh image details for "${game.name}" (BGG ID: ${game.bggId})...`);
      const originalUrls = await fetchOriginalUrls(game.bggId);
      
      if (originalUrls) {
        if (imageFileToFix && originalUrls.image) {
          console.log(`  Downloading main image: ${originalUrls.image}`);
          const success = await downloadImage(originalUrls.image, imageFileToFix);
          if (success) console.log(`  Successfully re-downloaded main image.`);
          else console.warn(`  Failed to download main image.`);
        }
        if (thumbnailFileToFix && originalUrls.thumbnail) {
          console.log(`  Downloading thumbnail: ${originalUrls.thumbnail}`);
          const success = await downloadImage(originalUrls.thumbnail, thumbnailFileToFix);
          if (success) console.log(`  Successfully re-downloaded thumbnail.`);
          else console.warn(`  Failed to download thumbnail.`);
        }
        healedCount++;
      } else {
        console.warn(`  Failed to fetch original BGG URLs for ID: ${game.bggId}`);
      }

      await sleep(1000); // polite rate limit
    }
  }

  console.log(`=== Healing Complete ===`);
  console.log(`Healed ${healedCount} games.`);
}

main()
  .catch((err) => {
    console.error("Healer failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
