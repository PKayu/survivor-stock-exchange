import { Suspense } from "react"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateTotalShares, updatePortfolioValues } from "@/lib/calculations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { Users, TrendingUp, Settings, Calendar, CheckCircle2, Circle, Wrench } from "lucide-react"
import { PhaseType } from "@prisma/client"

async function getAdminDashboardData() {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      contestants: true,
      phases: { orderBy: { startDate: "asc" } },
      portfolios: { include: { user: true } },
    },
  })

  const recentBids = await prisma.bid.findMany({
    include: {
      user: true,
      phase: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  const contestantIds = Array.from(new Set(recentBids.map((bid) => bid.contestantId)))
  const contestants = await prisma.contestant.findMany({
    where: { id: { in: contestantIds } },
    select: { id: true, name: true },
  })
  const contestantNameById = new Map(contestants.map((contestant) => [contestant.id, contestant.name]))

  const recentBidsWithNames = recentBids.map((bid) => ({
    ...bid,
    contestantName: contestantNameById.get(bid.contestantId) ?? "Unknown",
  }))

  const totalSeasons = await prisma.season.count()
  const totalUsers = await prisma.user.count()
  const totalPlayers = await prisma.user.count({ where: { isAdmin: false } })

  if (!activeSeason) {
    return {
      activeSeason: null,
      recentBids: recentBidsWithNames,
      totalSeasons,
      totalUsers,
      totalPlayers,
      readiness: {
        hasActiveSeason: false,
        hasContestants: false,
        hasPortfolios: false,
        sharesAllocated: false,
        hasPhaseSchedule: false,
        readyForLaunch: false,
      },
    }
  }

  const phaseTypesPresent = new Set(activeSeason.phases.map((p) => p.phaseType))
  const requiredPhaseTypes: PhaseType[] = [
    "INITIAL_OFFERING",
    "SECOND_OFFERING",
    "FIRST_LISTING",
    "SECOND_LISTING",
    "GAME_DAY",
  ]

  const readiness = {
    hasActiveSeason: true,
    hasContestants: activeSeason.contestants.length > 0,
    hasPortfolios: activeSeason.portfolios.length > 0,
    sharesAllocated:
      activeSeason.contestants.length > 0 && activeSeason.contestants.every((c) => c.totalShares > 0),
    hasPhaseSchedule: requiredPhaseTypes.every((phaseType) => phaseTypesPresent.has(phaseType)),
    readyForLaunch: false,
  }

  readiness.readyForLaunch =
    readiness.hasActiveSeason &&
    readiness.hasContestants &&
    readiness.hasPortfolios &&
    readiness.sharesAllocated &&
    readiness.hasPhaseSchedule

  return {
    activeSeason,
    recentBids: recentBidsWithNames,
    totalSeasons,
    totalUsers,
    totalPlayers,
    readiness,
  }
}

async function enrollPlayersToActiveSeason() {
  "use server"

  const session = await auth()
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } })
  if (!activeSeason) {
    throw new Error("No active season")
  }

  const players = await prisma.user.findMany({
    where: { isAdmin: false },
    select: { id: true },
  })

  for (const player of players) {
    await prisma.portfolio.upsert({
      where: {
        userId_seasonId: {
          userId: player.id,
          seasonId: activeSeason.id,
        },
      },
      update: {},
      create: {
        userId: player.id,
        seasonId: activeSeason.id,
        cashBalance: activeSeason.startingSalary,
        totalStock: 0,
        netWorth: activeSeason.startingSalary,
        movement: 0,
      },
    })
  }

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/players")
}

async function allocateSharesForActiveSeason() {
  "use server"

  const session = await auth()
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } })
  if (!activeSeason) {
    throw new Error("No active season")
  }

  await calculateTotalShares(activeSeason.id)

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/contestants")
}

async function createDefaultPhasesForNextWeek() {
  "use server"

  const session = await auth()
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } })
  if (!activeSeason) {
    throw new Error("No active season")
  }

  const weekStats = await prisma.phase.aggregate({
    where: { seasonId: activeSeason.id },
    _max: { weekNumber: true },
  })

  const nextWeek = (weekStats._max.weekNumber ?? 0) + 1
  const existingWeekPhases = await prisma.phase.count({
    where: { seasonId: activeSeason.id, weekNumber: nextWeek },
  })

  if (existingWeekPhases > 0) {
    revalidatePath("/admin/dashboard")
    revalidatePath("/admin/phases")
    return
  }

  const now = new Date()
  const day = (numDays: number) => new Date(now.getTime() + numDays * 24 * 60 * 60 * 1000)

  await prisma.phase.createMany({
    data: [
      {
        seasonId: activeSeason.id,
        phaseType: "INITIAL_OFFERING",
        weekNumber: nextWeek,
        name: `Week ${nextWeek} Initial Offering`,
        startDate: day(0),
        endDate: day(3),
        isOpen: false,
      },
      {
        seasonId: activeSeason.id,
        phaseType: "SECOND_OFFERING",
        weekNumber: nextWeek,
        name: `Week ${nextWeek} Second Offering`,
        startDate: day(3),
        endDate: day(4),
        isOpen: false,
      },
      {
        seasonId: activeSeason.id,
        phaseType: "FIRST_LISTING",
        weekNumber: nextWeek,
        name: `Week ${nextWeek} First Listing`,
        startDate: day(5),
        endDate: day(7),
        isOpen: false,
      },
      {
        seasonId: activeSeason.id,
        phaseType: "SECOND_LISTING",
        weekNumber: nextWeek,
        name: `Week ${nextWeek} Second Listing`,
        startDate: day(7),
        endDate: day(9),
        isOpen: false,
      },
      {
        seasonId: activeSeason.id,
        phaseType: "GAME_DAY",
        weekNumber: nextWeek,
        name: `Week ${nextWeek} Game Day`,
        startDate: day(10),
        endDate: day(11),
        isOpen: false,
      },
    ],
  })

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/phases")
}

