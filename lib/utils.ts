import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "MMM d, yyyy")
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "MMM d, yyyy h:mm a")
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function calculateSharesPerContestant(
  numPlayers: number,
  numContestants: number,
  startingSalary: number = 100
): number {
  return Math.floor((numPlayers * startingSalary) / (numContestants * 2))
}

export function calculateStockValue(
  shares: number,
  price: number
): number {
  return shares * price
}

export function calculateNetWorth(
  cashBalance: number,
  stockHoldings: { shares: number; price: number }[]
): number {
  const stockValue = stockHoldings.reduce(
    (sum, holding) => sum + holding.shares * holding.price,
    0
  )
  return cashBalance + stockValue
}

export function getPhaseColor(phaseType: string): string {
  const colors: Record<string, string> = {
    INITIAL_OFFERING: "bg-blue-500",
    SECOND_OFFERING: "bg-purple-500",
    FIRST_LISTING: "bg-green-500",
    SECOND_LISTING: "bg-yellow-500",
    GAME_DAY: "bg-red-500",
  }
  return colors[phaseType] || "bg-gray-500"
}

export function getAchievementColor(achievementType: string): string {
  const colors: Record<string, string> = {
    REWARD: "text-yellow-600",
    HIDDEN_IDOL: "text-purple-600",
    TRIBAL_IMMUNITY: "text-blue-600",
    INDIVIDUAL_IMMUNITY: "text-green-600",
  }
  return colors[achievementType] || "text-gray-600"
}

export function isPhaseOpen(phase: { startDate: Date | string; endDate: Date | null; isOpen: boolean }): boolean {
  if (!phase.isOpen) return false
  const now = new Date()
  const start = new Date(phase.startDate)
  if (now < start) return false
  if (phase.endDate) {
    const end = new Date(phase.endDate)
    return now < end
  }
  return true
}

export function getTimeRemaining(endDate: Date | string | null): {
  days: number
  hours: number
  minutes: number
  isPast: boolean
} {
  if (!endDate) {
    return { days: 0, hours: 0, minutes: 0, isPast: false }
  }

  const now = new Date()
  const end = new Date(endDate)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isPast: true }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    isPast: false,
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.substring(0, length) + "..."
}

// Practice mode data generator
export function generatePracticeContestants(count: number = 10) {
  const firstNames = ["Jane", "John", "Sarah", "Mike", "Emily", "Chris", "Amanda", "David", "Rachel", "Tom", "Lisa", "James", "Nicole", "Ryan", "Jessica"]
  const lastNames = ["Doe", "Smith", "Johnson", "Wilson", "Davis", "Brown", "Lee", "Kim", "Green", "Martinez", "Taylor", "Anderson", "Thomas", "Jackson", "White"]
  const tribes = ["Lavi", "Vatu", "Soka", "Yanu", "Tiga"]

  const contestants = []
  const usedNames = new Set<string>()

  for (let i = 0; i < count; i++) {
    let name: string
    do {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      name = `${firstName} ${lastName}`
    } while (usedNames.has(name))

    usedNames.add(name)

    const basePrice = Math.floor(Math.random() * 45) + 5 // $5-$50
    const change = (Math.random() * 20 - 10) // -10% to +10%

    contestants.push({
      id: `practice-${i}`,
      name,
      tribe: tribes[Math.floor(Math.random() * tribes.length)],
      price: basePrice,
      change: Number(change.toFixed(1)),
    })
  }

  return contestants
}

export function generatePracticeStandings(count: number = 5) {
  const standings = []
  let netWorth = 150

  for (let i = 0; i < count; i++) {
    const movement = Number((Math.random() * 15 + 2 - (i * 2)).toFixed(1))
    netWorth -= Math.random() * 15 + 5

    standings.push({
      rank: i + 1,
      name: `Demo Player ${i + 1}`,
      netWorth: Number(netWorth.toFixed(2)),
      movement,
    })
  }

  return standings
}
