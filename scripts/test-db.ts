import { prisma } from "../src/lib/db";

async function main() {
  const gamesCount = await prisma.game.count();
  console.log("Database connection successful. Current games count:", gamesCount);
}

main()
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
