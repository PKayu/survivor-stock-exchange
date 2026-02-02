# Survivor Stock Exchange - Web App Project Plan

## Overview
A web-based game where players buy and trade stocks of Survivor contestants. The player with the most stock of the winning contestant wins.

**Tech Stack:** Next.js 15 + PostgreSQL + NextAuth.js + Tailwind CSS + shadcn/ui

---

## Phase 1: Project Setup & Database Schema

### 1.1 Initialize Next.js Project
```bash
npx create-next-app@latest survivor-stock-exchange --typescript --tailwind --app
npm install @prisma/client next-auth @auth/prisma-adapter bcryptjs
npm install -D prisma
```

### 1.2 Database Schema (Prisma)

```prisma
// Users & Authentication
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  isAdmin       Boolean   @default(false)
  createdAt     DateTime  @default(now())
  portfolios    Portfolio[]
  ratings       Rating[]
  bids          Bid[]
  listings      Listing[]
}

// Game Configuration
model Season {
  id              String    @id @default(cuid())
  name            String    // e.g., "Survivor 47"
  startDate       DateTime
  endDate         DateTime?
  isActive        Boolean   @default(true)
  startingSalary  Float     @default(100)
  contestants     Contestant[]
  games           Game[]
  phases          Phase[]
}

model Contestant {
  id              String    @id @default(cuid())
  seasonId        String
  season          Season    @relation(fields: [seasonId], references: [id])
  name            String
  tribe           String?
  isActive        Boolean   @default(true)
  isWinner        Boolean   @default(false)
  eliminatedAt    DateTime?
  totalShares     Int       // Calculated: (Players × Salary) / (Contestants × 2)
  stockPrices     StockPrice[]
  portfolios      PortfolioStock[]
  ratings         Rating[]
  achievements    Achievement[]
  listings        Listing[]
}

model StockPrice {
  id              String    @id @default(cuid())
  contestantId    String
  contestant      Contestant @relation(fields: [contestantId], references: [id])
  weekNumber      Int
  price           Float     // Median of ratings
  calculatedAt    DateTime  @default(now())
  @@unique([contestantId, weekNumber])
}

// Player Portfolios
model Portfolio {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  seasonId        String
  season          Season    @relation(fields: [seasonId], references: [id])
  cashBalance     Float     @default(100)
  totalStock      Int       @default(0)
  netWorth        Float     @default(100)
  movement        Float     @default(0)
  stocks          PortfolioStock[]
  dividends       Dividend[]
  @@unique([userId, seasonId])
}

model PortfolioStock {
  id              String    @id @default(cuid())
  portfolioId     String
  portfolio       Portfolio @relation(fields: [portfolioId], references: [id])
  contestantId    String
  contestant      Contestant @relation(fields: [contestantId], references: [id])
  shares          Int       @default(0)
  @@unique([portfolioId, contestantId])
}

// Game Phases & Trading
model Phase {
  id              String    @id @default(cuid())
  seasonId        String
  season          Season    @relation(fields: [seasonId], references: [id])
  phaseType       PhaseType // INITIAL_OFFERING, SECOND_OFFERING, FIRST_LISTING, SECOND_LISTING, GAME_DAY
  startDate       DateTime
  endDate         DateTime?
  isManuallyOverridden Boolean @default(false)
  isOpen          Boolean   @default(true)
  bids            Bid[]
  listings        Listing[]
}

enum PhaseType {
  INITIAL_OFFERING
  SECOND_OFFERING
  FIRST_LISTING
  SECOND_LISTING
  GAME_DAY
}

// Silent Auction Bids
model Bid {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  phaseId         String
  phase           Phase     @relation(fields: [phaseId], references: [id])
  contestantId    String
  shares          Int
  bidPrice        Float
  isAwarded       Boolean   @default(false)
  createdAt       DateTime  @default(now())
}

// Player Listings (Selling Stock)
model Listing {
  id              String    @id @default(cuid())
  sellerId        String
  seller          User      @relation(fields: [sellerId], references: [id])
  phaseId         String
  phase           Phase     @relation(fields: [phaseId], references: [id])
  contestantId    String
  contestant      Contestant @relation(fields: [contestantId], references: [id])
  shares          Int
  minimumPrice    Float
  isFilled        Boolean   @default(false)
  createdAt       DateTime  @default(now())
}

// Ratings (for stock price calculation)
model Rating {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  contestantId    String
  contestant      Contestant @relation(fields: [contestantId], references: [id])
  weekNumber      Int
  rating          Int       // 1-10
  @@unique([userId, contestantId, weekNumber])
}

// Dividends (weekly payouts)
model Dividend {
  id              String    @id @default(cuid())
  portfolioId     String
  portfolio       Portfolio @relation(fields: [portfolioId], references: [id])
  weekNumber      Int
  contestantId    String
  amount          Float
  paidAt          DateTime  @default(now())
}

// Contestant Achievements (for dividend calculation)
model Achievement {
  id              String    @id @default(cuid())
  contestantId    String
  contestant      Contestant @relation(fields: [contestantId], references: [id])
  weekNumber      Int
  achievementType AchievementType
  multiplier      Float     @default(0.05)
}

enum AchievementType {
  REWARD           // 0.05
  HIDDEN_IDOL      // 0.05
  TRIBAL_IMMUNITY  // 0.10
  INDIVIDUAL_IMMUNITY // 0.15
}

// Episode/Game tracking
model Game {
  id              String    @id @default(cuid())
  seasonId        String
  season          Season    @relation(fields: [seasonId], references: [id])
  episodeNumber   Int
  airDate         DateTime
  aired           Boolean   @default(false)
  dividendProcessed Boolean @default(false)
  achievements    Achievement[]
}
```

