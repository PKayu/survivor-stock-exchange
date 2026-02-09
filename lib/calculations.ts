import { prisma } from "@/lib/prisma"
import { calculateMedian } from "@/lib/utils"
import { PhaseType } from "@prisma/client"

function hashStringToSeed(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createSeededRandom(seed: number): () => number {
  let state = seed + 0x6d2b79f5
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1)
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61)
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleDeterministic<T>(items: T[], seedKey: string): T[] {
  const result = [...items]
  const random = createSeededRandom(hashStringToSeed(seedKey))

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }

  return result
}

async function awardBidShares(
  bid: {
    id: string
    userId: string
    contestantId: string
    bidPrice: number
  },
  seasonId: string,
  awardedShares: number
): Promise<boolean> {
  if (awardedShares <= 0) return false

  const cost = awardedShares * bid.bidPrice

  return prisma.$transaction(async (tx) => {
    const portfolio = await tx.portfolio.findUnique({
      where: {
        userId_seasonId: {
          userId: bid.userId,
          seasonId,
        },
      },
    })

    if (!portfolio || portfolio.cashBalance < cost) {
      return false
    }

    await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { cashBalance: { decrement: cost } },
    })

    const existingStock = await tx.portfolioStock.findUnique({
      where: {
        portfolioId_contestantId: {
          portfolioId: portfolio.id,
          contestantId: bid.contestantId,
        },
      },
    })

    if (existingStock) {
      const totalShares = existingStock.shares + awardedShares
      const newAveragePrice =
        (existingStock.averagePrice * existingStock.shares + bid.bidPrice * awardedShares) /
        totalShares

      await tx.portfolioStock.update({
        where: { id: existingStock.id },
        data: {
          shares: { increment: awardedShares },
          averagePrice: newAveragePrice,
        },
      })
    } else {
      await tx.portfolioStock.create({
        data: {
          portfolioId: portfolio.id,
          contestantId: bid.contestantId,
          shares: awardedShares,
          averagePrice: bid.bidPrice,
        },
      })
    }

    await tx.bid.update({
      where: { id: bid.id },
      data: {
        isAwarded: true,
        shares: awardedShares,
      },
    })

    return true
  })
}

/**
 * Calculate stock price as median of all player ratings
 */
export async function calculateStockPrice(
  contestantId: string,
  weekNumber: number
): Promise<number> {
  const ratings = await prisma.rating.findMany({
    where: { contestantId, weekNumber },
    select: { rating: true },
  })

  if (ratings.length === 0) {
    return 5 // Default middle rating if no ratings
  }

  const values = ratings.map((r) => r.rating)
  return calculateMedian(values)
}

/**
 * Save calculated stock price to database
 */
export async function saveStockPrice(
  contestantId: string,
  weekNumber: number,
  price: number
): Promise<void> {
  await prisma.stockPrice.upsert({
    where: {
      contestantId_weekNumber: {
        contestantId,
        weekNumber,
      },
    },
    update: { price },
    create: {
      contestantId,
      weekNumber,
      price,
    },
  })
}

/**
 * Calculate and payout dividends based on achievements
 */
export async function processDividends(
  seasonId: string,
  weekNumber: number
): Promise<void> {
  // Get all achievements for this week
  const achievements = await prisma.achievement.findMany({
    where: { weekNumber },
  })

  // Get all portfolios for the season
  const portfolios = await prisma.portfolio.findMany({
    where: { seasonId },
    include: { stocks: true },
  })

  // Process dividends for each portfolio
  for (const portfolio of portfolios) {
    let totalDividend = 0

    for (const stock of portfolio.stocks) {
      // Get achievements for this contestant
      const contestantAchievements = achievements.filter(
        (a) => a.contestantId === stock.contestantId
      )

      if (contestantAchievements.length === 0) continue

      // Sum multipliers
      const totalMultiplier = contestantAchievements.reduce(
        (sum, a) => sum + a.multiplier,
        0
      )

      // Calculate dividend: shares × sum of multipliers
      const dividend = stock.shares * totalMultiplier
      totalDividend += dividend

      // Record individual dividend entry
      const contestant = await prisma.contestant.findUnique({
        where: { id: stock.contestantId },
        select: { name: true },
      })

      await prisma.dividend.create({
        data: {
          portfolioId: portfolio.id,
          weekNumber,
          contestantId: stock.contestantId,
          contestantName: contestant?.name ?? "Unknown",
          amount: dividend,
        },
      })
    }

    // Update portfolio cash balance if dividends were earned
    if (totalDividend > 0) {
      await prisma.portfolio.update({
        where: { id: portfolio.id },
        data: {
          cashBalance: { increment: totalDividend },
        },
      })
    }
  }

  // Mark game as dividend processed
  const games = await prisma.game.findMany({
    where: { seasonId, dividendProcessed: false },
  })

  for (const game of games) {
    await prisma.game.update({
      where: { id: game.id },
      data: { dividendProcessed: true },
    })
  }
}

