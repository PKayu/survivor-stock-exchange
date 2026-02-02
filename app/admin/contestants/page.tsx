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
import { Plus, Trash2, UserX, Users } from "lucide-react"

async function getContestantsData() {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      contestants: {
        orderBy: { name: "asc" },
      },
    },
  })

  if (!activeSeason) {
    return { season: null, contestants: [] }
  }

  return { season: activeSeason, contestants: activeSeason.contestants }
}

async function addContestant(formData: FormData) {
  "use server"

  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
    throw new Error("No active season")
  }

  const name = formData.get("name") as string
  const tribe = formData.get("tribe") as string

  if (!name) {
    throw new Error("Name is required")
  }

  await prisma.contestant.create({
    data: {
      seasonId: activeSeason.id,
      name,
      tribe: tribe || null,
    },
  })

  revalidatePath("/admin/contestants")
  revalidatePath("/contestants")
}

async function eliminateContestant(formData: FormData) {
  "use server"

  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const contestantId = formData.get("contestantId") as string

  await prisma.contestant.update({
    where: { id: contestantId },
    data: {
      isActive: false,
      eliminatedAt: new Date(),
    },
  })

  // Set their stock price to 0
  const contestant = await prisma.contestant.findUnique({
    where: { id: contestantId },
  })

  if (contestant) {
    const latestPrice = await prisma.stockPrice.findFirst({
      where: { contestantId },
      orderBy: { weekNumber: "desc" },
    })

    if (latestPrice) {
      await prisma.stockPrice.update({
        where: { id: latestPrice.id },
        data: { price: 0 },
      })
    }
  }

  revalidatePath("/admin/contestants")
  revalidatePath("/contestants")
  revalidatePath("/dashboard")
  revalidatePath("/portfolio")
}

async function deleteContestant(formData: FormData) {
  "use server"

  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const contestantId = formData.get("contestantId") as string

  await prisma.contestant.delete({
    where: { id: contestantId },
  })

  revalidatePath("/admin/contestants")
  revalidatePath("/contestants")
}

async function setWinner(formData: FormData) {
  "use server"

  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const contestantId = formData.get("contestantId") as string

  // Unset any existing winner
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  if (activeSeason) {
    await prisma.contestant.updateMany({
      where: { seasonId: activeSeason.id },
      data: { isWinner: false },
    })
  }

  // Set new winner
  await prisma.contestant.update({
    where: { id: contestantId },
    data: { isWinner: true },
  })

  revalidatePath("/admin/contestants")
  revalidatePath("/standings")
}

function AddContestantDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Contestant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contestant</DialogTitle>
          <DialogDescription>
            Add a new contestant to the active season.
          </DialogDescription>
        </DialogHeader>
        <form action={addContestant}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contestant Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Jane Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tribe">Tribe</Label>
              <Input
                id="tribe"
                name="tribe"
                placeholder="e.g., Lava, Vati, Taku"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Contestant</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

async function ContestantsPageContent() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard")
  }

  const data = await getContestantsData()

  if (!data.season) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>
              Create a season first before adding contestants.
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

  const activeCount = data.contestants.filter((c) => c.isActive).length
  const tribes = [...new Set(data.contestants.map((c: any) => c.tribe).filter(Boolean))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contestants</h1>
          <p className="text-muted-foreground">
            Season: {data.season.name} • {activeCount} active
          </p>
        </div>
        <AddContestantDialog />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Contestants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.contestants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Contestants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tribes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tribes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Contestants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Contestants</CardTitle>
          <CardDescription>Manage contestants and track eliminations</CardDescription>
        </CardHeader>
        <CardContent>
          {data.contestants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tribe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Shares</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.contestants.map((contestant: any) => (
                  <TableRow key={contestant.id}>
                    <TableCell className="font-medium">
                      {contestant.name}
                      {contestant.isWinner && (
                        <Badge className="ml-2" variant="default">Winner</Badge>
                      )}
                    </TableCell>
                    <TableCell>{contestant.tribe ?? "-"}</TableCell>
                    <TableCell>
                      {contestant.isActive ? (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Eliminated</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{contestant.totalShares}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {contestant.isActive && (
                          <form action={eliminateContestant}>
                            <input type="hidden" name="contestantId" value={contestant.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              title="Eliminate"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </form>
                        )}
                        {!contestant.isWinner && contestant.isActive && (
                          <form action={setWinner}>
                            <input type="hidden" name="contestantId" value={contestant.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              title="Set as Winner"
                            >
                              👑
                            </Button>
                          </form>
                        )}
                        <form action={deleteContestant}>
                          <input type="hidden" name="contestantId" value={contestant.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No contestants added yet</p>
              <AddContestantDialog />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ContestantsPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Contestants</h1>
              <p className="text-muted-foreground">Loading contestants...</p>
            </div>
          </div>
        }
      >
        <ContestantsPageContent />
      </Suspense>
    </div>
  )
}
