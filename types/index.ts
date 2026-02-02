import { PhaseType, AchievementType } from "@prisma/client"

export interface User {
  id: string
  email: string
  name: string
  isAdmin: boolean
}

export interface Season {
  id: string
  name: string
  startDate: Date
  endDate: Date | null
  isActive: boolean
  startingSalary: number
}

export interface Contestant {
  id: string
  seasonId: string
  name: string
  tribe: string | null
  isActive: boolean
  isWinner: boolean
  eliminatedAt: Date | null
  totalShares: number
}

export interface ContestantWithPrice extends Contestant {
  currentPrice: number
  priceHistory: StockPrice[]
}

export interface StockPrice {
  id: string
  contestantId: string
  weekNumber: number
  price: number
  calculatedAt: Date
}

export interface Portfolio {
  id: string
  userId: string
  seasonId: string
  cashBalance: number
  totalStock: number
  netWorth: number
  movement: number
}

export interface PortfolioStock {
  id: string
  portfolioId: string
  contestantId: string
  shares: number
  averagePrice: number
  contestant?: Contestant
  currentPrice?: number
  value?: number
}

export interface Phase {
  id: string
  seasonId: string
  phaseType: PhaseType
  startDate: Date
  endDate: Date | null
  isManuallyOverridden: boolean
  isOpen: boolean
  weekNumber: number
  name?: string
}

export interface Bid {
  id: string
  userId: string
  phaseId: string
  contestantId: string
  shares: number
  bidPrice: number
  isAwarded: boolean
  createdAt: Date
  user?: User
  contestant?: Contestant
}

export interface Listing {
  id: string
  sellerId: string
  phaseId: string
  contestantId: string
  shares: number
  minimumPrice: number
  isFilled: boolean
  createdAt: Date
  buyerId: string | null
  filledAt: Date | null
  seller?: User
  contestant?: Contestant
}

export interface Rating {
  id: string
  userId: string
  contestantId: string
  weekNumber: number
  rating: number
  createdAt: Date
}

export interface Dividend {
  id: string
  portfolioId: string
  weekNumber: number
  contestantId: string
  contestantName: string
  amount: number
  paidAt: Date
}

export interface Achievement {
  id: string
  contestantId: string
  weekNumber: number
  achievementType: AchievementType
  multiplier: number
  createdAt: Date
  contestant?: Contestant
}

export interface Game {
  id: string
  seasonId: string
  episodeNumber: number
  airDate: Date
  aired: boolean
  dividendProcessed: boolean
  title?: string
}

// Form types
export interface BidFormData {
  contestantId: string
  shares: number
  bidPrice: number
}

export interface ListingFormData {
  contestantId: string
  shares: number
  minimumPrice: number
}

export interface RatingFormData {
  contestantId: string
  rating: number
}

export interface SeasonFormData {
  name: string
  startDate: string
  startingSalary: number
}

export interface ContestantFormData {
  name: string
  tribe: string
}

export interface AchievementFormData {
  contestantId: string
  weekNumber: number
  achievementType: AchievementType
}

// Dashboard types
export interface DashboardStats {
  portfolioValue: number
  cashBalance: number
  stockValue: number
  totalShares: number
  movement: number
  currentPhase: Phase | null
  upcomingPhase: Phase | null
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  netWorth: number
  cashBalance: number
  stockValue: number
  movement: number
}

// Phase display names
export const PHASE_NAMES: Record<PhaseType, string> = {
  INITIAL_OFFERING: "Initial Offering",
  SECOND_OFFERING: "Second Offering",
  FIRST_LISTING: "First Listing",
  SECOND_LISTING: "Second Listing",
  GAME_DAY: "Game Day",
}

// Achievement display names
export const ACHIEVEMENT_NAMES: Record<AchievementType, { name: string; multiplier: number; description: string }> = {
  REWARD: { name: "Reward", multiplier: 0.05, description: "Won a reward challenge" },
  HIDDEN_IDOL: { name: "Hidden Immunity Idol", multiplier: 0.05, description: "Found a hidden immunity idol" },
  TRIBAL_IMMUNITY: { name: "Tribal Immunity", multiplier: 0.10, description: "Tribe won immunity" },
  INDIVIDUAL_IMMUNITY: { name: "Individual Immunity", multiplier: 0.15, description: "Won individual immunity" },
}
