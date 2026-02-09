import { Suspense } from "react"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processDividends, updatePortfolioValues } from "@/lib/calculations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { DollarSign, AlertCircle, Info } from "lucide-react"

async function getDividendsData() {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
    return { season: null, dividends: [], currentWeek: 1 }
  }

  const dividends = await prisma.dividend.findMany({
    where: {
      portfolio: { seasonId: activeSeason.id },
    },
    include: {
      portfolio: {
        include: { user: true },
      },
    },
    orderBy: [
      { weekNumber: "desc" },
      { paidAt: "desc" },
    ],
    take: 100,
  })

  // Get current week
  const latestGame = await prisma.game.findFirst({
    where: { seasonId: activeSeason.id, aired: true },
    orderBy: { episodeNumber: "desc" },
  })

  const currentWeek = (latestGame?.episodeNumber ?? 0) + 1

  // Get pending achievements (week with achievements but no dividends processed)
  const achievements = await prisma.achievement.findMany({
    where: {
      contestant: { seasonId: activeSeason.id },
    },
    select: { weekNumber: true },
    distinct: ["weekNumber"],
    orderBy: { weekNumber: "desc" },
  })

  const weeksWithAchievements = new Set(achievements.map((a) => a.weekNumber))

  return { season: activeSeason, dividends, currentWeek, weeksWithAchievements }
}

async function processWeeklyDividends(formData: FormData) {
  "use server"

  const session = await auth()

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const weekNumber = parseInt(formData.get("weekNumber") as string)

  if (!weekNumber) {
    throw new Error("Week number is required")
  }

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
    throw new Error("No active season")
  }

  await processDividends(activeSeason.id, weekNumber)
  await updatePortfolioValues(activeSeason.id)

  revalidatePath("/admin/dividends")
  revalidatePath("/portfolio")
  revalidatePath("/dashboard")
  revalidatePath("/standings")
}

function ProcessDividendsDialog({
  currentWeek,
  weeksWithAchievements,
}: {
  currentWeek: number
  weeksWithAchievements: Set<number>
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <DollarSign className="h-4 w-4 mr-2" />
          Process Dividends
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Dividends</DialogTitle>
          <DialogDescription>
            Calculate and payout dividends based on contestant achievements.
          </DialogDescription>
        </DialogHeader>
        <form action={processWeeklyDividends}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="weekNumber">Week Number</Label>
              <Input
                id="weekNumber"
                name="weekNumber"
                type="number"
                defaultValue={currentWeek}
                min={1}
                required
              />
              <p className="text-xs text-muted-foreground">
                Process dividends for achievements logged in this week
              </p>
            </div>

            {weeksWithAchievements.size > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Weeks with logged achievements:{" "}
                  {Array.from(weeksWithAchievements).sort((a, b) => b - a).join(", ")}
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will calculate dividend payouts based on all achievements logged for the selected week
                and credit them to player portfolios. This action cannot be undone.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive">
              Process Dividends
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

async function DividendsPageContent() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard")
  }

  const data = await getDividendsData()

  if (!data.season) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>
              Create a season first before processing dividends.
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

  // Group dividends by week
  const dividendsByWeek = new Map<number, typeof data.dividends>()
  for (const dividend of data.dividends) {
    if (!dividendsByWeek.has(dividend.weekNumber)) {
      dividendsByWeek.set(dividend.weekNumber, [])
    }
    dividendsByWeek.get(dividend.weekNumber)!.push(dividend)
  }

  // Calculate totals per week
  const weeklyTotals = Array.from(dividendsByWeek.entries()).map(([week, dividends]) => ({
    week,
    totalAmount: (dividends as any[]).reduce((sum: number, d: any) => sum + d.amount, 0),
    count: dividends.length,
  })).sort((a: any, b: any) => b.week - a.week)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dividends</h1>
          <p className="text-muted-foreground">
            Season: {data.season.name} • Current Week: {data.currentWeek}
          </p>
        </div>
        <ProcessDividendsDialog
          currentWeek={data.currentWeek}
          weeksWithAchievements={data.weeksWithAchievements}
        />
      </div>

      {/* Weekly Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Weeks Processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyTotals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Dividends Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(weeklyTotals.reduce((sum, w) => sum + w.totalAmount, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Payouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.dividends.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Totals */}
      {weeklyTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Summary</CardTitle>
            <CardDescription>Dividend totals by week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {weeklyTotals.slice(0, 8).map((week) => (
                <Card key={week.week}>
                  <CardContent className="py-4">
                    <div className="text-sm text-muted-foreground">Week {week.week}</div>
                    <div className="text-xl font-bold">{formatCurrency(week.totalAmount)}</div>
                    <div className="text-xs text-muted-foreground">{week.count} payouts</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Dividends */}
      <Card>
        <CardHeader>
          <CardTitle>Dividend History</CardTitle>
          <CardDescription>Recent dividend payouts to players</CardDescription>
        </CardHeader>
        <CardContent>
          {data.dividends.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Contestant</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.dividends.slice(0, 50).map((dividend) => (
                  <TableRow key={dividend.id}>
                    <TableCell>{dividend.weekNumber}</TableCell>
                    <TableCell className="font-medium">{dividend.portfolio.user.name}</TableCell>
                    <TableCell>{dividend.contestantName}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      +{formatCurrency(dividend.amount)}
                    </TableCell>
                    <TableCell>{new Date(dividend.paidAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No dividends processed yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">About Dividends</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="mb-2">
            Dividends are paid out based on contestant achievements logged during each week.
            Each achievement type has a multiplier value:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Reward:</strong> $0.05 per share</li>
            <li><strong>Hidden Immunity Idol:</strong> $0.05 per share</li>
            <li><strong>Tribal Immunity:</strong> $0.10 per share</li>
            <li><strong>Individual Immunity:</strong> $0.15 per share</li>
          </ul>
          <p className="mt-2">
            When you process dividends for a week, all achievements for that week are summed up
            and the total multiplier is applied to each share owned by players.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DividendsPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Dividends</h1>
              <p className="text-muted-foreground">Loading dividend data...</p>
            </div>
          </div>
        }
      >
        <DividendsPageContent />
      </Suspense>
    </div>
  )
}
