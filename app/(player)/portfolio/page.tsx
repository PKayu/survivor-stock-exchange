import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDateTime, getInitials } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, Wallet, PieChartIcon as PieChart } from "lucide-react"

async function getPortfolioData(userId: string) {
  // Get active season
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
    return { season: null, portfolio: null, holdings: [], transactions: [], dividends: [] }
  }

  // Get user portfolio with holdings
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

  // Get latest stock prices
  const stockPrices = await prisma.stockPrice.findMany({
    where: {
      contestantId: { in: portfolio?.stocks.map((s) => s.contestantId) ?? [] },
    },
    orderBy: { weekNumber: "desc" },
  })

  // Get latest price per contestant
  const latestPrices = new Map<string, number>()
  for (const price of stockPrices) {
    if (!latestPrices.has(price.contestantId)) {
      latestPrices.set(price.contestantId, price.price)
    }
  }

  // Enrich holdings with current prices
  const holdings = portfolio?.stocks.map((stock) => ({
    ...stock,
    currentPrice: stock.contestant.isActive
      ? latestPrices.get(stock.contestantId) ?? stock.averagePrice
      : 0,
    currentValue: stock.contestant.isActive
      ? stock.shares * (latestPrices.get(stock.contestantId) ?? stock.averagePrice)
      : 0,
    costBasis: stock.shares * stock.averagePrice,
    gainLoss: stock.contestant.isActive
      ? stock.shares *
        ((latestPrices.get(stock.contestantId) ?? stock.averagePrice) - stock.averagePrice)
      : -stock.shares * stock.averagePrice,
  })) ?? []

  // Get transaction history (bids)
  const transactions = await prisma.bid.findMany({
    where: {
      user: { id: userId },
      phase: { seasonId: activeSeason.id },
    },
    include: {
      phase: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  // Get dividend history
  const dividends = await prisma.dividend.findMany({
    where: {
      portfolio: {
        userId,
        seasonId: activeSeason.id,
      },
    },
    orderBy: { paidAt: "desc" },
    take: 50,
  })

  return {
    season: activeSeason,
    portfolio,
    holdings,
    transactions,
    dividends,
  }
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
            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
          </p>
        )}
      </CardContent>
    </Card>
  )
}

async function PortfolioPageContent() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const data = await getPortfolioData(session.user.id)

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

  const { portfolio, holdings, transactions, dividends } = data

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Portfolio</CardTitle>
            <CardDescription>
              You don't have a portfolio for this season yet.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0)
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const totalGainLoss = totalCurrentValue - totalCostBasis

  // Group holdings by tribe
  const holdingsByTribe = new Map<string, typeof holdings>()
  for (const holding of holdings) {
    const tribe = holding.contestant.tribe ?? "No Tribe"
    if (!holdingsByTribe.has(tribe)) {
      holdingsByTribe.set(tribe, [])
    }
    holdingsByTribe.get(tribe)!.push(holding)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Portfolio</h1>
        <p className="text-muted-foreground">Season: {data.season.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Net Worth"
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
          value={formatCurrency(totalCurrentValue)}
          change={totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Shares"
          value={holdings.reduce((sum, h) => sum + h.shares, 0)}
          icon={PieChart}
        />
      </div>

      {/* Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Holdings</CardTitle>
          <CardDescription>Your current stock positions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="tribe">By Tribe</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              {holdings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contestant</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Avg Cost</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                      <TableHead className="text-right">Market Value</TableHead>
                      <TableHead className="text-right">Gain/Loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings
                      .filter((h) => h.shares > 0)
                      .map((holding) => (
                        <TableRow key={holding.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{holding.contestant.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {holding.contestant.tribe ?? "No Tribe"}
                              </div>
                              {!holding.contestant.isActive && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  Eliminated
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{holding.shares}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(holding.averagePrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(holding.currentPrice)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(holding.currentValue)}
                          </TableCell>
                          <TableCell className={`text-right ${
                            holding.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {holding.gainLoss >= 0 ? "+" : ""}{formatCurrency(holding.gainLoss)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No stock holdings yet
                </p>
              )}
            </TabsContent>

            <TabsContent value="tribe">
              <div className="space-y-4">
                {Array.from(holdingsByTribe.entries()).map(([tribe, tribeHoldings]) => (
                  <Card key={tribe}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{tribe}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {tribeHoldings
                          .filter((h) => h.shares > 0)
                          .map((holding) => (
                            <div key={holding.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium"
                                >
                                  {getInitials(holding.contestant.name)}
                                </div>
                                <div>
                                  <div className="font-medium">{holding.contestant.name}</div>
                                  {!holding.contestant.isActive && (
                                    <span className="text-xs text-red-500">Eliminated</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {holding.shares} @ {formatCurrency(holding.currentPrice)}
                                </div>
                                <div className={`text-xs ${
                                  holding.gainLoss >= 0 ? "text-green-600" : "text-red-600"
                                }`}>
                                  {holding.gainLoss >= 0 ? "+" : ""}{formatCurrency(holding.gainLoss)}
                                </div>
                              </div>
                            </div>
                          ))}
                        {tribeHoldings.filter((h) => h.shares > 0).length === 0 && (
                          <p className="text-sm text-muted-foreground">No holdings in this tribe</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent bids and purchases</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.slice(0, 20).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium">
                      {txn.isAwarded ? "Purchased" : "Bid on"} contestant #{txn.contestantId.substring(0, 6)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(txn.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {txn.shares} shares @ {formatCurrency(txn.bidPrice)}
                    </div>
                    <Badge variant={txn.isAwarded ? "default" : "secondary"} className="text-xs">
                      {txn.isAwarded ? "Filled" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
          )}
        </CardContent>
      </Card>

      {/* Dividend History */}
      <Card>
        <CardHeader>
          <CardTitle>Dividend History</CardTitle>
          <CardDescription>Dividends earned from contestant achievements</CardDescription>
        </CardHeader>
        <CardContent>
          {dividends.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Contestant</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividends.slice(0, 20).map((dividend) => (
                  <TableRow key={dividend.id}>
                    <TableCell>{dividend.weekNumber}</TableCell>
                    <TableCell className="font-medium">{dividend.contestantName}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      +{formatCurrency(dividend.amount)}
                    </TableCell>
                    <TableCell>{formatDateTime(dividend.paidAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No dividends earned yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">My Portfolio</h1>
              <p className="text-muted-foreground">Loading portfolio data...</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
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
        <PortfolioPageContent />
      </Suspense>
    </div>
  )
}
