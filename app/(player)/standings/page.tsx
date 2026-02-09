import { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCurrency, formatPercentage, getInitials } from "@/lib/utils"
import { TrendingUp, TrendingDown, Trophy, Medal, Award } from "lucide-react"

async function getStandingsData() {
  // Get active season
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
    return { season: null, standings: [] }
  }

  // Get all portfolios ranked by net worth
  const standings = await prisma.portfolio.findMany({
    where: { seasonId: activeSeason.id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      stocks: {
        include: { contestant: true },
      },
    },
    orderBy: { netWorth: "desc" },
  })

  // Calculate current stock value for each portfolio
  const enrichedStandings = await Promise.all(
    standings.map(async (portfolio) => {
      // Get latest stock prices
      const stockPrices = await prisma.stockPrice.findMany({
        where: {
          contestantId: { in: portfolio.stocks.map((s) => s.contestantId) },
        },
        orderBy: { weekNumber: "desc" },
      })

      const latestPrices = new Map<string, number>()
      for (const price of stockPrices) {
        if (!latestPrices.has(price.contestantId)) {
          latestPrices.set(price.contestantId, price.price)
        }
      }

      const stockValue = portfolio.stocks.reduce((sum, stock) => {
        if (!stock.contestant.isActive) return sum
        const price = latestPrices.get(stock.contestantId) ?? stock.averagePrice
        return sum + stock.shares * price
      }, 0)

      // Find max shares of any contestant
      const maxShares = Math.max(
        0,
        ...portfolio.stocks.map((s) => s.shares)
      )

      // Find which contestant has max shares
      const maxSharesContestant = portfolio.stocks.find((s) => s.shares === maxShares)

      return {
        ...portfolio,
        stockValue,
        cashValue: portfolio.cashBalance,
        maxShares,
        maxSharesContestant: maxSharesContestant?.contestant.name ?? null,
      }
    })
  )

  // Sort again by net worth
  enrichedStandings.sort((a, b) => b.netWorth - a.netWorth)

  return {
    season: activeSeason,
    standings: enrichedStandings.map((s, index) => ({
      ...s,
      rank: index + 1,
    })),
  }
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 text-white">
        <Trophy className="h-4 w-4" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-400 text-white">
        <Medal className="h-4 w-4" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-700 text-white">
        <Award className="h-4 w-4" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-medium text-sm">
      {rank}
    </div>
  )
}

async function StandingsPageContent() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const data = await getStandingsData()

  if (!data.season) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>
              There are no active Survivor seasons at the moment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { standings } = data
  const userRank = standings.findIndex((s) => s.user.id === session.user.id) + 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">
          Season: {data.season.name} • Your Rank: #{userRank > 0 ? userRank : "-"}
        </p>
      </div>

      {/* Your Position Card */}
      {userRank > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <RankBadge rank={userRank} />
                <div>
                  <div className="font-semibold">{session.user.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {standings[userRank - 1]?.stockValue
                      ? `${formatCurrency(standings[userRank - 1].stockValue)} in stocks`
                      : "No stocks"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {formatCurrency(standings[userRank - 1]?.netWorth ?? 0)}
                </div>
                <div className={`text-sm flex items-center gap-1 justify-end ${
                  (standings[userRank - 1]?.movement ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {(standings[userRank - 1]?.movement ?? 0) >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {formatPercentage(standings[userRank - 1]?.movement ?? 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 Standings */}
      <div className="grid gap-4 md:grid-cols-3">
        {standings.slice(0, 3).map((s, i) => (
          <Card
            key={s.id}
            className={i === 0 ? "bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-900" : ""}
          >
            <CardContent className="py-6">
              <div className="flex flex-col items-center text-center">
                <RankBadge rank={s.rank} />
                <Avatar className="h-16 w-16 my-3">
                  <AvatarFallback className="text-lg">
                    {getInitials(s.user.name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{s.user.name}</h3>
                <p className="text-2xl font-bold mt-2">{formatCurrency(s.netWorth)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(s.stockValue)} in stocks
                </p>
                {s.maxSharesContestant && (
                  <Badge variant="outline" className="mt-2">
                    Most shares: {s.maxSharesContestant}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Standings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Standings</CardTitle>
          <CardDescription>All players ranked by net worth</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Net Worth</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">Stocks</TableHead>
                <TableHead className="text-right">Movement</TableHead>
                <TableHead>Top Holding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((s) => (
                <TableRow
                  key={s.id}
                  className={s.user.id === session.user.id ? "bg-primary/5" : ""}
                >
                  <TableCell>
                    <RankBadge rank={s.rank} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(s.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{s.user.name}</div>
                        {s.user.id === session.user.id && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(s.netWorth)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(s.cashValue)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(s.stockValue)}
                  </TableCell>
                  <TableCell className={`text-right ${
                    s.movement >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {formatPercentage(s.movement)}
                  </TableCell>
                  <TableCell>
                    {s.maxSharesContestant ? (
                      <span className="text-sm">
                        {s.maxSharesContestant} ({s.maxShares} shares)
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Game Rules Reminder */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">How to Win</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            The player with the <strong>most shares of the winning contestant</strong> wins the game!
            If there's a tie, the player with the most cash on hand breaks the tie.
            Build your portfolio strategically to maximize your chances of winning.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function StandingsPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Leaderboard</h1>
              <p className="text-muted-foreground">Loading standings...</p>
            </div>
            <Card>
              <CardContent className="py-12">
                <div className="h-8 bg-muted animate-pulse rounded w-48 mx-auto" />
              </CardContent>
            </Card>
          </div>
        }
      >
        <StandingsPageContent />
      </Suspense>
    </div>
  )
}
