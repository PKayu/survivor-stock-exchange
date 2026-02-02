import { prisma } from "@/lib/prisma"
import { calculateMedian } from "@/lib/utils"
import { PhaseType, AchievementType } from "@prisma/client"

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

    let availableShares = contestant.totalShares

    // Sort by bid price (highest first), then by creation time for ties
    contestantBids.sort((a, b) => {
      if (b.bidPrice !== a.bidPrice) {
        return b.bidPrice - a.bidPrice
      }
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    // Award bids in order
    for (const bid of contestantBids) {
      if (availableShares <= 0) break

      const awardedShares = Math.min(bid.shares, availableShares)
      const cost = awardedShares * bid.bidPrice

      // Check if user has enough cash
      const portfolio = await prisma.portfolio.findUnique({
        where: {
          userId_seasonId: {
            userId: bid.userId,
            seasonId: phase.seasonId,
          },
        },
      })

      if (!portfolio || portfolio.cashBalance < cost) {
        continue // Skip this bid - not enough cash
      }

      // Deduct cash and add stock
      await prisma.$transaction(async (tx) => {
        // Update cash
        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: { cashBalance: { decrement: cost } },
        })

        // Update or create portfolio stock
        const existingStock = await tx.portfolioStock.findUnique({
          where: {
            portfolioId_contestantId: {
              portfolioId: portfolio.id,
              contestantId: bid.contestantId,
            },
          },
        })

        if (existingStock) {
          // Update average price
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

        // Mark bid as awarded
        await tx.bid.update({
          where: { id: bid.id },
          data: { isAwarded: true },
        })
      })

      availableShares -= awardedShares
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
