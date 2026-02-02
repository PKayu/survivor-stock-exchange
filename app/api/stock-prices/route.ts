import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const seasonId = searchParams.get("seasonId")
    const contestantId = searchParams.get("contestantId")
    const weekNumber = searchParams.get("weekNumber")

    const where: any = {}
    if (seasonId) {
      const season = await prisma.season.findFirst({
        where: { id: seasonId, isActive: true },
        include: { contestants: true },
      })
      if (season) {
        where.contestantId = { in: season.contestants.map((c) => c.id) }
      }
    }
    if (contestantId) {
      where.contestantId = contestantId
    }
    if (weekNumber) {
      where.weekNumber = parseInt(weekNumber)
    }

    const stockPrices = await prisma.stockPrice.findMany({
      where,
      include: { contestant: true },
      orderBy: [{ weekNumber: "desc" }, { calculatedAt: "desc" }],
    })

    return NextResponse.json({ stockPrices })
  } catch (error) {
    console.error("Stock prices fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
