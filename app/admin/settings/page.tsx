import { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings } from "lucide-react"

async function getSettingsData() {
  const totalUsers = await prisma.user.count()
  const adminUsers = await prisma.user.count({ where: { isAdmin: true } })
  const totalSeasons = await prisma.season.count()
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  return {
    totalUsers,
    adminUsers,
    totalSeasons,
    activeSeason,
  }
}

async function SettingsPageContent() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard")
  }

  const data = await getSettingsData()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Game configuration and system settings</p>
      </div>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>Current game configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Users</h3>
              <div className="text-2xl font-bold">{data.totalUsers}</div>
              <p className="text-sm text-muted-foreground">{data.adminUsers} administrators</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Seasons</h3>
              <div className="text-2xl font-bold">{data.totalSeasons}</div>
              <p className="text-sm text-muted-foreground">
                {data.activeSeason ? `Active: ${data.activeSeason.name}` : "No active season"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Rules Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Game Rules Reference</CardTitle>
          <CardDescription>Current game rules and multipliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Starting Balance</h4>
              <p className="text-sm text-muted-foreground">$100 per player</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Stock Allocation Formula</h4>
              <p className="text-sm text-muted-foreground">
                (Players × $100) / (Contestants × 2) shares per contestant
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Stock Pricing</h4>
              <p className="text-sm text-muted-foreground">
                Median of all player ratings (1-10 scale)
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Selling Penalty</h4>
              <p className="text-sm text-muted-foreground">
                50% of current stock value when selling
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Max Cash at Close</h4>
              <p className="text-sm text-muted-foreground">
                $20 maximum when exchange closes
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Dividend Multipliers</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span>Reward</span>
                  <span className="font-medium">$0.05/share</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span>Hidden Idol</span>
                  <span className="font-medium">$0.05/share</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span>Tribal Immunity</span>
                  <span className="font-medium">$0.10/share</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span>Individual Immunity</span>
                  <span className="font-medium">$0.15/share</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Winning Condition</h4>
              <p className="text-sm text-muted-foreground">
                Most shares of the winning contestant wins.
                Tie-breaker: most cash on hand.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Account</CardTitle>
          <CardDescription>Currently logged in as admin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{session.user.name}</p>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
            </div>
            <Badge variant="secondary">Admin</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Loading settings...</p>
            </div>
          </div>
        }
      >
        <SettingsPageContent />
      </Suspense>
    </div>
  )
}
