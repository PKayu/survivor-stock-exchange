import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import {
  Calendar,
  CheckCircle2,
  Circle,
  Gavel,
  Settings,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react"
import { PhaseType } from "@prisma/client"
import {
  allocateSharesForActiveSeason,
  createDefaultPhasesForNextWeek,
  enrollPlayersToActiveSeason,
  markWeekAired,
  processWeekDividends,
  recalculateActiveSeasonPortfolios,
  settleCurrentListingPhase,
  settleCurrentOfferingPhase,
} from "./actions"

type WeeklyOperations = {
  currentOpenPhaseName: string | null
  offeringPhaseToSettleId: string | null
  offeringPhaseToSettleName: string | null
  listingPhaseToSettleId: string | null
  listingPhaseToSettleName: string | null
  nextWeekNumber: number
  nextWeekIsAired: boolean
  pendingDividendWeek: number | null
  pendingDividendCount: number
  latestAiredWeek: number
  loggedAchievementsForPendingWeek: number
}

type DashboardData = {
  activeSeason: {
    id: string
    name: string
    startingSalary: number
    contestants: Array<{ id: string; isActive: boolean; totalShares: number }>
    phases: Array<{ phaseType: PhaseType }>
    portfolios: Array<{ id: string }>
  } | null
  recentBids: Array<{
    id: string
    shares: number
    bidPrice: number
    isAwarded: boolean
    user: { name: string | null }
    phase: { name: string | null; phaseType: PhaseType } | null
    contestantName: string
  }>
  totalSeasons: number
  totalUsers: number
  totalPlayers: number
  readiness: {
    hasActiveSeason: boolean
    hasContestants: boolean
    hasPortfolios: boolean
    sharesAllocated: boolean
    hasPhaseSchedule: boolean
    readyForLaunch: boolean
  }
  weeklyOperations: WeeklyOperations
}

async function getAdminDashboardData(): Promise<DashboardData> {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      contestants: {
        select: {
          id: true,
          isActive: true,
          totalShares: true,
        },
      },
      phases: {
        select: {
          id: true,
          name: true,
          phaseType: true,
          isOpen: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: "asc" },
      },
      portfolios: {
        select: { id: true },
      },
    },
  })

  const recentBidsRaw = await prisma.bid.findMany({
    include: {
      user: { select: { name: true } },
      phase: { select: { name: true, phaseType: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  const contestantIds = Array.from(
    new Set(recentBidsRaw.map((bid) => bid.contestantId))
  )
  const contestants = await prisma.contestant.findMany({
    where: { id: { in: contestantIds } },
    select: { id: true, name: true },
  })
  const contestantNameById = new Map(
    contestants.map((contestant) => [contestant.id, contestant.name])
  )

  const recentBids = recentBidsRaw.map((bid) => ({
    id: bid.id,
    shares: bid.shares,
    bidPrice: bid.bidPrice,
    isAwarded: bid.isAwarded,
    user: bid.user,
    phase: bid.phase,
    contestantName: contestantNameById.get(bid.contestantId) ?? "Unknown",
  }))

  const totalSeasons = await prisma.season.count()
  const totalUsers = await prisma.user.count()
  const totalPlayers = await prisma.user.count({ where: { isAdmin: false } })

  if (!activeSeason) {
    return {
      activeSeason: null,
      recentBids,
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
      weeklyOperations: {
        currentOpenPhaseName: null,
        offeringPhaseToSettleId: null,
        offeringPhaseToSettleName: null,
        listingPhaseToSettleId: null,
        listingPhaseToSettleName: null,
        nextWeekNumber: 1,
        nextWeekIsAired: false,
        pendingDividendWeek: null,
        pendingDividendCount: 0,
        latestAiredWeek: 0,
        loggedAchievementsForPendingWeek: 0,
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
      activeSeason.contestants.length > 0 &&
      activeSeason.contestants.every((c) => c.totalShares > 0),
    hasPhaseSchedule: requiredPhaseTypes.every((phaseType) =>
      phaseTypesPresent.has(phaseType)
    ),
    readyForLaunch: false,
  }

  readiness.readyForLaunch =
    readiness.hasActiveSeason &&
    readiness.hasContestants &&
    readiness.hasPortfolios &&
    readiness.sharesAllocated &&
    readiness.hasPhaseSchedule

  const now = new Date()
  const currentOpenPhase = activeSeason.phases.find((phase) => {
    if (!phase.isOpen) return false
    if (phase.startDate > now) return false
    return !phase.endDate || phase.endDate >= now
  })

  const offeringPhaseToSettle = activeSeason.phases.find((phase) => {
    if (!phase.isOpen) return false
    if (phase.startDate > now) return false
    if (phase.endDate && phase.endDate < now) return false
    return (
      phase.phaseType === "INITIAL_OFFERING" ||
      phase.phaseType === "SECOND_OFFERING"
    )
  })

  const listingPhaseToSettle = activeSeason.phases.find((phase) => {
    if (!phase.isOpen) return false
    if (phase.startDate > now) return false
    if (phase.endDate && phase.endDate < now) return false
    return (
      phase.phaseType === "FIRST_LISTING" ||
      phase.phaseType === "SECOND_LISTING"
    )
  })

  const latestAiredGame = await prisma.game.findFirst({
    where: {
      seasonId: activeSeason.id,
      aired: true,
    },
    orderBy: { episodeNumber: "desc" },
  })
  const latestAiredWeek = latestAiredGame?.episodeNumber ?? 0
  const nextWeekNumber = latestAiredWeek + 1

  const nextWeekGame = await prisma.game.findFirst({
    where: {
      seasonId: activeSeason.id,
      episodeNumber: nextWeekNumber,
    },
  })

  const pendingDividendGame = await prisma.game.findFirst({
    where: {
      seasonId: activeSeason.id,
      aired: true,
      dividendProcessed: false,
    },
    orderBy: { episodeNumber: "asc" },
  })

  const pendingDividendWeek = pendingDividendGame?.episodeNumber ?? null
  const loggedAchievementsForPendingWeek = pendingDividendWeek
    ? await prisma.achievement.count({
        where: {
          weekNumber: pendingDividendWeek,
          contestant: { seasonId: activeSeason.id },
        },
      })
    : 0

  const pendingDividendCount = await prisma.game.count({
    where: {
      seasonId: activeSeason.id,
      aired: true,
      dividendProcessed: false,
    },
  })

  return {
    activeSeason: {
      id: activeSeason.id,
      name: activeSeason.name,
      startingSalary: activeSeason.startingSalary,
      contestants: activeSeason.contestants,
      phases: activeSeason.phases.map((phase) => ({ phaseType: phase.phaseType })),
      portfolios: activeSeason.portfolios,
    },
    recentBids,
    totalSeasons,
    totalUsers,
    totalPlayers,
    readiness,
    weeklyOperations: {
      currentOpenPhaseName: currentOpenPhase?.name ?? currentOpenPhase?.phaseType ?? null,
      offeringPhaseToSettleId: offeringPhaseToSettle?.id ?? null,
      offeringPhaseToSettleName:
        offeringPhaseToSettle?.name ?? offeringPhaseToSettle?.phaseType ?? null,
      listingPhaseToSettleId: listingPhaseToSettle?.id ?? null,
      listingPhaseToSettleName:
        listingPhaseToSettle?.name ?? listingPhaseToSettle?.phaseType ?? null,
      nextWeekNumber,
      nextWeekIsAired: Boolean(nextWeekGame?.aired),
      pendingDividendWeek,
      pendingDividendCount,
      latestAiredWeek,
      loggedAchievementsForPendingWeek,
    },
  }
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
        <p className="text-muted-foreground">
          Manage preseason setup and weekly season operations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Players
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPlayers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Latest Aired Week
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.weeklyOperations.latestAiredWeek}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Launch Status
            </CardTitle>
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
                  {data.activeSeason.contestants.length} total, {" "}
                  {
                    data.activeSeason.contestants.filter((contestant) => contestant.isActive)
                      .length
                  } active
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Season Players</p>
                <p className="text-lg font-semibold">
                  {data.activeSeason.portfolios.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Configured Phases</p>
                <p className="text-lg font-semibold">
                  {data.activeSeason.phases.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Starting Salary</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(data.activeSeason.startingSalary)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>
              Create and activate a season to begin setup.
            </CardDescription>
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
          <CardDescription>
            Official-rules setup checklist before opening trading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ReadinessItem
              label="Active season selected"
              isReady={data.readiness.hasActiveSeason}
            />
            <ReadinessItem
              label="Contestants added"
              isReady={data.readiness.hasContestants}
            />
            <ReadinessItem
              label="Players enrolled in season"
              isReady={data.readiness.hasPortfolios}
            />
            <ReadinessItem
              label="Shares allocated"
              isReady={data.readiness.sharesAllocated}
            />
            <ReadinessItem
              label="Core phase schedule created"
              isReady={data.readiness.hasPhaseSchedule}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <form action={enrollPlayersToActiveSeason}>
              <Button type="submit" variant="outline" className="w-full">
                Enroll Players
              </Button>
            </form>
            <form action={allocateSharesForActiveSeason}>
              <Button type="submit" variant="outline" className="w-full">
                Allocate Shares
              </Button>
            </form>
            <form action={createDefaultPhasesForNextWeek}>
              <Button type="submit" variant="outline" className="w-full">
                Generate Next Week Phases
              </Button>
            </form>
            <form action={recalculateActiveSeasonPortfolios}>
              <Button type="submit" variant="outline" className="w-full">
                Recalculate Portfolios
              </Button>
            </form>
          </div>

          <p className="text-xs text-muted-foreground">
            Detailed runbook: <code>docs/admin-workflows.md</code> (repository file)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Runbook</CardTitle>
          <CardDescription>
            Control the week lifecycle: settle offerings, mark aired, and process dividends
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Current Open Phase</p>
              <p className="font-medium">
                {data.weeklyOperations.currentOpenPhaseName ?? "No open phase"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Next Week to Mark Aired</p>
              <p className="font-medium">Week {data.weeklyOperations.nextWeekNumber}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Pending Dividend Week</p>
              <p className="font-medium">
                {data.weeklyOperations.pendingDividendWeek
                  ? `Week ${data.weeklyOperations.pendingDividendWeek}`
                  : "None"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.weeklyOperations.pendingDividendCount} aired week(s) unprocessed
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Achievements Logged (Pending Week)
              </p>
              <p className="font-medium">
                {data.weeklyOperations.loggedAchievementsForPendingWeek}
              </p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
            <form action={settleCurrentOfferingPhase}>
              <input
                type="hidden"
                name="phaseId"
                value={data.weeklyOperations.offeringPhaseToSettleId ?? ""}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={!data.weeklyOperations.offeringPhaseToSettleId}
              >
                <Gavel className="mr-2 h-4 w-4" />
                Settle Offering
              </Button>
            </form>

            <form action={settleCurrentListingPhase}>
              <input
                type="hidden"
                name="phaseId"
                value={data.weeklyOperations.listingPhaseToSettleId ?? ""}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={!data.weeklyOperations.listingPhaseToSettleId}
              >
                Settle Listing
              </Button>
            </form>

            <form action={markWeekAired}>
              <input
                type="hidden"
                name="weekNumber"
                value={String(data.weeklyOperations.nextWeekNumber)}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={data.weeklyOperations.nextWeekIsAired}
              >
                Mark Week {data.weeklyOperations.nextWeekNumber} Aired
              </Button>
            </form>

            <form action={processWeekDividends}>
              <input
                type="hidden"
                name="weekNumber"
                value={String(data.weeklyOperations.pendingDividendWeek ?? "")}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={!data.weeklyOperations.pendingDividendWeek}
              >
                Process Pending Dividends
              </Button>
            </form>

            <form action={recalculateActiveSeasonPortfolios}>
              <Button type="submit" variant="outline" className="w-full">
                Refresh Standings
              </Button>
            </form>
          </div>

          <p className="text-xs text-muted-foreground">
            Offering phase to settle: {" "}
            {data.weeklyOperations.offeringPhaseToSettleName ?? "None"}
          </p>
          <p className="text-xs text-muted-foreground">
            Listing phase to settle: {" "}
            {data.weeklyOperations.listingPhaseToSettleName ?? "None"}
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
                  <p className="text-sm text-muted-foreground">
                    Create and edit seasons
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Add and update contestants
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Control trading windows
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Record weekly outcomes
                  </p>
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
                <div
                  key={bid.id}
                  className="flex items-center justify-between border-b py-2 text-sm last:border-0"
                >
                  <div>
                    <span className="font-medium">{bid.user.name}</span> bid on{" "}
                    <span className="font-medium">{bid.contestantName}</span>
                    <p className="text-muted-foreground">
                      {bid.phase?.name ?? bid.phase?.phaseType ?? "Phase"}
                    </p>
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
            <p className="py-4 text-center text-sm text-muted-foreground">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/players">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Players</CardTitle>
              <CardDescription>
                Manage accounts, balances, and admin access
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/dividends">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Dividends</CardTitle>
              <CardDescription>
                Process weekly payouts and verify totals
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/bids">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Bids</CardTitle>
              <CardDescription>
                Review and settle silent-auction bids
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                System overview and game rule reference
              </CardDescription>
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
