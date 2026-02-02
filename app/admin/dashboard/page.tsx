import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { Users, DollarSign, TrendingUp, Settings, Calendar } from "lucide-react"

async function getAdminDashboardData() {
  // Get active season
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      contestants: true,
      phases: { where: { isOpen: true } },
      portfolios: { include: { user: true } },
    },
  })

  // Get recent activity
  const recentBids = await prisma.bid.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  // Get all seasons count
  const totalSeasons = await prisma.season.count()
  const totalUsers = await prisma.user.count()

  return {
    activeSeason,
    recentBids,
    totalSeasons,
    totalUsers,
  }
}

async function AdminDashboardContent() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard")
  }

  const data = await getAdminDashboardData()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your Survivor Stock Exchange game</p>
      </div>

      {/* Quick Stats */}
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
              Total Seasons
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSeasons}</div>
          </CardContent>
        </Card>

        {data.activeSeason && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Players
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.activeSeason.portfolios.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Money
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    data.activeSeason.portfolios.reduce((sum, p) => sum + p.netWorth, 0)
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Active Season Info */}
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
                  {data.activeSeason.contestants.length} total,{" "}
                  {data.activeSeason.contestants.filter((c) => c.isActive).length} active
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Starting Salary</p>
                <p className="text-lg font-semibold">{formatCurrency(data.activeSeason.startingSalary)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Phases</p>
                <p className="text-lg font-semibold">{data.activeSeason.phases.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="text-lg font-semibold">
                  {new Date(data.activeSeason.startDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>Create a season to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/seasons">
              <Button>Create Season</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/seasons">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
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
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Manage Contestants</p>
                  <p className="text-sm text-muted-foreground">Add contestants and tribes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/phases">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Manage Phases</p>
                  <p className="text-sm text-muted-foreground">Control trading phases</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/achievements">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Log Achievements</p>
                  <p className="text-sm text-muted-foreground">Record immunity and idols</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest bids and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentBids.length > 0 ? (
            <div className="space-y-3">
              {data.recentBids.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{bid.user.name}</span> bid on{" "}
                    <span className="font-medium">Bid: #{bid.contestantId.substring(0, 6)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>
                      {bid.shares} shares @ {formatCurrency(bid.bidPrice)}
                    </span>
                    <Badge variant={bid.isAwarded ? "default" : "secondary"}>
                      {bid.isAwarded ? "Filled" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
          )}
        </CardContent>
      </Card>

      {/* Admin Links Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/players">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Players</CardTitle>
              <CardDescription>Manage player accounts and adjust balances</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/dividends">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Dividends</CardTitle>
              <CardDescription>Process dividend payouts</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/bids">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Bids</CardTitle>
              <CardDescription>View and settle silent auction bids</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure game settings and parameters</CardDescription>
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
