-- Survivor Stock Exchange Database Schema
-- Run this in Supabase SQL Editor

-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('INITIAL_OFFERING', 'SECOND_OFFERING', 'FIRST_LISTING', 'SECOND_LISTING', 'GAME_DAY');

-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('REWARD', 'HIDDEN_IDOL', 'TRIBAL_IMMUNITY', 'INDIVIDUAL_IMMUNITY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startingSalary" DOUBLE PRECISION NOT NULL DEFAULT 100,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contestant" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tribe" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "eliminatedAt" TIMESTAMP(3),
    "totalShares" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contestant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPrice" (
    "id" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "cashBalance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "netWorth" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "movement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioStock" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "averagePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PortfolioStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "phaseType" "PhaseType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isManuallyOverridden" BOOLEAN NOT NULL DEFAULT false,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "weekNumber" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "shares" INTEGER NOT NULL,
    "bidPrice" DOUBLE PRECISION NOT NULL,
    "isAwarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "shares" INTEGER NOT NULL,
    "minimumPrice" DOUBLE PRECISION NOT NULL,
    "isFilled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyerId" TEXT,
    "filledAt" TIMESTAMP(3),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dividend" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "contestantId" TEXT NOT NULL,
    "contestantName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dividend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "achievementType" "AchievementType" NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "airDate" TIMESTAMP(3) NOT NULL,
    "aired" BOOLEAN NOT NULL DEFAULT false,
    "dividendProcessed" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "StockPrice_contestantId_weekNumber_key" ON "StockPrice"("contestantId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_userId_seasonId_key" ON "Portfolio"("userId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioStock_portfolioId_contestantId_key" ON "PortfolioStock"("portfolioId", "contestantId");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_userId_phaseId_contestantId_key" ON "Bid"("userId", "phaseId", "contestantId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_userId_contestantId_weekNumber_key" ON "Rating"("userId", "contestantId", "weekNumber");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contestant" ADD CONSTRAINT "Contestant_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPrice" ADD CONSTRAINT "StockPrice_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioStock" ADD CONSTRAINT "PortfolioStock_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioStock" ADD CONSTRAINT "PortfolioStock_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dividend" ADD CONSTRAINT "Dividend_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
