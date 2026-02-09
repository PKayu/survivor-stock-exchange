-- Reset Survivor Stock Exchange Database
-- Run this in Supabase SQL Editor first, then re-run the schema.sql

-- Drop all tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS "Game" CASCADE;
DROP TABLE IF EXISTS "Achievement" CASCADE;
DROP TABLE IF EXISTS "Dividend" CASCADE;
DROP TABLE IF EXISTS "Rating" CASCADE;
DROP TABLE IF EXISTS "Listing" CASCADE;
DROP TABLE IF EXISTS "Bid" CASCADE;
DROP TABLE IF EXISTS "Phase" CASCADE;
DROP TABLE IF EXISTS "PortfolioStock" CASCADE;
DROP TABLE IF EXISTS "Portfolio" CASCADE;
DROP TABLE IF EXISTS "StockPrice" CASCADE;
DROP TABLE IF EXISTS "Contestant" CASCADE;
DROP TABLE IF EXISTS "Season" CASCADE;
DROP TABLE IF EXISTS "VerificationToken" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "AchievementType" CASCADE;
DROP TYPE IF EXISTS "PhaseType" CASCADE;

-- The schema.sql file can now be run again
