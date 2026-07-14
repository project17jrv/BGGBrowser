import fs from "fs";
import { prisma } from "../src/lib/db";
import { runForceReSyncAll } from "../src/lib/sync";

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
  console.log(`=== Starting Force Re-Sync of All Database Games ===`);
  const startTime = Date.now();

  try {
    const result = await runForceReSyncAll();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`=== Force Re-Sync completed in ${duration}s! ===`);
    console.log(`Status: ${result.success ? "Success" : "Failed"}`);
    console.log(`Games updated: ${result.count}`);
  } catch (error) {
    console.error(`[Fatal Error] Force Re-Sync failed:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
