import { prisma } from "../src/lib/db";
import { runSync } from "../src/lib/sync";

async function main() {
  console.log("Starting best player count integration test...");
  
  // Clear any existing Brass: Birmingham so we get a fresh sync
  await prisma.game.deleteMany({
    where: { bggId: 224517 }
  });
  
  console.log("Running demo fallback sync (seeds mock data)...");
  const syncResult = await runSync("demo_fallback");
  console.log("Sync result:", syncResult);
  
  // Query Brass: Birmingham from the DB
  const game = await prisma.game.findUnique({
    where: { bggId: 224517 }
  });
  
  if (!game) {
    throw new Error("Game 'Brass: Birmingham' was not found in the database after sync.");
  }
  
  console.log("Retrieved game:");
  console.log("- Name:", game.name);
  console.log("- bggId:", game.bggId);
  console.log("- minPlayers:", game.minPlayers);
  console.log("- maxPlayers:", game.maxPlayers);
  console.log("- bestPlayers:", game.bestPlayers);
  
  if (game.bestPlayers === "3") {
    console.log("SUCCESS: bestPlayers is correctly set to '3'!");
  } else {
    throw new Error(`FAILURE: expected bestPlayers to be '3', but got '${game.bestPlayers}'`);
  }
}

main()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
