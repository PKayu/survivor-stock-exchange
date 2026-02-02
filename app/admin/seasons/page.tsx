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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import { Plus, Pencil, Trash2, Calendar } from "lucide-react"

async function getSeasonsData() {
  const seasons = await prisma.season.findMany({
    include: {
      _count: {
        select: {
          contestants: true,
          portfolios: true,
          phases: true,
        },
      },
    },
    orderBy: { startDate: "desc" },
  })

  return { seasons }
}

async function createSeason(formData: FormData) {
  "use server"

  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const name = formData.get("name") as string
  const startDate = formData.get("startDate") as string
  const startingSalary = parseFloat(formData.get("startingSalary") as string)

  if (!name || !startDate) {
    throw new Error("Name and start date are required")
  }

  await prisma.season.create({
    data: {
      name,
      startDate: new Date(startDate),
      startingSalary: startingSalary || 100,
    },
  })

  revalidatePath("/admin/seasons")
  revalidatePath("/admin/dashboard")
}

async function toggleSeasonStatus(formData: FormData) {
  "use server"

  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const seasonId = formData.get("seasonId") as string

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
  })

  if (!season) throw new Error("Season not found")

  // Deactivate all seasons first
  await prisma.season.updateMany({
    data: { isActive: false },
  })

  // Toggle this season
  await prisma.season.update({
    where: { id: seasonId },
    data: { isActive: !season.isActive },
  })

  revalidatePath("/admin/seasons")
  revalidatePath("/admin/dashboard")
}

async function deleteSeason(formData: FormData) {
  "use server"

  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const seasonId = formData.get("seasonId") as string

  await prisma.season.delete({
    where: { id: seasonId },
  })

  revalidatePath("/admin/seasons")
  revalidatePath("/admin/dashboard")
}

function CreateSeasonDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Season
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Season</DialogTitle>
          <DialogDescription>
            Create a new Survivor season for the stock exchange game.
          </DialogDescription>
        </DialogHeader>
        <form action={createSeason}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Season Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Survivor 47"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startingSalary">Starting Salary ($)</Label>
              <Input
                id="startingSalary"
                name="startingSalary"
                type="number"
                defaultValue={100}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Create Season</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

async function SeasonsPageContent() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard")
  }

  const data = await getSeasonsData()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seasons</h1>
          <p className="text-muted-foreground">Manage game seasons</p>
        </div>
        <CreateSeasonDialog />
      </div>

      {/* Seasons Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Seasons</CardTitle>
          <CardDescription>Manage and configure game seasons</CardDescription>
        </CardHeader>
        <CardContent>
          {data.seasons.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Contestants</TableHead>
                  <TableHead className="text-right">Players</TableHead>
                  <TableHead className="text-right">Phases</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.seasons.map((season) => (
                  <TableRow key={season.id}>
                    <TableCell className="font-medium">{season.name}</TableCell>
                    <TableCell>{formatDate(season.startDate)}</TableCell>
                    <TableCell>
                      {season.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{season._count.contestants}</TableCell>
                    <TableCell className="text-right">{season._count.portfolios}</TableCell>
                    <TableCell className="text-right">{season._count.phases}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <form action={toggleSeasonStatus}>
                          <input type="hidden" name="seasonId" value={season.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                          >
                            {season.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                        <form action={deleteSeason}>
                          <input type="hidden" name="seasonId" value={season.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
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
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No seasons created yet</p>
              <CreateSeasonDialog />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SeasonsPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Seasons</h1>
              <p className="text-muted-foreground">Loading seasons...</p>
            </div>
          </div>
        }
      >
        <SeasonsPageContent />
      </Suspense>
    </div>
  )
}
