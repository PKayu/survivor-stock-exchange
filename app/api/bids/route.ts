import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const bidSchema = z.object({
  phaseId: z.string(),
  contestantId: z.string(),
  shares: z.number().int().min(1),
  bidPrice: z.number().min(0.25),
})

function isQuarterIncrement(value: number): boolean {
  return Math.abs(value * 4 - Math.round(value * 4)) < 1e-9
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { phaseId, contestantId, shares, bidPrice } = bidSchema.parse(body)

    // Verify phase exists and is open
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: { season: true },
    })

    if (!phase || !phase.isOpen) {
      return NextResponse.json({ error: "Phase is not open" }, { status: 400 })
    }

    if (phase.phaseType === "GAME_DAY") {
      return NextResponse.json({ error: "Trading is closed on Game Day" }, { status: 400 })
    }

    if (!isQuarterIncrement(bidPrice)) {
      return NextResponse.json(
        { error: "Bid price must be in $0.25 increments" },
        { status: 400 }
      )
    }

    const isOfferingPhase =
      phase.phaseType === "INITIAL_OFFERING" || phase.phaseType === "SECOND_OFFERING"
    const isListingPhase =
      phase.phaseType === "FIRST_LISTING" || phase.phaseType === "SECOND_LISTING"

    if (!isOfferingPhase && !isListingPhase) {
      return NextResponse.json({ error: "Invalid trading phase" }, { status: 400 })
    }

    if (isOfferingPhase && bidPrice < 1) {
      return NextResponse.json(
        { error: "Offering bids must be at least $1.00" },
        { status: 400 }
      )
    }

    // Check if user has a portfolio
    const portfolio = await prisma.portfolio.findUnique({
      where: {
        userId_seasonId: {
          userId: session.user.id,
          seasonId: phase.seasonId,
        },
      },
    })

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 })
    }

    // Check for existing bid
    const existingBid = await prisma.bid.findUnique({
      where: {
        userId_phaseId_contestantId: {
          userId: session.user.id,
          phaseId,
          contestantId,
        },
      },
    })

    if (existingBid) {
      return NextResponse.json({ error: "Bid already exists for this contestant" }, { status: 400 })
    }

    // Verify contestant exists and is active
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
    })

    if (!contestant || contestant.seasonId !== phase.seasonId || !contestant.isActive) {
      return NextResponse.json({ error: "Invalid contestant" }, { status: 400 })
    }

    if (isListingPhase) {
      const availableListings = await prisma.listing.findMany({
        where: {
          phaseId,
          contestantId,
          isFilled: false,
          sellerId: { not: session.user.id },
        },
        select: {
          minimumPrice: true,
        },
      })

      if (availableListings.length === 0) {
        return NextResponse.json(
          { error: "No active listings available for this contestant" },
          { status: 400 }
        )
      }

      const minimumListingPrice = Math.min(
        ...availableListings.map((listing) => listing.minimumPrice)
      )
      if (bidPrice < minimumListingPrice) {
        return NextResponse.json(
          {
            error: `Bid must be at least ${minimumListingPrice.toFixed(2)} for available listings`,
          },
          { status: 400 }
        )
      }
    }

    // Create bid
    const bid = await prisma.bid.create({
      data: {
        userId: session.user.id,
        phaseId,
        contestantId,
        shares,
        bidPrice,
      },
    })

    return NextResponse.json({ bid }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Bid creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const phaseId = searchParams.get("phaseId")

    const bids = await prisma.bid.findMany({
      where: {
        userId: session.user.id,
        ...(phaseId ? { phaseId } : {}),
      },
      include: {
        phase: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ bids })
  } catch (error) {
    console.error("Bids fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
