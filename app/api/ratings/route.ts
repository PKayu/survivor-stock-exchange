import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const ratingSchema = z.object({
  contestantId: z.string(),
  weekNumber: z.number().min(1),
  rating: z.number().min(1).max(10),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { contestantId, weekNumber, rating } = ratingSchema.parse(body)

    // Check contestant is active
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
    })

    if (!contestant || !contestant.isActive) {
      return NextResponse.json(
        { error: "Cannot rate eliminated contestants" },
        { status: 400 }
      )
    }

    // Upsert rating
    const savedRating = await prisma.rating.upsert({
      where: {
        userId_contestantId_weekNumber: {
          userId: session.user.id,
          contestantId,
          weekNumber,
        },
      },
      update: { rating },
      create: {
        userId: session.user.id,
        contestantId,
        weekNumber,
        rating,
      },
    })

    // Recalculate stock price
    const allRatings = await prisma.rating.findMany({
      where: { contestantId, weekNumber },
      select: { rating: true },
    })

    const values = allRatings.map((r) => r.rating).sort((a, b) => a - b)
    const mid = Math.floor(values.length / 2)
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2

    await prisma.stockPrice.upsert({
      where: {
        contestantId_weekNumber: {
          contestantId,
          weekNumber,
        },
      },
      update: { price: median },
      create: {
        contestantId,
        weekNumber,
        price: median,
      },
    })

    return NextResponse.json({ rating: savedRating, newPrice: median }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Rating submission error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const weekNumber = searchParams.get("weekNumber")

    const ratings = await prisma.rating.findMany({
      where: {
        userId: session.user.id,
        ...(weekNumber ? { weekNumber: parseInt(weekNumber) } : {}),
      },
      include: { contestant: true },
      orderBy: [{ weekNumber: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ ratings })
  } catch (error) {
    console.error("Ratings fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
