import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { PHASE_NAMES } from "@/types"
import Link from "next/link"
import { TrendingUp, TrendingDown, DollarSign, Wallet, BarChart3, AlertCircle } from "lucide-react"

async function getDashboardData(userId: string) {
  // Get active season
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      contestants: {
        where: { isActive: true },
      },
      phases: {
        where: { isOpen: true },
        orderBy: { startDate: "desc" },
      },
    },
  })

  if (!activeSeason) {
    return { season: null, portfolio: null, currentPhase: null, standings: [] }
  }

  // Get user portfolio
  const portfolio = await prisma.portfolio.findUnique({
    where: {
      userId_seasonId: {
        userId,
        seasonId: activeSeason.id,
      },
    },
    include: {
      stocks: {
        include: { contestant: true },
      },
    },
  })

  // Get current phase
  const now = new Date()
  const currentPhase = activeSeason.phases.find((p) => {
    const start = new Date(p.startDate)
    const end = p.endDate ? new Date(p.endDate) : null
    return start <= now && (!end || end >= now) && p.isOpen
  })

  // Get standings
  const standings = await prisma.portfolio.findMany({
    where: { seasonId: activeSeason.id },
    include: { user: true },
    orderBy: { netWorth: "desc" },
  })

  // Get recent activity
  const recentBids = await prisma.bid.findMany({
    where: {
      user: { id: userId },
      phase: { seasonId: activeSeason.id },
    },
    include: { phase: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return {
    season: activeSeason,
    portfolio,
    currentPhase,
    standings,
    recentBids,
  }
}

function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string
  value: string | number
  change?: number
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={`text-xs flex items-center gap-1 mt-1 ${
            change >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {formatPercentage(change)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

async function DashboardContent() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const data = await getDashboardData(session.user.id)

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

  const { portfolio, currentPhase, standings, recentBids } = data

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}! Season: {data.season.name}
        </p>
      </div>

      {/* Current Phase Banner */}
      {currentPhase && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="text-sm px-3 py-1">
                  {PHASE_NAMES[currentPhase.phaseType]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Week {currentPhase.weekNumber}
                </span>
              </div>
              <Link href="/trade">
                <Button size="sm">Trade Now</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentPhase && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No active trading phase. Check back soon!</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {portfolio ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Portfolio Value"
            value={formatCurrency(portfolio.netWorth)}
            change={portfolio.movement}
            icon={Wallet}
          />
          <StatCard
            title="Cash Balance"
            value={formatCurrency(portfolio.cashBalance)}
            icon={DollarSign}
          />
          <StatCard
            title="Stock Value"
            value={formatCurrency(portfolio.totalStock)}
            icon={BarChart3}
          />
          <StatCard
            title="Your Rank"
            value={`#${standings.findIndex((s) => s.userId === session.user.id) + 1} of ${standings.length}`}
            icon={TrendingUp}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                You don't have a portfolio for this season yet.
              </p>
              <Button>Join Season</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock Holdings */}
        {portfolio && portfolio.stocks.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Your Stocks</CardTitle>
              <CardDescription>Current stock holdings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contestant</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolio.stocks
                    .filter((s) => s.shares > 0)
                    .map((stock) => (
                      <TableRow key={stock.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{stock.contestant.name}</div>
                            {!stock.contestant.isActive && (
                              <Badge variant="destructive" className="text-xs">
                                Eliminated
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{stock.shares}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(stock.shares * stock.averagePrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Stocks</CardTitle>
              <CardDescription>Current stock holdings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                No stock holdings yet. Participate in an offering to get started!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest trades</CardDescription>
          </CardHeader>
          <CardContent>
            {recentBids.length > 0 ? (
              <div className="space-y-3">
                {recentBids.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">Bid: #{bid.contestantId.substring(0, 8)}</span>
                      <p className="text-muted-foreground">
                        {bid.shares} shares @ {formatCurrency(bid.bidPrice)}
                      </p>
                    </div>
                    <Badge variant={bid.isAwarded ? "default" : "secondary"}>
                      {bid.isAwarded ? "Awarded" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Leaderboard Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>Top performers this season</CardDescription>
            </div>
            <Link href="/standings">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Net Worth</TableHead>
                <TableHead className="text-right">Movement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.slice(0, 5).map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Badge variant={i === 0 ? "default" : "secondary"}>{i + 1}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{s.user.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.netWorth)}</TableCell>
                  <TableCell className={`text-right ${
                    s.movement >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {formatPercentage(s.movement)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Loading your portfolio...</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <LoadingCard title="Portfolio Value" />
              <LoadingCard title="Cash Balance" />
              <LoadingCard title="Stock Value" />
              <LoadingCard title="Your Rank" />
            </div>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  )
}
