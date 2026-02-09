import { Suspense } from "react"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { Users, Edit3 } from "lucide-react"

async function getPlayersData() {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
    return { season: null, players: [] }
  }

  const portfolios = await prisma.portfolio.findMany({
    where: { seasonId: activeSeason.id },
    include: {
      user: {
        select: { id: true, name: true, email: true, isAdmin: true },
      },
      stocks: {
        include: { contestant: true },
      },
    },
    orderBy: { netWorth: "desc" },
  })

  // Calculate stock values
  const stockPrices = await prisma.stockPrice.findMany({
    where: {
      contestantId: { in: portfolios.flatMap((p) => p.stocks.map((s) => s.contestantId)) },
    },
    orderBy: { weekNumber: "desc" },
  })

  const latestPrices = new Map<string, number>()
  for (const price of stockPrices) {
    if (!latestPrices.has(price.contestantId)) {
      latestPrices.set(price.contestantId, price.price)
    }
  }

  const enrichedPortfolios = portfolios.map((p) => ({
    ...p,
    stockValue: p.stocks.reduce((sum, s) => {
      if (!s.contestant.isActive) return sum
      return sum + s.shares * (latestPrices.get(s.contestantId) ?? s.averagePrice)
    }, 0),
  }))

  return { season: activeSeason, players: enrichedPortfolios }
}

async function adjustBalance(formData: FormData) {
  "use server"

  const session = await auth()

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const portfolioId = formData.get("portfolioId") as string
  const adjustment = parseFloat(formData.get("adjustment") as string)

  if (isNaN(adjustment)) {
    throw new Error("Invalid adjustment amount")
  }

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: {
      cashBalance: { increment: adjustment },
      netWorth: { increment: adjustment },
    },
  })

  revalidatePath("/admin/players")
  revalidatePath("/dashboard")
}

async function makeAdmin(formData: FormData) {
  "use server"

  const session = await auth()

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const userId = formData.get("userId") as string

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (user) {
    await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: !user.isAdmin },
    })
  }

  revalidatePath("/admin/players")
}

function AdjustBalanceDialog({ portfolioId, currentBalance }: { portfolioId: string; currentBalance: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit3 className="h-4 w-4 mr-1" />
          Adjust Balance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Cash Balance</DialogTitle>
          <DialogDescription>
            Add or remove cash from this player's account. Current balance: {formatCurrency(currentBalance)}
          </DialogDescription>
        </DialogHeader>
        <form action={adjustBalance}>
          <div className="space-y-4 py-4">
            <input type="hidden" name="portfolioId" value={portfolioId} />
            <div className="space-y-2">
              <Label htmlFor="adjustment">Adjustment Amount (negative to remove)</Label>
              <Input
                id="adjustment"
                name="adjustment"
                type="number"
                step="0.01"
                placeholder="e.g., 10 or -5"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter a positive number to add cash, negative to remove
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Adjust Balance</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

async function PlayersPageContent() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard")
  }

  const data = await getPlayersData()

  if (!data.season) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>
              Create a season first to manage players.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/admin/seasons">Go to Seasons</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Players</h1>
        <p className="text-muted-foreground">
          Season: {data.season.name} • {data.players.length} players
        </p>
      </div>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>Manage player accounts and balances</CardDescription>
        </CardHeader>
        <CardContent>
          {data.players.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Cash Balance</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                  <TableHead className="text-right">Net Worth</TableHead>
                  <TableHead className="text-right">Movement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.players.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{player.user.name}</span>
                        {player.user.isAdmin && (
                          <Badge variant="secondary" className="text-xs">Admin</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{player.user.email}</TableCell>
                    <TableCell className="text-right">{formatCurrency(player.cashBalance)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(player.stockValue)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(player.netWorth)}</TableCell>
                    <TableCell className={`text-right ${
                      player.movement >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {player.movement >= 0 ? "+" : ""}{player.movement.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AdjustBalanceDialog
                          portfolioId={player.id}
                          currentBalance={player.cashBalance}
                        />
                        {!player.user.isAdmin && player.user.id !== session.user.id && (
                          <form action={makeAdmin}>
                            <input type="hidden" name="userId" value={player.user.id} />
                            <Button size="sm" variant="ghost">
                              Make Admin
                            </Button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No players have joined this season yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PlayersPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Players</h1>
              <p className="text-muted-foreground">Loading players...</p>
            </div>
          </div>
        }
      >
        <PlayersPageContent />
      </Suspense>
    </div>
  )
}
