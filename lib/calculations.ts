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

export function allocateTiedBidShares(
  bids: Array<{ bidId: string; requestedShares: number }>,
  availableShares: number,
  seedKey: string
): Map<string, number> {
  const allocations = new Map<string, number>()
  const eligibleBids = bids.filter((bid) => bid.requestedShares > 0)

  for (const bid of eligibleBids) {
    allocations.set(bid.bidId, 0)
  }

  if (availableShares <= 0 || eligibleBids.length === 0) {
    return allocations
  }

  const totalRequested = eligibleBids.reduce(
    (sum, bid) => sum + bid.requestedShares,
    0
  )

  if (availableShares >= totalRequested) {
    for (const bid of eligibleBids) {
      allocations.set(bid.bidId, bid.requestedShares)
    }
    return allocations
  }

  const equalSplit = Math.floor(availableShares / eligibleBids.length)

  let allocated = 0
  for (const bid of eligibleBids) {
    const shares = Math.min(equalSplit, bid.requestedShares)
    allocations.set(bid.bidId, shares)
    allocated += shares
  }

  let remainder = availableShares - allocated
  if (remainder <= 0) {
    return allocations
  }

  const candidates = eligibleBids.filter((bid) => {
    const alreadyAwarded = allocations.get(bid.bidId) ?? 0
    return alreadyAwarded < bid.requestedShares
  })

  if (candidates.length === 0) {
    return allocations
  }

  const orderedCandidates = shuffleDeterministic(candidates, seedKey)
  let pointer = 0

  while (remainder > 0) {
    let foundCandidate = false

    for (let i = 0; i < orderedCandidates.length; i++) {
      const candidate = orderedCandidates[(pointer + i) % orderedCandidates.length]
      const alreadyAwarded = allocations.get(candidate.bidId) ?? 0

      if (alreadyAwarded < candidate.requestedShares) {
        allocations.set(candidate.bidId, alreadyAwarded + 1)
        pointer = (pointer + i + 1) % orderedCandidates.length
        remainder -= 1
        foundCandidate = true
        break
      }
    }

    if (!foundCandidate) {
      break
    }
  }

  return allocations
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

async function executeListingTransfer({
  listingId,
  buyerUserId,
  sellerUserId,
  contestantId,
  seasonId,
  shares,
  pricePerShare,
}: {
  listingId: string
  buyerUserId: string
  sellerUserId: string
  contestantId: string
  seasonId: string
  shares: number
  pricePerShare: number
}): Promise<boolean> {
  if (shares <= 0) return false

  const totalCost = shares * pricePerShare

  return prisma.$transaction(async (tx) => {
    const [buyerPortfolio, sellerPortfolio] = await Promise.all([
      tx.portfolio.findUnique({
        where: {
          userId_seasonId: {
            userId: buyerUserId,
            seasonId,
          },
        },
      }),
      tx.portfolio.findUnique({
        where: {
          userId_seasonId: {
            userId: sellerUserId,
            seasonId,
          },
        },
      }),
    ])

    if (!buyerPortfolio || !sellerPortfolio) {
      return false
    }

    if (buyerPortfolio.cashBalance < totalCost) {
      return false
    }

    const [listing, sellerStock] = await Promise.all([
      tx.listing.findUnique({
        where: { id: listingId },
      }),
      tx.portfolioStock.findUnique({
        where: {
          portfolioId_contestantId: {
            portfolioId: sellerPortfolio.id,
            contestantId,
          },
        },
      }),
    ])

    if (
      !listing ||
      listing.isFilled ||
      listing.shares < shares ||
      !sellerStock ||
      sellerStock.shares < shares
    ) {
      return false
    }

    await Promise.all([
      tx.portfolio.update({
        where: { id: buyerPortfolio.id },
        data: {
          cashBalance: { decrement: totalCost },
        },
      }),
      tx.portfolio.update({
        where: { id: sellerPortfolio.id },
        data: {
          cashBalance: { increment: totalCost },
        },
      }),
      tx.portfolioStock.update({
        where: { id: sellerStock.id },
        data: {
          shares: { decrement: shares },
        },
      }),
    ])

    const buyerStock = await tx.portfolioStock.findUnique({
      where: {
        portfolioId_contestantId: {
          portfolioId: buyerPortfolio.id,
          contestantId,
        },
      },
    })

    if (buyerStock) {
      const totalShares = buyerStock.shares + shares
      const newAveragePrice =
        (buyerStock.averagePrice * buyerStock.shares + pricePerShare * shares) /
        totalShares

      await tx.portfolioStock.update({
        where: { id: buyerStock.id },
        data: {
          shares: { increment: shares },
          averagePrice: newAveragePrice,
        },
      })
    } else {
      await tx.portfolioStock.create({
        data: {
          portfolioId: buyerPortfolio.id,
          contestantId,
          shares,
          averagePrice: pricePerShare,
        },
      })
    }

    const remainingShares = listing.shares - shares
    await tx.listing.update({
      where: { id: listingId },
      data:
        remainingShares <= 0
          ? {
              shares: 0,
              isFilled: true,
              buyerId: buyerUserId,
              filledAt: new Date(),
            }
          : {
              shares: remainingShares,
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

  // Mark only the target week as processed
  await prisma.game.updateMany({
    where: {
      seasonId,
      episodeNumber: weekNumber,
      aired: true,
      dividendProcessed: false,
    },
    data: { dividendProcessed: true },
  })
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

      const awardedSharesByBid = allocateTiedBidShares(
        eligibleBids.map((item) => ({
          bidId: item.bid.id,
          requestedShares: item.requestedShares,
        })),
        availableShares,
        `${phaseId}:${contestantId}:${price}`
      )

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
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    include: {
      season: { include: { contestants: true } },
    },
  })

  if (!phase) throw new Error("Phase not found")
  if (
    phase.phaseType !== "FIRST_LISTING" &&
    phase.phaseType !== "SECOND_LISTING"
  ) {
    throw new Error("processListings can only run during listing phases")
  }

  const listings = await prisma.listing.findMany({
    where: { phaseId, isFilled: false },
    include: {
      seller: true,
      contestant: true,
    },
    orderBy: [{ minimumPrice: "asc" }, { createdAt: "asc" }],
  })

  const bids = await prisma.bid.findMany({
    where: { phaseId, isAwarded: false },
    include: { user: true },
    orderBy: [{ bidPrice: "desc" }, { createdAt: "asc" }],
  })

  if (listings.length === 0 || bids.length === 0) {
    await prisma.phase.update({
      where: { id: phaseId },
      data: { isOpen: false },
    })
    await updatePortfolioValues(phase.seasonId)
    return
  }

  const listingStateById = new Map(
    listings.map((listing) => [
      listing.id,
      {
        ...listing,
        remainingShares: listing.shares,
      },
    ])
  )

  const listingContestantIds = Array.from(
    new Set(listings.map((listing) => listing.contestantId))
  )

  const sellerIds = Array.from(new Set(listings.map((listing) => listing.sellerId)))
  const bidderIds = Array.from(new Set(bids.map((bid) => bid.userId)))
  const relevantUserIds = Array.from(new Set([...sellerIds, ...bidderIds]))

  const portfolios = await prisma.portfolio.findMany({
    where: {
      seasonId: phase.seasonId,
      userId: { in: relevantUserIds },
    },
    select: {
      id: true,
      userId: true,
      cashBalance: true,
    },
  })

  const portfolioByUser = new Map(
    portfolios.map((portfolio) => [portfolio.userId, portfolio])
  )

  const cashByUser = new Map(
    portfolios.map((portfolio) => [portfolio.userId, portfolio.cashBalance])
  )

  const sellerPortfolioIds = portfolios
    .filter((portfolio) => sellerIds.includes(portfolio.userId))
    .map((portfolio) => portfolio.id)

  const sellerStocks = await prisma.portfolioStock.findMany({
    where: {
      portfolioId: { in: sellerPortfolioIds },
      contestantId: { in: listingContestantIds },
    },
    include: {
      portfolio: {
        select: { userId: true },
      },
    },
  })

  const sellerRemainingByKey = new Map<string, number>()
  for (const stock of sellerStocks) {
    sellerRemainingByKey.set(`${stock.portfolio.userId}:${stock.contestantId}`, stock.shares)
  }

  const listingsByContestant = new Map<string, Array<typeof listings[number] & { remainingShares: number }>>()
  for (const listing of listingStateById.values()) {
    if (!listingsByContestant.has(listing.contestantId)) {
      listingsByContestant.set(listing.contestantId, [])
    }
    listingsByContestant.get(listing.contestantId)!.push(listing)
  }

  const bidsByContestant = new Map<string, typeof bids>()
  for (const bid of bids) {
    if (!bidsByContestant.has(bid.contestantId)) {
      bidsByContestant.set(bid.contestantId, [])
    }
    bidsByContestant.get(bid.contestantId)!.push(bid)
  }

  for (const contestant of phase.season.contestants) {
    const contestantListings = listingsByContestant.get(contestant.id) ?? []
    const contestantBids = bidsByContestant.get(contestant.id) ?? []

    if (contestantListings.length === 0 || contestantBids.length === 0) {
      continue
    }

    const bidsByPrice = new Map<number, typeof contestantBids>()
    for (const bid of contestantBids) {
      if (!bidsByPrice.has(bid.bidPrice)) {
        bidsByPrice.set(bid.bidPrice, [])
      }
      bidsByPrice.get(bid.bidPrice)!.push(bid)
    }

    const prices = Array.from(bidsByPrice.keys()).sort((a, b) => b - a)

    for (const price of prices) {
      const priceBids = bidsByPrice.get(price) ?? []

      const totalListingSharesAtPrice = contestantListings.reduce((sum, listing) => {
        if (listing.minimumPrice > price) return sum
        if (listing.remainingShares <= 0) return sum

        const sellerKey = `${listing.sellerId}:${listing.contestantId}`
        const sellerRemaining = sellerRemainingByKey.get(sellerKey) ?? 0
        if (sellerRemaining <= 0) return sum

        return sum + Math.min(listing.remainingShares, sellerRemaining)
      }, 0)

      if (totalListingSharesAtPrice <= 0) {
        continue
      }

      const candidateBids = priceBids
        .map((bid) => {
          const availableCash = cashByUser.get(bid.userId) ?? 0
          const maxAffordableShares = Math.floor(availableCash / price)

          const sharesAvailableToBidder = contestantListings.reduce((sum, listing) => {
            if (listing.sellerId === bid.userId) return sum
            if (listing.minimumPrice > price) return sum
            if (listing.remainingShares <= 0) return sum

            const sellerKey = `${listing.sellerId}:${listing.contestantId}`
            const sellerRemaining = sellerRemainingByKey.get(sellerKey) ?? 0
            if (sellerRemaining <= 0) return sum

            return sum + Math.min(listing.remainingShares, sellerRemaining)
          }, 0)

          const requestedShares = Math.min(
            bid.shares,
            Math.max(maxAffordableShares, 0),
            sharesAvailableToBidder
          )

          return {
            bid,
            requestedShares,
          }
        })
        .filter((item) => item.requestedShares > 0)

      if (candidateBids.length === 0) {
        continue
      }

      const allocations = allocateTiedBidShares(
        candidateBids.map((item) => ({
          bidId: item.bid.id,
          requestedShares: item.requestedShares,
        })),
        totalListingSharesAtPrice,
        `${phaseId}:${contestant.id}:${price}:listing`
      )

      for (const candidate of candidateBids) {
        let neededShares = allocations.get(candidate.bid.id) ?? 0
        let awardedShares = 0

        if (neededShares <= 0) {
          continue
        }

        for (const listing of contestantListings) {
          if (neededShares <= 0) break
          if (listing.sellerId === candidate.bid.userId) continue
          if (listing.minimumPrice > price) continue
          if (listing.remainingShares <= 0) continue

          const buyerPortfolio = portfolioByUser.get(candidate.bid.userId)
          const sellerPortfolio = portfolioByUser.get(listing.sellerId)
          if (!buyerPortfolio || !sellerPortfolio) continue

          const sellerKey = `${listing.sellerId}:${listing.contestantId}`
          const sellerRemaining = sellerRemainingByKey.get(sellerKey) ?? 0
          if (sellerRemaining <= 0) continue

          const availableCash = cashByUser.get(candidate.bid.userId) ?? 0
          const affordableShares = Math.floor(availableCash / price)
          if (affordableShares <= 0) break

          const transferableShares = Math.min(
            neededShares,
            listing.remainingShares,
            sellerRemaining,
            affordableShares
          )

          if (transferableShares <= 0) continue

          const transferred = await executeListingTransfer({
            listingId: listing.id,
            buyerUserId: candidate.bid.userId,
            sellerUserId: listing.sellerId,
            contestantId: listing.contestantId,
            seasonId: phase.seasonId,
            shares: transferableShares,
            pricePerShare: price,
          })

          if (!transferred) continue

          const transferTotal = transferableShares * price
          listing.remainingShares -= transferableShares
          sellerRemainingByKey.set(sellerKey, sellerRemaining - transferableShares)
          cashByUser.set(candidate.bid.userId, availableCash - transferTotal)
          cashByUser.set(
            listing.sellerId,
            (cashByUser.get(listing.sellerId) ?? 0) + transferTotal
          )

          awardedShares += transferableShares
          neededShares -= transferableShares
        }

        if (awardedShares > 0) {
          await prisma.bid.update({
            where: { id: candidate.bid.id },
            data: {
              isAwarded: true,
              shares: awardedShares,
            },
          })
        }
      }
    }
  }

  await prisma.phase.update({
    where: { id: phaseId },
    data: { isOpen: false },
  })

  await updatePortfolioValues(phase.seasonId)
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