async function recalculateActiveSeasonPortfolios() {
  "use server"

  const session = await auth()
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } })
  if (!activeSeason) {
    throw new Error("No active season")
  }

  await updatePortfolioValues(activeSeason.id)

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/players")
  revalidatePath("/admin/dividends")
}

function ReadinessItem({ label, isReady }: { label: string; isReady: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm">{label}</span>
      {isReady ? (
        <Badge className="bg-green-600 hover:bg-green-600">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Ready
        </Badge>
      ) : (
        <Badge variant="secondary">
          <Circle className="mr-1 h-3.5 w-3.5" />
          Pending
        </Badge>
      )}
    </div>
  )
}

async function AdminDashboardContent() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard")
  }

  const data = await getAdminDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage season setup and weekly game operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPlayers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Seasons</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSeasons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Launch Status</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.readiness.readyForLaunch ? (
              <Badge className="bg-green-600 hover:bg-green-600">Ready</Badge>
            ) : (
              <Badge variant="secondary">Needs Setup</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {data.activeSeason ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Season</CardTitle>
                <CardDescription>{data.activeSeason.name}</CardDescription>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Contestants</p>
                <p className="text-lg font-semibold">
                  {data.activeSeason.contestants.length} total, {data.activeSeason.contestants.filter((c) => c.isActive).length} active
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Season Players</p>
                <p className="text-lg font-semibold">{data.activeSeason.portfolios.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Configured Phases</p>
                <p className="text-lg font-semibold">{data.activeSeason.phases.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Starting Salary</p>
                <p className="text-lg font-semibold">{formatCurrency(data.activeSeason.startingSalary)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>Create and activate a season to begin setup.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/seasons">
              <Button>Create Season</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Season Readiness</CardTitle>
          <CardDescription>Official-rules setup checklist before opening trading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ReadinessItem label="Active season selected" isReady={data.readiness.hasActiveSeason} />
            <ReadinessItem label="Contestants added" isReady={data.readiness.hasContestants} />
            <ReadinessItem label="Players enrolled in season" isReady={data.readiness.hasPortfolios} />
            <ReadinessItem label="Shares allocated" isReady={data.readiness.sharesAllocated} />
            <ReadinessItem label="Core phase schedule created" isReady={data.readiness.hasPhaseSchedule} />
          </div>

          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <form action={enrollPlayersToActiveSeason}>
              <Button type="submit" variant="outline" className="w-full">Enroll Players</Button>
            </form>
            <form action={allocateSharesForActiveSeason}>
              <Button type="submit" variant="outline" className="w-full">Allocate Shares</Button>
            </form>
            <form action={createDefaultPhasesForNextWeek}>
              <Button type="submit" variant="outline" className="w-full">Generate Next Week Phases</Button>
            </form>
            <form action={recalculateActiveSeasonPortfolios}>
              <Button type="submit" variant="outline" className="w-full">Recalculate Portfolios</Button>
            </form>
          </div>

          <p className="text-xs text-muted-foreground">
            Detailed runbook: <code>docs/admin-workflows.md</code> (repository file)
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/seasons">
          <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Manage Seasons</p>
                  <p className="text-sm text-muted-foreground">Create and edit seasons</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/contestants">
          <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Manage Contestants</p>
                  <p className="text-sm text-muted-foreground">Add and update contestants</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/phases">
          <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Manage Phases</p>
                  <p className="text-sm text-muted-foreground">Control trading windows</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/achievements">
          <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Log Achievements</p>
                  <p className="text-sm text-muted-foreground">Record weekly outcomes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest bids in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentBids.length > 0 ? (
            <div className="space-y-3">
              {data.recentBids.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                  <div>
                    <span className="font-medium">{bid.user.name}</span> bid on <span className="font-medium">{bid.contestantName}</span>
                    <p className="text-muted-foreground">{bid.phase?.name ?? bid.phase?.phaseType ?? "Phase"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>
                      {bid.shares} shares @ {formatCurrency(bid.bidPrice)}
                    </span>
                    <Badge variant={bid.isAwarded ? "default" : "secondary"}>
                      {bid.isAwarded ? "Awarded" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No recent activity</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/players">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Players</CardTitle>
              <CardDescription>Manage accounts, balances, and admin access</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/dividends">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Dividends</CardTitle>
              <CardDescription>Process weekly payouts and verify totals</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/bids">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Bids</CardTitle>
              <CardDescription>Review and settle silent-auction bids</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>System overview and game rule reference</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Loading admin data...</p>
            </div>
          </div>
        }
      >
        <AdminDashboardContent />
      </Suspense>
    </div>
  )
}
