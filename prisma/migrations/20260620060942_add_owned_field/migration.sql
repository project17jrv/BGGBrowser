-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bggId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "yearPublished" INTEGER,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "description" TEXT,
    "rank" INTEGER,
    "averageRating" REAL,
    "usersRated" INTEGER,
    "complexityWeight" REAL,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "minPlayTime" INTEGER,
    "maxPlayTime" INTEGER,
    "minAge" INTEGER,
    "owned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Game" ("averageRating", "bggId", "complexityWeight", "createdAt", "description", "id", "imageUrl", "maxPlayTime", "maxPlayers", "minAge", "minPlayTime", "minPlayers", "name", "rank", "thumbnailUrl", "updatedAt", "usersRated", "yearPublished") SELECT "averageRating", "bggId", "complexityWeight", "createdAt", "description", "id", "imageUrl", "maxPlayTime", "maxPlayers", "minAge", "minPlayTime", "minPlayers", "name", "rank", "thumbnailUrl", "updatedAt", "usersRated", "yearPublished" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_bggId_key" ON "Game"("bggId");
CREATE INDEX "Game_name_idx" ON "Game"("name");
CREATE INDEX "Game_rank_idx" ON "Game"("rank");
CREATE INDEX "Game_averageRating_idx" ON "Game"("averageRating");
CREATE INDEX "Game_yearPublished_idx" ON "Game"("yearPublished");
CREATE INDEX "Game_complexityWeight_idx" ON "Game"("complexityWeight");
CREATE INDEX "Game_minPlayers_idx" ON "Game"("minPlayers");
CREATE INDEX "Game_maxPlayers_idx" ON "Game"("maxPlayers");
CREATE INDEX "Game_owned_idx" ON "Game"("owned");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
