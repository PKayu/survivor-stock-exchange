import { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { Search, TrendingUp, TrendingDown, Star } from "lucide-react"

async function getContestantsData() {
  // Get active season
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      contestants: {
        orderBy: { name: "asc" },
      },
    },
  })

  if (!activeSeason) {
    return { season: null, contestants: [], stockPrices: new Map() }
  }

  // Get latest stock prices
  const stockPrices = await prisma.stockPrice.findMany({
    where: {
      contestantId: { in: activeSeason.contestants.map((c) => c.id) },
    },
    orderBy: [{ weekNumber: "desc" }],
  })

  // Get unique prices per contestant (latest)
  const latestPrices = new Map<string, number>()
  const priceHistory = new Map<string, { current: number; previous: number }>()
  const pricesByContestant = new Map<string, typeof stockPrices>()

  for (const price of stockPrices) {
    if (!pricesByContestant.has(price.contestantId)) {
      pricesByContestant.set(price.contestantId, [])
    }
    pricesByContestant.get(price.contestantId)!.push(price)
  }

  for (const [contestantId, prices] of pricesByContestant.entries()) {
    // Sort by week descending
    prices.sort((a, b) => b.weekNumber - a.weekNumber)
    const current = prices[0]?.price ?? 5
    const previous = prices[1]?.price ?? prices[0]?.price ?? 5

    latestPrices.set(contestantId, current)
    priceHistory.set(contestantId, { current, previous })
  }

  // Get total shares owned by all players for each contestant
  const totalSharesByContestant = new Map<string, number>()

  for (const contestant of activeSeason.contestants) {
    const portfolioStocks = await prisma.portfolioStock.aggregate({
      where: { contestantId: contestant.id },
      _sum: { shares: true },
    })
    totalSharesByContestant.set(contestant.id, portfolioStocks._sum.shares ?? 0)
  }

  return {
    season: activeSeason,
    contestants: activeSeason.contestants.map((c) => ({
      ...c,
      currentPrice: latestPrices.get(c.id) ?? 5,
      priceChange: priceHistory.get(c.id)
        ? ((priceHistory.get(c.id)!.current - priceHistory.get(c.id)!.previous) /
            (priceHistory.get(c.id)!.previous || 1)) * 100
        : 0,
      totalSharesOwned: totalSharesByContestant.get(c.id) ?? 0,
    })),
  }
}

async function ContestantsPageContent() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const data = await getContestantsData()

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

  const { contestants } = data

  // Group by tribe
  const tribes = new Map<string, typeof contestants>()
  for (const contestant of contestants) {
    const tribe = contestant.tribe ?? "No Tribe"
    if (!tribes.has(tribe)) {
      tribes.set(tribe, [])
    }
    tribes.get(tribe)!.push(contestant)
  }

  const activeCount = contestants.filter((c) => c.isActive).length
  const eliminatedCount = contestants.filter((c) => !c.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Contestants</h1>
        <p className="text-muted-foreground">
          Season: {data.season.name} • {activeCount} Active, {eliminatedCount} Eliminated
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Stock Price</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                (contestants as any[]).reduce((sum: number, c: any) => sum + c.currentPrice, 0) / contestants.length
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Highest Priced Contestant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {contestants.reduce((max, c) => (c.currentPrice > max.currentPrice ? c : max)).name}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatCurrency(
                contestants.reduce((max, c) => (c.currentPrice > max.currentPrice ? c : max)).currentPrice
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Shares Issued</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(contestants as any[]).reduce((sum: number, c: any) => sum + c.totalShares, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contestants by Tribe */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Contestants</CardTitle>
              <CardDescription>Stock prices and status for all contestants</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Array.from(tribes.entries()).map(([tribe, tribeContestants]) => (
              <div key={tribe}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">{tribe}</Badge>
                  <span className="text-sm font-normal text-muted-foreground">
                    {tribeContestants.filter((c) => c.isActive).length} active
                  </span>
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {tribeContestants.map((contestant) => (
                    <Card
                      key={contestant.id}
                      className={!contestant.isActive ? "opacity-60" : ""}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{contestant.name}</h4>
                            <p className="text-xs text-muted-foreground">{tribe}</p>
                          </div>
                          <Badge
                            variant={contestant.isActive ? "default" : "destructive"}
                            className="shrink-0"
                          >
                            {contestant.isActive ? "Active" : "Out"}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Stock Price</span>
                            <span className="font-bold">{formatCurrency(contestant.currentPrice)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Change</span>
                            <span
                              className={`text-sm font-medium flex items-center gap-1 ${
                                contestant.priceChange >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {contestant.priceChange >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {contestant.priceChange >= 0 ? "+" : ""}
                              {contestant.priceChange.toFixed(1)}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Your Shares</span>
                            <span className="text-sm">
                              {contestant.totalSharesOwned} / {contestant.totalShares}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Table View */}
      <Card>
        <CardHeader>
          <CardTitle>Full Contestant List</CardTitle>
          <CardDescription>Detailed view of all contestants</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contestant</TableHead>
                <TableHead>Tribe</TableHead>
                <TableHead className="text-right">Stock Price</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Total Shares</TableHead>
                <TableHead className="text-right">Shares Owned</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contestants.map((contestant) => (
                <TableRow key={contestant.id}>
                  <TableCell className="font-medium">{contestant.name}</TableCell>
                  <TableCell>{contestant.tribe ?? "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(contestant.currentPrice)}</TableCell>
                  <TableCell className={`text-right ${
                    contestant.priceChange >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {contestant.priceChange >= 0 ? "+" : ""}{contestant.priceChange.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">{contestant.totalShares}</TableCell>
                  <TableCell className="text-right">{contestant.totalSharesOwned}</TableCell>
                  <TableCell>
                    {contestant.isActive ? (
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Eliminated</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stock Price Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            How Stock Prices Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Stock prices are determined by the <strong>median of all player ratings</strong> submitted each week.
            Rate contestants from 1-10 based on how likely you think they are to win.
            Higher ratings lead to higher stock prices, increasing the value of holdings in that contestant.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ContestantsPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Contestants</h1>
              <p className="text-muted-foreground">Loading contestants...</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="py-6">
                    <div className="h-8 bg-muted animate-pulse rounded w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        }
      >
        <ContestantsPageContent />
      </Suspense>
    </div>
  )
}
