// Test BGG collection sync and check status distribution in DB
const { runSync } = require('./src/lib/sync');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Triggering BGG sync for username 'project17'...");
  const res = await runSync('project17');
  console.log("Sync finished. Result:", res);
  
  // Query status counts
  const statusCounts = await prisma.game.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  });
  
  console.log("\nGame status distribution in DB:");
  for (const row of statusCounts) {
    console.log(`- "${row.status}": ${row._count.status} games`);
  }
  
  // Show a few wishlist games if they exist
  const wishlistGames = await prisma.game.findMany({
    where: { status: 'wishlist' },
    select: { name: true, bggId: true, owned: true, status: true },
    take: 10
  });
  
  console.log("\nSample wishlist games:");
  for (const g of wishlistGames) {
    console.log(`- [ID: ${g.bggId}] "${g.name}" | owned: ${g.owned} | status: ${g.status}`);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
