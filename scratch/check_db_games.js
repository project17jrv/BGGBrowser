const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const g = await prisma.game.findFirst({
    where: { name: "Gloomhaven: Jaws of the Lion" },
    select: { id: true, name: true, musicPlaylist: true }
  });
  if (g && g.musicPlaylist) {
    const playlist = JSON.parse(g.musicPlaylist);
    console.log("Total songs:", playlist.songs.length);
    console.log("First 15 songs:", playlist.songs.slice(0, 15));
  } else {
    console.log("No game or playlist found.");
  }
  prisma.$disconnect();
}
check();
