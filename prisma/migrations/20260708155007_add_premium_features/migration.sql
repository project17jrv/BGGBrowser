-- CreateTable
CREATE TABLE "LinkedWallapopItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "webLink" TEXT NOT NULL,
    "imageUrl" TEXT,
    "location" TEXT,
    "dateAdded" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LinkedWallapopItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlaySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bggId" INTEGER,
    "gameName" TEXT NOT NULL,
    "gameThumbnail" TEXT,
    "playedAt" DATETIME NOT NULL,
    "location" TEXT,
    "durationMinutes" INTEGER,
    "mode" TEXT NOT NULL,
    "result" TEXT,
    "notes" TEXT,
    "rating" REAL,
    "bggPlayId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlaySessionPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playSessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "faction" TEXT,
    "role" TEXT,
    CONSTRAINT "PlaySessionPlayer_playSessionId_fkey" FOREIGN KEY ("playSessionId") REFERENCES "PlaySession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "isExpansion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_collection',
    "purchasePrice" REAL,
    "sellPrice" REAL,
    "soldPrice" REAL,
    "personalRating" REAL,
    "physicalState" TEXT,
    "retentionStatus" TEXT,
    "played" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "spanishName" TEXT,
    "ludonautaCache" TEXT,
    "sleevesCache" TEXT,
    "wallapopCache" TEXT,
    "excludedWallapopIds" TEXT
);
INSERT INTO "new_Game" ("averageRating", "bggId", "complexityWeight", "createdAt", "description", "id", "imageUrl", "isExpansion", "maxPlayTime", "maxPlayers", "minAge", "minPlayTime", "minPlayers", "name", "owned", "rank", "thumbnailUrl", "updatedAt", "usersRated", "yearPublished") SELECT "averageRating", "bggId", "complexityWeight", "createdAt", "description", "id", "imageUrl", "isExpansion", "maxPlayTime", "maxPlayers", "minAge", "minPlayTime", "minPlayers", "name", "owned", "rank", "thumbnailUrl", "updatedAt", "usersRated", "yearPublished" FROM "Game";
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
CREATE INDEX "Game_status_idx" ON "Game"("status");
CREATE INDEX "Game_isExpansion_idx" ON "Game"("isExpansion");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LinkedWallapopItem_gameId_idx" ON "LinkedWallapopItem"("gameId");

-- CreateIndex
CREATE INDEX "PlaySessionPlayer_playSessionId_idx" ON "PlaySessionPlayer"("playSessionId");

-- CreateIndex
CREATE INDEX "PlaySessionPlayer_name_idx" ON "PlaySessionPlayer"("name");
