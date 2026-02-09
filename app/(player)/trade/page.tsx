import { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, getTimeRemaining, isPhaseOpen } from "@/lib/utils"
import { PHASE_NAMES } from "@/types"
import Link from "next/link"
import { Clock, AlertCircle, TrendingUp, ShoppingBag, Tag } from "lucide-react"
import { PlaceBidForm } from "@/components/trading/place-bid-form"
import { CreateListingForm } from "@/components/trading/create-listing-form"

async function getTradeData(userId: string) {
  // Get active season
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      contestants: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
  })

  if (!activeSeason) {
    return { season: null, portfolio: null, currentPhase: null, listings: [], bids: [] }
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
  const currentPhase = await prisma.phase.findFirst({
    where: {
      seasonId: activeSeason.id,
      isOpen: true,
      startDate: { lte: now },
    },
    orderBy: { startDate: "desc" },
  })

  // Get current stock prices
  const stockPrices = await prisma.stockPrice.findMany({
    where: {
      contestantId: { in: activeSeason.contestants.map((c) => c.id) },
    },
    orderBy: { weekNumber: "desc" },
  })

  // Get unique prices per contestant (latest)
  const latestPrices = new Map<string, number>()
  for (const price of stockPrices) {
    if (!latestPrices.has(price.contestantId)) {
      latestPrices.set(price.contestantId, price.price)
    }
  }

  // Get active listings
  const listings = await prisma.listing.findMany({
    where: {
      ...(currentPhase
        ? { phaseId: currentPhase.id }
        : { phase: { seasonId: activeSeason.id } }),
      isFilled: false,
    },
    include: {
      seller: true,
      contestant: true,
      phase: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  // Get user's bids
  const userBids = await prisma.bid.findMany({
    where: {
      user: { id: userId },
      phase: { seasonId: activeSeason.id },
    },
    include: { phase: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  // Get existing bids for current phase
  const existingBids = currentPhase
    ? await prisma.bid.findMany({
        where: {
          userId,
          phaseId: currentPhase.id,
        },
      })
    : []

  return {
    season: activeSeason,
    portfolio,
    currentPhase,
    contestants: activeSeason.contestants.map((c) => ({
      ...c,
      currentPrice: latestPrices.get(c.id) ?? 5,
    })),
    listings,
    bids: userBids,
    existingBids,
  }
}

function PhaseBanner({
  phase,
  timeRemaining,
}: {
  phase: { phaseType: string; weekNumber: number; endDate: Date | null }
  timeRemaining: { days: number; hours: number; minutes: number; isPast: boolean }
}) {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Badge className="text-sm px-3 py-1">
              {PHASE_NAMES[phase.phaseType as keyof typeof PHASE_NAMES]}
            </Badge>
            <span className="text-sm text-muted-foreground">Week {phase.weekNumber}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {timeRemaining.isPast ? (
              <span className="text-muted-foreground">Phase ended</span>
            ) : (
              <span>
                {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                {timeRemaining.hours}h {timeRemaining.minutes}m remaining
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

async function TradePageContent() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const data = await getTradeData(session.user.id)

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

  const { portfolio, currentPhase, contestants, listings, bids, existingBids } = data

  const isAuctionPhase =
    currentPhase?.phaseType === "INITIAL_OFFERING" ||
    currentPhase?.phaseType === "SECOND_OFFERING"

  const isListingPhase =
    currentPhase?.phaseType === "FIRST_LISTING" ||
    currentPhase?.phaseType === "SECOND_LISTING"

  const isGameDay = currentPhase?.phaseType === "GAME_DAY"

  const listingContestants = contestants
    .map((contestant) => {
      const activeListings = listings.filter(
        (listing) =>
          listing.contestantId === contestant.id &&
          listing.sellerId !== session.user.id &&
          listing.phaseId === currentPhase?.id
      )

      if (activeListings.length === 0) return null

      const minBidPrice = Math.min(
        ...activeListings.map((listing) => listing.minimumPrice)
      )

      return {
        ...contestant,
        minBidPrice,
      }
    })
    .filter((contestant): contestant is NonNullable<typeof contestant> =>
      Boolean(contestant)
    )

  const timeRemaining = currentPhase?.endDate
    ? getTimeRemaining(currentPhase.endDate)
    : { days: 0, hours: 0, minutes: 0, isPast: false }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Trade</h1>
        <p className="text-muted-foreground">
          Buy and sell Survivor contestant stocks
        </p>
      </div>

      {/* Phase Banner */}
      {currentPhase ? (
        <PhaseBanner phase={currentPhase} timeRemaining={timeRemaining} />
      ) : (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No active trading phase. Check back soon!</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Summary */}
      {portfolio && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cash Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(portfolio.cashBalance)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Stock Value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(portfolio.totalStock)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Net Worth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(portfolio.netWorth)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trading Interface */}
      {currentPhase && !isGameDay && (
        <Tabs defaultValue={isAuctionPhase ? "bids" : "listings"} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bids" disabled={!isAuctionPhase && !isListingPhase}>
              <ShoppingBag className="h-4 w-4 mr-2" />
              Buy Stock
            </TabsTrigger>
            <TabsTrigger value="listings" disabled={!isListingPhase}>
              <Tag className="h-4 w-4 mr-2" />
              Sell Stock
            </TabsTrigger>
          </TabsList>

          {/* Bids Tab */}
          <TabsContent value="bids" className="space-y-4">
            {isAuctionPhase || isListingPhase ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {isAuctionPhase
                        ? "Place Silent Auction Bids"
                        : "Place Listing-Phase Buy Bids"}
                    </CardTitle>
                    <CardDescription>
                      {isAuctionPhase
                        ? "Bid on contestants. Highest bids win! You will be charged only if you win."
                        : "Bid on listed contestants in $0.25 increments. Bids must meet listing minimum prices."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlaceBidForm
                      contestants={isListingPhase ? listingContestants : contestants}
                      phaseId={currentPhase.id}
                      existingBids={existingBids}
                      cashBalance={portfolio?.cashBalance ?? 0}
                    />
                  </CardContent>
                </Card>

                <Separator />

                <Card>
                  <CardHeader>
                    <CardTitle>Your Bids</CardTitle>
                    <CardDescription>
                      {isAuctionPhase
                        ? "Your active bids for this offering phase"
                        : "Your active bids for this listing phase"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {existingBids.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contestant</TableHead>
                            <TableHead className="text-right">Shares</TableHead>
                            <TableHead className="text-right">Bid Price</TableHead>
                            <TableHead className="text-right">Total Cost</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {existingBids.map((bid) => {
                            const contestant = contestants.find((c) => c.id === bid.contestantId)
                            return (
                              <TableRow key={bid.id}>
                                <TableCell className="font-medium">
                                  {contestant?.name ?? bid.contestantId}
                                </TableCell>
                                <TableCell className="text-right">{bid.shares}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(bid.bidPrice)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(bid.shares * bid.bidPrice)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={bid.isAwarded ? "default" : "secondary"}>
                                    {bid.isAwarded ? "Awarded" : "Pending"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No bids placed yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    Bidding is only available during offering and listing phases.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            {isListingPhase && portfolio ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>List Your Stocks for Sale</CardTitle>
                    <CardDescription>
                      Sell stocks you own. You will receive 50% of the current stock value.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CreateListingForm
                      stocks={portfolio.stocks.filter((s) => s.shares > 0 && s.contestant.isActive)}
                      phaseId={currentPhase.id}
                    />
                  </CardContent>
                </Card>

                <Separator />

                <Card>
                  <CardHeader>
                    <CardTitle>Market Listings</CardTitle>
                    <CardDescription>Stocks available for purchase</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {listings.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Seller</TableHead>
                            <TableHead>Contestant</TableHead>
                            <TableHead className="text-right">Shares</TableHead>
                            <TableHead className="text-right">Min Price</TableHead>
                              <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {listings.map((listing) => (
                            <TableRow key={listing.id}>
                              <TableCell>{listing.seller.name}</TableCell>
                              <TableCell className="font-medium">{listing.contestant.name}</TableCell>
                              <TableCell className="text-right">{listing.shares}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(listing.minimumPrice)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">Use Buy Stock tab to bid</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No active listings
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    Stock listings are only available during First and Second Listing phases.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Game Day Message */}
      {isGameDay && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Game Day - Trading Closed</h3>
              <p className="text-muted-foreground">
                Trading is closed during Game Day. Watch the episode and check back after it airs!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Prices Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Current Stock Prices</CardTitle>
          <CardDescription>Reference prices based on player ratings</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contestant</TableHead>
                <TableHead>Tribe</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contestants.map((contestant) => (
                <TableRow key={contestant.id}>
                  <TableCell className="font-medium">{contestant.name}</TableCell>
                  <TableCell>{contestant.tribe ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(contestant.currentPrice)}
                  </TableCell>
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
    </div>
  )
}

export default function TradePage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Trade</h1>
              <p className="text-muted-foreground">Loading trading data...</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="py-6">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-6">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-6">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            </div>
          </div>
        }
      >
        <TradePageContent />
      </Suspense>
    </div>
  )
}
