# Survivor Stock Exchange Implementation Tracker

This tracker is the single source of truth for what is already implemented versus what still needs to be completed to match the official rules in `docs/reality_tv_rules_full.txt`.

## Status legend
- `[x]` implemented
- `[~]` partial / needs rule-compliance updates
- `[ ]` not implemented

## A) Platform foundation
- [x] Next.js app router structure with player/admin areas
- [x] Prisma schema for users, seasons, contestants, phases, bids, listings, ratings, dividends
- [x] Google auth wired via NextAuth
- [x] Admin route gating in middleware and page-level guards
- [x] Themed UI and responsive layout shell

## B) Season setup (admin-first)
- [x] Create and activate/deactivate seasons (`/admin/seasons`)
- [x] Add and manage contestants (`/admin/contestants`)
- [x] Player season enrollment workflow
- [x] Contestant share allocation integrated into admin setup workflow
- [x] Season readiness checklist and setup runbook controls on admin dashboard

## C) Trading phases and auction engine
- [x] Phase records and manual open/close controls (`/admin/phases`)
- [x] Initial and second offering phase types represented in schema/UI
- [x] Offering settlement with official-rule tie split + deterministic remainder assignment
- [x] Remaining-share accounting between first and second offering
- [x] Listing records can be created by players
- [~] Listing-phase silent auction settlement for player listings (implemented with contestant-level bids)
- [~] Listing buy flow (buy action now uses listing-phase bid workflow)
- [x] Listing transfer accounting (seller shares down, buyer shares up, cash movement, listing fill status)

## D) Pricing, ratings, and elimination
- [x] Weekly ratings submission by players
- [x] Median stock price calculation and persistence
- [x] Eliminated contestants blocked from new ratings
- [~] Elimination effects should be validated across all trade/settlement paths

## E) Dividends and achievements
- [x] Admin achievement logging
- [x] Dividend processing by selected week
- [x] Portfolio value recalculation helper
- [~] Idempotency protections (prevent accidental double processing) need hardening

## F) Portfolio, standings, and player UX
- [x] Portfolio summary and holdings views
- [x] Standings leaderboard views
- [~] Transaction history is bid-centric and not a full trade ledger
- [ ] Full auditable transaction ledger model for buys/sells/dividends/admin adjustments

## G) Admin operations
- [x] Admin dashboard exists with high-level stats
- [x] Dashboard has direct preseason controls and weekly runbook actions
- [~] Admin game/episode controls (week aired controls on dashboard; dedicated page not implemented)
- [x] One-click weekly operations flow from dashboard

## H) Rules compliance gaps to close
- [x] Tie bids split evenly among tied bidders with remainder handling
- [x] Random remainder assignment is deterministic/auditable
- [x] Second offering only uses shares not already awarded in initial offering
- [~] Listing phases use silent auction settlement (bids currently contestant-level rather than listing-targeted)

## I) Documentation and tests
- [~] README partially outdated (legacy references remain)
- [x] Lightweight testing process doc exists
- [~] Core rules test suite started (utilities, tie allocation, dividends)
- [ ] Regression tests for admin critical actions

## Immediate execution order
1. Admin dashboard readiness controls (season setup operations)
2. Official offering settlement tie logic + deterministic randomness
3. Listing-phase auction engine and settlement
4. Admin weekly runbook controls (episode/week operations)
5. Tests for settlement and dividend correctness
6. Docs sync pass (README + workflow docs)
