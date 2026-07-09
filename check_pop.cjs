const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.game.count();
  const populated = await prisma.game.count({
    where: { bestPlayers: { not: null } }
  });
  console.log(`Total games: ${total}`);
  console.log(`Games with bestPlayers populated: ${populated}`);
  
  // Show a few games that don't have bestPlayers populated
  const missing = await prisma.game.findMany({
    where: { bestPlayers: null },
    select: { name: true },
    take: 10
  });
  console.log('\nSample games with missing bestPlayers:');
  for (const g of missing) {
    console.log(`- "${g.name}"`);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