---

## Phase 2: Core Backend Logic

### 2.1 Stock Price Calculation Service
```typescript
// Calculate stock price as median of all player ratings
async function calculateStockPrice(contestantId: string, weekNumber: number): Promise<number> {
  const ratings = await prisma.rating.findMany({
    where: { contestantId, weekNumber }
  });
  const values = ratings.map(r => r.rating).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[mid] : (values[mid-1] + values[mid]) / 2;
  return median;
}
```

### 2.2 Bid Settlement Service (Silent Auction)
```typescript
// Award stocks to highest bidders, split evenly on ties
async function settleBids(phaseId: string): Promise<void> {
  // Group bids by contestant
  // Sort by bid price (highest first)
  // Award stocks in order
  // Handle ties: split evenly, randomly assign remainder
}
```

### 2.3 Dividend Calculation Service
```typescript
// Calculate and payout dividends based on achievements
async function processDividends(seasonId: string, weekNumber: number): Promise<void> {
  // Get all achievements for the week
  // For each player owning stock of contestant with achievements:
  //   dividend = shares × sum(achievement multipliers)
  // Credit to player's cash balance
}
```

### 2.4 Portfolio Value Tracking
```typescript
// Update net worth after each phase
async function updatePortfolioValues(seasonId: string): Promise<void> {
  // For each portfolio:
  //   totalStockValue = sum(shares × currentStockPrice)
  //   netWorth = cashBalance + totalStockValue
}
```

---

## Phase 3: Frontend Pages

### 3.1 Public Pages
- `/` - Landing page with game overview
- `/login` - Login page
- `/register` - Registration page (with invite code if needed)

### 3.2 Player Pages (Authenticated)
- `/dashboard` - Main dashboard showing:
  - Current portfolio value
  - Cash balance
  - Stock holdings table
  - Recent activity
  - Current phase indicator

- `/trade` - Trading interface:
  - View current listings
  - Place bids on stocks
  - List stocks for sale
  - Shows current phase and time remaining

- `/ratings` - Submit weekly contestant ratings (1-10)
  - One rating per contestant per week
  - Cannot rate eliminated contestants

- `/portfolio` - Detailed portfolio view:
  - Stock holdings
  - Transaction history
  - Dividend history
  - Performance chart

- `/standings` - Leaderboard showing all players ranked by net worth

- `/contestants` - View all contestants with:
  - Current stock price
  - Tribe affiliation
  - Status (active/eliminated)