/**
 * Update portfolio net worth values
 */
export async function updatePortfolioValues(seasonId: string): Promise<void> {
  const portfolios = await prisma.portfolio.findMany({
    where: { seasonId },
    include: { stocks: { include: { contestant: true } } },
  })

  const currentWeek = await getCurrentWeek(seasonId)

  for (const portfolio of portfolios) {
    const previousNetWorth = portfolio.netWorth

    // Calculate stock value
    let stockValue = 0
    for (const stock of portfolio.stocks) {
      // Get current price (0 if eliminated)
      let price = 0
      if (stock.contestant.isActive) {
        const stockPrice = await prisma.stockPrice.findFirst({
          where: {
            contestantId: stock.contestantId,
            weekNumber: currentWeek,
          },
        })
        price = stockPrice?.price ?? 5 // Default to 5 if no price set
      }

      stockValue += stock.shares * price
    }

    const netWorth = portfolio.cashBalance + stockValue
    const movement = previousNetWorth > 0 ? ((netWorth - previousNetWorth) / previousNetWorth) * 100 : 0

    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        totalStock: Math.round(stockValue),
        netWorth: Math.round(netWorth * 100) / 100,
        movement: Math.round(movement * 100) / 100,
      },
    })
  }
}

/**
 * Settle bids for a phase (silent auction)
 */
export async function settleBids(phaseId: string): Promise<void> {
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    include: {
      season: { include: { contestants: true } },
    },
  })

  if (!phase) throw new Error("Phase not found")

  // Get all bids for this phase, grouped by contestant
  const bids = await prisma.bid.findMany({
    where: { phaseId, isAwarded: false },
    include: { user: true },
    orderBy: { bidPrice: "desc" },
  })

  // Seed current available cash for users in this phase
  const userIds = Array.from(new Set(bids.map((b) => b.userId)))
  const userPortfolios = await prisma.portfolio.findMany({
    where: {
      seasonId: phase.seasonId,
      userId: { in: userIds },
    },
    select: {
      userId: true,
      cashBalance: true,
    },
  })
  const cashByUser = new Map(userPortfolios.map((p) => [p.userId, p.cashBalance]))

  // Group by contestant
  const bidsByContestant = new Map<string, typeof bids>()
  for (const bid of bids) {
    if (!bidsByContestant.has(bid.contestantId)) {
      bidsByContestant.set(bid.contestantId, [])
    }
    bidsByContestant.get(bid.contestantId)!.push(bid)
  }

  // Process each contestant's bids
  for (const [contestantId, contestantBids] of bidsByContestant.entries()) {
    const contestant = phase.season.contestants.find((c) => c.id === contestantId)
    if (!contestant) continue

    // Shares available are total shares minus already-held shares from prior settlements
    const heldShares = await prisma.portfolioStock.aggregate({
      where: {
        contestantId,
        portfolio: { seasonId: phase.seasonId },
      },
      _sum: { shares: true },
    })

    let availableShares = Math.max(contestant.totalShares - (heldShares._sum.shares ?? 0), 0)
    if (availableShares <= 0) continue

    // Group bids by price and process highest price first
    const bidsByPrice = new Map<number, typeof contestantBids>()
    for (const bid of contestantBids) {
      if (!bidsByPrice.has(bid.bidPrice)) {
        bidsByPrice.set(bid.bidPrice, [])
      }
      bidsByPrice.get(bid.bidPrice)!.push(bid)
    }

    const prices = Array.from(bidsByPrice.keys()).sort((a, b) => b - a)

    for (const price of prices) {
      if (availableShares <= 0) break

      const priceBids = bidsByPrice.get(price) ?? []

      const eligibleBids = priceBids
        .map((bid) => {
          const availableCash = cashByUser.get(bid.userId) ?? 0
          const maxAffordableShares = Math.floor(availableCash / price)
          const requestedShares = Math.min(bid.shares, Math.max(maxAffordableShares, 0))

          return {
            bid,
            requestedShares,
          }
        })
        .filter((item) => item.requestedShares > 0)

      if (eligibleBids.length === 0) continue

      const totalRequested = eligibleBids.reduce((sum, item) => sum + item.requestedShares, 0)
      const awardedSharesByBid = new Map<string, number>()

      if (availableShares >= totalRequested) {
        for (const item of eligibleBids) {
          awardedSharesByBid.set(item.bid.id, item.requestedShares)
        }
      } else {
        // Official tie rule: split evenly, then randomly assign remainder.
        const equalSplit = Math.floor(availableShares / eligibleBids.length)

        let allocated = 0
        for (const item of eligibleBids) {
          const shares = Math.min(equalSplit, item.requestedShares)
          awardedSharesByBid.set(item.bid.id, shares)
          allocated += shares
        }

        let remainder = availableShares - allocated

        if (remainder > 0) {
          const candidates = eligibleBids.filter((item) => {
            const alreadyAwarded = awardedSharesByBid.get(item.bid.id) ?? 0
            return alreadyAwarded < item.requestedShares
          })

          if (candidates.length > 0) {
            const orderedCandidates = shuffleDeterministic(
              candidates,
              `${phaseId}:${contestantId}:${price}`
            )

            let pointer = 0
            while (remainder > 0) {
              let foundCandidate = false

              for (let i = 0; i < orderedCandidates.length; i++) {
                const candidate = orderedCandidates[(pointer + i) % orderedCandidates.length]
                const alreadyAwarded = awardedSharesByBid.get(candidate.bid.id) ?? 0

                if (alreadyAwarded < candidate.requestedShares) {
                  awardedSharesByBid.set(candidate.bid.id, alreadyAwarded + 1)
                  pointer = (pointer + i + 1) % orderedCandidates.length
                  remainder -= 1
                  foundCandidate = true
                  break
                }
              }

              if (!foundCandidate) break
            }
          }
        }
      }

      // Persist awards and keep in-memory cash tracking in sync
      for (const item of eligibleBids) {
        if (availableShares <= 0) break

        const sharesToAward = Math.min(awardedSharesByBid.get(item.bid.id) ?? 0, availableShares)
        if (sharesToAward <= 0) continue

        const awarded = await awardBidShares(item.bid, phase.seasonId, sharesToAward)
        if (!awarded) continue

        availableShares -= sharesToAward

        const priorCash = cashByUser.get(item.bid.userId) ?? 0
        cashByUser.set(item.bid.userId, priorCash - sharesToAward * price)
      }
    }
  }

  // Close phase
  await prisma.phase.update({
    where: { id: phaseId },
    data: { isOpen: false },
  })

  // Update portfolio values
  await updatePortfolioValues(phase.seasonId)
}

