import { prisma } from "../src/lib/db";

async function main() {
  console.log("Updating existing games to owned = true...");
  const updateResult = await prisma.game.updateMany({
    data: {
      owned: true,
    },
  });
  console.log(`Successfully updated ${updateResult.count} games to owned = true.`);
}

main()
  .catch((err) => {
    console.error("Failed to update existing games:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
