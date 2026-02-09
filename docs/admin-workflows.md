# Admin Workflows (Official Rules)

This document defines the operational steps for running a season based on the official rules.

Reference rules:
- `docs/reality_tv_rules_full.txt`
- `docs/reality_tv_rules.txt`

## 1) Preseason setup workflow

Use this before opening Initial Offering.

1. Create season
   - Go to `/admin/seasons`
   - Create season name, start date, starting salary
   - Ensure exactly one season is marked active

2. Add contestants
   - Go to `/admin/contestants`
   - Add all contestants with tribe labels
   - Verify no duplicates or missing contestants

3. Enroll players into active season portfolios
   - Ensure each player has a portfolio for the active season
   - Default starting cash should match season starting salary

4. Allocate total shares per contestant
   - Formula: `(number of players * starting salary) / (number of contestants * 2)`
   - Round down to whole shares
   - Persist the same total share count to each contestant for that season

5. Create opening phases
   - Initial Offering
   - Second Offering
   - First Listing
   - Second Listing
   - Game Day
   - Assign week number and start/end windows

6. Readiness check
   - Active season exists
   - Contestants added
   - Players enrolled
   - Shares allocated
   - Phases scheduled

## 2) Weekly operations workflow

Repeat this every episode week.

1. Open/verify current phase
   - Confirm phase windows and `isOpen` status
   - Override manually if needed

2. Offering settlement (Initial/Second Offering)
   - Settle silent auction bids at phase close
   - Rules:
     - Highest bid price wins first
     - Ties split evenly
     - If remainder cannot split evenly, distribute randomly among tied bidders
   - Keep deterministic random seed for auditability

3. Listing settlement (First/Second Listing)
   - Settle listing bids at phase close
   - Apply the same tie rules (split + random remainder)
   - Transfer shares and cash between buyer and seller

4. Game Day
   - Trading closed
   - Mark episode/game aired for the week

5. Ratings and price updates
   - Players submit ratings
   - Stock price is median of ratings per contestant per week

6. Achievements and dividends
   - Log weekly achievements
   - Process dividends for the week
   - Recalculate portfolio values and standings

## 3) End-of-season workflow

1. Mark winner contestant
2. Confirm final share holdings for winner
3. Apply tie-breaker by cash on hand if needed
4. Export/archive season summary
5. Deactivate season when complete

## 4) Operational safeguards

- One active season at a time
- Use idempotent settlement operations where possible
- Never process the same phase/week twice without explicit reset action
- Log admin actions for auditing
- Use deterministic random seeds for tie remainders to make outcomes reproducible

## 5) Known gaps (current app)

- Weekly controls are available on `/admin/dashboard`, but there is no dedicated episode management page yet
- Listing auctions are settled by contestant-level bids (not listing-targeted bids)
- Full transaction ledger is not implemented
- Regression coverage for admin actions is still in progress

Track progress in `docs/implementation-tracker.md`.