### 3.3 Admin Pages (Admin Only)
- `/admin/dashboard` - Admin overview
- `/admin/seasons` - Create/manage seasons
- `/admin/contestants` - Add/edit contestants, set tribes
- `/admin/players` - Manage players, adjust balances
- `/admin/phases` - View/override phase schedules
- `/admin/achievements` - Log contestant achievements for dividends
- `/admin/bids` - View and settle bids
- `/admin/dividends` - Process dividend payouts
- `/admin/settings` - Configure game settings

---

## Phase 4: Implementation Order

### Step 1: Foundation (Week 1)
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Prisma with PostgreSQL
- [ ] Configure NextAuth.js with email/password
- [ ] Set up shadcn/ui components
- [ ] Create base layout and navigation

### Step 2: Database & Auth (Week 1)
- [ ] Run migrations for database schema
- [ ] Implement registration and login
- [ ] Create admin user seed script
- [ ] Add admin-only route protection

### Step 3: Season Management (Week 2)
- [ ] Admin pages for creating seasons
- [ ] Admin pages for adding contestants
- [ ] Automatic stock allocation calculation
- [ ] Player invitation/registration

### Step 4: Trading System (Week 2-3)
- [ ] Phase management system
- [ ] Scheduled phase transitions with admin override
- [ ] Silent auction bid system
- [ ] Stock listing system
- [ ] Bid settlement algorithm
- [ ] Transaction history tracking

### Step 5: Ratings & Stock Prices (Week 3)
- [ ] Player rating submission page
- [ ] Median price calculation service
- [ ] Weekly price updates
- [ ] Price history tracking

### Step 6: Dividends & Achievements (Week 3-4)
- [ ] Admin achievement logging
- [ ] Dividend calculation service
- [ ] Automatic dividend payouts
- [ ] Dividend history display

### Step 7: Portfolio & Standings (Week 4)
- [ ] Portfolio value calculations
- [ ] Leaderboard/standings page
- [ ] Performance charts
- [ ] Movement tracking

### Step 8: Polish & Testing (Week 4)
- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] End-to-end testing

---

## File Structure

```
survivor-stock-exchange/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (player)/
│   │   ├── dashboard/page.tsx
│   │   ├── trade/page.tsx
│   │   ├── ratings/page.tsx
│   │   ├── portfolio/page.tsx
│   │   ├── standings/page.tsx
│   │   └── contestants/page.tsx
│   ├── (admin)/
│   │   ├── dashboard/page.tsx
│   │   ├── seasons/page.tsx
│   │   ├── contestants/page.tsx
│   │   ├── players/page.tsx
│   │   ├── phases/page.tsx
│   │   ├── achievements/page.tsx
│   │   └── dividends/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── bids/route.ts
│   │   ├── listings/route.ts
│   │   ├── ratings/route.ts
│   │   └── dividends/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn components)
│   ├── dashboard/
│   ├── trading/
│   └── admin/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── calculations.ts (stock price, dividends)
│   └── phase-manager.ts
├── prisma/
│   └── schema.prisma
└── types/
    └── index.ts
```

---

## Key Business Rules Summary

1. **Stock Allocation:** `(Players × $100) / (Contestants × 2)` shares per contestant
2. **Starting Balance:** $100 per player
3. **Stock Price:** Median of all player ratings (1-10 scale)
4. **Selling Penalty:** Players get 50% of stock value when selling
5. **Max Cash at Close:** Players cannot have more than $20 when exchange closes
6. **Dividends:** Paid day after episode
   - Reward: $0.05/share
   - Hidden Idol: $0.05/share
   - Tribal Immunity: $0.10/share
   - Individual Immunity: $0.15/share
7. **Eliminated Contestants:** Stock becomes worthless (value = $0)
8. **Winner:** Player with most shares of the winning contestant (tie-breaker: most cash on hand)

---

## Verification & Testing

1. **Create test season** with 4 contestants and 4 players
2. **Verify stock allocation:** (4 × 100) / (4 × 2) = 50 shares each
3. **Test initial offering** with silent auction bids
4. **Verify bid settlement** with tied bids
5. **Test rating submission** and verify median calculation
6. **Test dividend calculation** after logging achievements
7. **Verify portfolio updates** after each phase
8. **Test admin phase override**
9. **Verify standings leaderboard accuracy**
10. **Test elimination** handling (stocks go to $0)
