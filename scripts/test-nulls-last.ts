import { prisma } from "../src/lib/db";

async function main() {
  console.log("Testing nulls last sorting...");
  const games = await prisma.game.findMany({
    orderBy: {
      rank: {
        sort: "asc",
        nulls: "last",
      },
    },
    take: 5,
    select: {
      name: true,
      rank: true,
    },
  });
  console.log("Top games:", games);
}

main()
  .catch((err) => {
    console.error("Test failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
