import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  achievement: {
    findMany: vi.fn(),
  },
  portfolio: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  contestant: {
    findUnique: vi.fn(),
  },
  dividend: {
    create: vi.fn(),
  },
  game: {
    updateMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}))

import { allocateTiedBidShares, processDividends } from "@/lib/calculations"

function sumMapValues(map: Map<string, number>): number {
  return Array.from(map.values()).reduce((sum, value) => sum + value, 0)
}

describe("allocateTiedBidShares", () => {
  it("splits ties deterministically with seeded remainder assignment", () => {
    const bids = [
      { bidId: "a", requestedShares: 10 },
      { bidId: "b", requestedShares: 10 },
      { bidId: "c", requestedShares: 10 },
    ]

    const first = allocateTiedBidShares(bids, 10, "phase-1:contestant-x:9")
    const second = allocateTiedBidShares(bids, 10, "phase-1:contestant-x:9")

    expect(Array.from(first.entries())).toEqual(Array.from(second.entries()))
    expect(sumMapValues(first)).toBe(10)

    for (const requested of bids) {
      expect((first.get(requested.bidId) ?? 0) <= requested.requestedShares).toBe(true)
    }
  })

  it("never awards more than each bidder requested", () => {
    const bids = [
      { bidId: "small", requestedShares: 1 },
      { bidId: "large-1", requestedShares: 10 },
      { bidId: "large-2", requestedShares: 10 },
    ]

    const allocations = allocateTiedBidShares(bids, 2, "seed")

    expect(sumMapValues(allocations)).toBe(2)
    expect(allocations.get("small") ?? 0).toBeLessThanOrEqual(1)
    expect(allocations.get("large-1") ?? 0).toBeLessThanOrEqual(10)
    expect(allocations.get("large-2") ?? 0).toBeLessThanOrEqual(10)
  })

  it("awards full requested shares when supply covers demand", () => {
    const bids = [
      { bidId: "a", requestedShares: 2 },
      { bidId: "b", requestedShares: 3 },
    ]

    const allocations = allocateTiedBidShares(bids, 10, "seed")

    expect(allocations.get("a")).toBe(2)
    expect(allocations.get("b")).toBe(3)
    expect(sumMapValues(allocations)).toBe(5)
  })
})

describe("processDividends", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.achievement.findMany.mockResolvedValue([])
    prismaMock.portfolio.findMany.mockResolvedValue([])
    prismaMock.contestant.findUnique.mockResolvedValue({ name: "Unknown" })
    prismaMock.dividend.create.mockResolvedValue(null)
    prismaMock.portfolio.update.mockResolvedValue(null)
    prismaMock.game.updateMany.mockResolvedValue({ count: 0 })
  })

  it("pays dividends and marks only the selected week as processed", async () => {
    prismaMock.achievement.findMany.mockResolvedValue([
      { contestantId: "c1", multiplier: 0.1 },
      { contestantId: "c1", multiplier: 0.05 },
      { contestantId: "c2", multiplier: 0.05 },
    ])

    prismaMock.portfolio.findMany.mockResolvedValue([
      {
        id: "p1",
        stocks: [
          { contestantId: "c1", shares: 10 },
          { contestantId: "c2", shares: 4 },
        ],
      },
      {
        id: "p2",
        stocks: [{ contestantId: "c2", shares: 2 }],
      },
    ])

    prismaMock.contestant.findUnique.mockImplementation(
      async ({ where }: { where: { id: string } }) => ({
        name: where.id === "c1" ? "Contestant One" : "Contestant Two",
      })
    )

    await processDividends("season-1", 3)

    expect(prismaMock.dividend.create).toHaveBeenCalledTimes(3)
    expect(prismaMock.portfolio.update).toHaveBeenCalledTimes(2)

    const updates = prismaMock.portfolio.update.mock.calls.map(
      (call) => call[0] as { where: { id: string }; data: { cashBalance: { increment: number } } }
    )
    const p1Update = updates.find((update) => update.where.id === "p1")
    const p2Update = updates.find((update) => update.where.id === "p2")

    expect(p1Update).toBeDefined()
    expect(p2Update).toBeDefined()
    expect(p1Update?.data.cashBalance.increment).toBeCloseTo(1.7, 8)
    expect(p2Update?.data.cashBalance.increment).toBeCloseTo(0.1, 8)

    expect(prismaMock.game.updateMany).toHaveBeenCalledWith({
      where: {
        seasonId: "season-1",
        episodeNumber: 3,
        aired: true,
        dividendProcessed: false,
      },
      data: { dividendProcessed: true },
    })
  })

  it("does not create payouts when no achievements exist", async () => {
    prismaMock.portfolio.findMany.mockResolvedValue([
      {
        id: "p1",
        stocks: [{ contestantId: "c1", shares: 10 }],
      },
    ])

    await processDividends("season-1", 8)

    expect(prismaMock.dividend.create).not.toHaveBeenCalled()
    expect(prismaMock.portfolio.update).not.toHaveBeenCalled()
    expect(prismaMock.game.updateMany).toHaveBeenCalledTimes(1)
  })
})
