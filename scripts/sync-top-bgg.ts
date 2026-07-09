import fs from "fs";
import { prisma } from "../src/lib/db";
import { runSyncTopBgg } from "../src/lib/sync";

// Load .env file manually
if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=");
      process.env[key.trim()] = value.trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

async function run() {
  console.log(`=== BGG Top Rankings Synchronizer ===`);
  const startTime = Date.now();

  try {
    const result = await runSyncTopBgg(250);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`=== Sync completed in ${duration}s! ===`);
    console.log(`Status: ${result.success ? "Success" : "Failed"}`);
    console.log(`Games synced: ${result.count}`);
  } catch (error) {
    console.error(`[Fatal Error] CLI ranking synchronization failed:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
