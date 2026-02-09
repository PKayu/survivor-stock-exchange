import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const listingSchema = z.object({
  phaseId: z.string(),
  contestantId: z.string(),
  shares: z.number().int().min(1),
  minimumPrice: z.number().min(0.25),
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
    const { phaseId, contestantId, shares, minimumPrice } = listingSchema.parse(body)

    // Verify phase exists and is open
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: { season: true },
    })

    if (!phase || !phase.isOpen) {
      return NextResponse.json({ error: "Phase is not open" }, { status: 400 })
    }

    if (
      phase.phaseType !== "FIRST_LISTING" &&
      phase.phaseType !== "SECOND_LISTING"
    ) {
      return NextResponse.json(
        { error: "Listings can only be created during listing phases" },
        { status: 400 }
      )
    }

    if (!isQuarterIncrement(minimumPrice)) {
      return NextResponse.json(
        { error: "Minimum price must be in $0.25 increments" },
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

    // Verify contestant
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
    })

    if (!contestant || contestant.seasonId !== phase.seasonId || !contestant.isActive) {
      return NextResponse.json({ error: "Invalid contestant" }, { status: 400 })
    }

    const existingListing = await prisma.listing.findFirst({
      where: {
        sellerId: session.user.id,
        phaseId,
        contestantId,
        isFilled: false,
      },
    })

    if (existingListing) {
      return NextResponse.json(
        { error: "You already have an active listing for this contestant in this phase" },
        { status: 400 }
      )
    }

    // Check user has enough shares
    const portfolioStock = await prisma.portfolioStock.findUnique({
      where: {
        portfolioId_contestantId: {
          portfolioId: portfolio.id,
          contestantId,
        },
      },
    })

    if (!portfolioStock || portfolioStock.shares < shares) {
      return NextResponse.json({ error: "Not enough shares" }, { status: 400 })
    }

    // Create listing
    const listing = await prisma.listing.create({
      data: {
        sellerId: session.user.id,
        phaseId,
        contestantId,
        shares,
        minimumPrice,
      },
    })

    return NextResponse.json({ listing }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Listing creation error:", error)
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

    const listings = await prisma.listing.findMany({
      where: {
        isFilled: false,
        ...(phaseId ? { phaseId } : {}),
      },
      include: {
        seller: true,
        contestant: true,
        phase: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ listings })
  } catch (error) {
    console.error("Listings fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
