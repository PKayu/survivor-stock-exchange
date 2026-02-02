import { Suspense } from "react"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { ACHIEVEMENT_NAMES } from "@/types"
type AchievementType = "REWARD" | "HIDDEN_IDOL" | "TRIBAL_IMMUNITY" | "INDIVIDUAL_IMMUNITY"
import { Plus, Trophy } from "lucide-react"

async function getAchievementsData() {
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
    return { season: null, contestants: [], achievements: [] }
  }

  const achievements = await prisma.achievement.findMany({
    where: {
      contestant: { seasonId: activeSeason.id },
    },
    include: { contestant: true },
    orderBy: [
      { weekNumber: "desc" },
      { createdAt: "desc" },
    ],
    take: 50,
  })

  return { season: activeSeason, contestants: activeSeason.contestants, achievements }
}

async function logAchievement(formData: FormData) {
  "use server"

  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const contestantId = formData.get("contestantId") as string
  const weekNumber = parseInt(formData.get("weekNumber") as string)
  const achievementType = formData.get("achievementType") as AchievementType

  if (!contestantId || !weekNumber || !achievementType) {
    throw new Error("Missing required fields")
  }

  const multiplier = ACHIEVEMENT_NAMES[achievementType].multiplier

  await prisma.achievement.create({
    data: {
      contestantId,
      weekNumber,
      achievementType,
      multiplier,
    },
  })

  revalidatePath("/admin/achievements")
  revalidatePath("/portfolio")
}

async function deleteAchievement(formData: FormData) {
  "use server"

  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const achievementId = formData.get("achievementId") as string

  await prisma.achievement.delete({
    where: { id: achievementId },
  })

  revalidatePath("/admin/achievements")
}

function LogAchievementDialog({
  contestants,
  currentWeek,
}: {
  contestants: Array<{ id: string; name: string; tribe: string | null }>
  currentWeek: number
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Log Achievement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Contestant Achievement</DialogTitle>
          <DialogDescription>
            Record achievements that will trigger dividend payouts.
          </DialogDescription>
        </DialogHeader>
        <form action={logAchievement}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contestantId">Contestant</Label>
              <Select name="contestantId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contestant" />
                </SelectTrigger>
                <SelectContent>
                  {contestants.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.tribe && `(${c.tribe})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="achievementType">Achievement Type</Label>
              <Select name="achievementType" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select achievement type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACHIEVEMENT_NAMES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.name} (${value.multiplier}/share)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Dividend Impact:</p>
              <p className="text-muted-foreground">
                Each achievement adds to the dividend payout. Players owning shares of this contestant
                will receive the multiplier amount per share they own.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Log Achievement</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

async function AchievementsPageContent() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard")
  }

  const data = await getAchievementsData()

  if (!data.season) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>
              Create a season first before logging achievements.
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

  // Get current week from latest game
  const latestGame = await prisma.game.findFirst({
    where: { seasonId: data.season.id, aired: true },
    orderBy: { episodeNumber: "desc" },
  })
  const currentWeek = (latestGame?.episodeNumber ?? 0) + 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-muted-foreground">
            Season: {data.season.name} • Week {currentWeek}
          </p>
        </div>
        <LogAchievementDialog contestants={data.contestants} currentWeek={currentWeek} />
      </div>

      {/* Achievement Types Reference */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(ACHIEVEMENT_NAMES).map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardDescription>{value.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">${value.multiplier}/share</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievements Log */}
      <Card>
        <CardHeader>
          <CardTitle>Achievement Log</CardTitle>
          <CardDescription>Recorded achievements for dividend payouts</CardDescription>
        </CardHeader>
        <CardContent>
          {data.achievements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contestant</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Achievement</TableHead>
                  <TableHead className="text-right">Multiplier</TableHead>
                  <TableHead>Date Logged</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.achievements.map((achievement: any) => (
                  <TableRow key={achievement.id}>
                    <TableCell className="font-medium">{achievement.contestant.name}</TableCell>
                    <TableCell>{achievement.weekNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ACHIEVEMENT_NAMES[achievement.achievementType].name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">${achievement.multiplier}/share</TableCell>
                    <TableCell>{new Date(achievement.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <form action={deleteAchievement}>
                        <input type="hidden" name="achievementId" value={achievement.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                        >
                          Delete
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No achievements logged yet</p>
              <LogAchievementDialog contestants={data.contestants} currentWeek={currentWeek} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">How Achievements Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            When a contestant achieves something significant (winning immunity, finding an idol, etc.),
            log it here. At the end of each week, dividends are calculated and paid out to all players
            who own stock in contestants with achievements. Each achievement type has a different
            multiplier that determines the dividend amount per share.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AchievementsPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Achievements</h1>
              <p className="text-muted-foreground">Loading achievements...</p>
            </div>
          </div>
        }
      >
        <AchievementsPageContent />
      </Suspense>
    </div>
  )
}