/**
 * Calculate total shares per contestant
 */
export async function calculateTotalShares(
  seasonId: string
): Promise<Map<string, number>> {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { contestants: true, portfolios: true },
  })

  if (!season) throw new Error("Season not found")

  const numPlayers = season.portfolios.length
  const numContestants = season.contestants.length
  const sharesPerContestant = Math.floor(
    (numPlayers * season.startingSalary) / (numContestants * 2)
  )

  const sharesMap = new Map<string, number>()
  for (const contestant of season.contestants) {
    sharesMap.set(contestant.id, sharesPerContestant)
    // Update in database
    await prisma.contestant.update({
      where: { id: contestant.id },
      data: { totalShares: sharesPerContestant },
    })
  }

  return sharesMap
}

/**
 * Get current week number for a season
 */
async function getCurrentWeek(seasonId: string): Promise<number> {
  const latestGame = await prisma.game.findFirst({
    where: { seasonId, aired: true },
    orderBy: { episodeNumber: "desc" },
  })

  return latestGame?.episodeNumber ?? 1
}

/**
 * Process stock listings (player-to-player trading)
 */
export async function processListings(phaseId: string): Promise<void> {
  const listings = await prisma.listing.findMany({
    where: { phaseId, isFilled: false },
    include: {
      seller: true,
      contestant: true,
    },
  })

  for (const listing of listings) {
    // Find matching bids (buyers willing to pay at least the minimum price)
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
    })

    if (!phase) continue

    // For simplicity, this is a first-come-first-serve matching
    // In a real implementation, you'd want more sophisticated matching

    // Apply selling penalty: seller gets 50% of stock value
    const sellerPortfolio = await prisma.portfolio.findUnique({
      where: {
        userId_seasonId: {
          userId: listing.sellerId,
          seasonId: phase.seasonId,
        },
      },
    })

    if (!sellerPortfolio) continue

    // Check seller has enough shares
    const sellerStock = await prisma.portfolioStock.findUnique({
      where: {
        portfolioId_contestantId: {
          portfolioId: sellerPortfolio.id,
          contestantId: listing.contestantId,
        },
      },
    })

    if (!sellerStock || sellerStock.shares < listing.shares) {
      continue // Seller doesn't have enough shares
    }

    // For this implementation, we'll mark listings as fillable
    // but require manual admin approval for actual transfers
    // This allows for review of fair trades
  }
}

/**
 * Get current active phase for a season
 */
export async function getCurrentPhase(seasonId: string): Promise<PhaseType | null> {
  const now = new Date()
  const currentPhase = await prisma.phase.findFirst({
    where: {
      seasonId,
      startDate: { lte: now },
      OR: [
        { endDate: { gte: now } },
        { endDate: null },
      ],
      isOpen: true,
    },
    orderBy: { startDate: "desc" },
  })

  return currentPhase?.phaseType ?? null
}
