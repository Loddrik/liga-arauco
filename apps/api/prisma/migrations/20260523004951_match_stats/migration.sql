-- CreateTable
CREATE TABLE "MatchPeriod" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "homePoints" INTEGER NOT NULL,
    "awayPoints" INTEGER NOT NULL,
    "homeTeamFouls" INTEGER NOT NULL DEFAULT 0,
    "awayTeamFouls" INTEGER NOT NULL DEFAULT 0,
    "homeTimeouts" INTEGER NOT NULL DEFAULT 0,
    "awayTimeouts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MatchPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPlayerStat" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "played" BOOLEAN NOT NULL DEFAULT false,
    "points" INTEGER NOT NULL DEFAULT 0,
    "fouls" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MatchPlayerStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchPeriod_matchId_idx" ON "MatchPeriod"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPeriod_matchId_period_key" ON "MatchPeriod"("matchId", "period");

-- CreateIndex
CREATE INDEX "MatchPlayerStat_matchId_teamId_idx" ON "MatchPlayerStat"("matchId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayerStat_matchId_playerId_key" ON "MatchPlayerStat"("matchId", "playerId");

-- AddForeignKey
ALTER TABLE "MatchPeriod" ADD CONSTRAINT "MatchPeriod_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerStat" ADD CONSTRAINT "MatchPlayerStat_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerStat" ADD CONSTRAINT "MatchPlayerStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
