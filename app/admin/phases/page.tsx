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
import { formatDate, formatDateTime, isPhaseOpen } from "@/lib/utils"
import { PHASE_NAMES } from "@/types"
import { Plus, Clock, Play, Pause } from "lucide-react"

async function getPhasesData() {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      phases: {
        orderBy: { startDate: "desc" },
      },
    },
  })

  if (!activeSeason) {
    return { season: null, phases: [] }
  }

  return { season: activeSeason, phases: activeSeason.phases }
}

async function createPhase(formData: FormData) {
  "use server"

  const session = await auth()

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
    throw new Error("No active season")
  }

  const phaseType = formData.get("phaseType") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const weekNumber = parseInt(formData.get("weekNumber") as string)
  const name = formData.get("name") as string

  if (!phaseType || !startDate) {
    throw new Error("Phase type and start date are required")
  }

  await prisma.phase.create({
    data: {
      seasonId: activeSeason.id,
      phaseType: phaseType as any,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      weekNumber: weekNumber || 1,
      name: name || null,
    },
  })

  revalidatePath("/admin/phases")
  revalidatePath("/trade")
}

async function togglePhaseStatus(formData: FormData) {
  "use server"

  const session = await auth()

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const phaseId = formData.get("phaseId") as string

  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
  })

  if (phase) {
    await prisma.phase.update({
      where: { id: phaseId },
      data: {
        isOpen: !phase.isOpen,
        isManuallyOverridden: true,
      },
    })
  }

  revalidatePath("/admin/phases")
  revalidatePath("/trade")
}

async function deletePhase(formData: FormData) {
  "use server"

  const session = await auth()

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const phaseId = formData.get("phaseId") as string

  await prisma.phase.delete({
    where: { id: phaseId },
  })

  revalidatePath("/admin/phases")
}

function CreatePhaseDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Phase
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Trading Phase</DialogTitle>
          <DialogDescription>
            Create a new trading phase for the active season.
          </DialogDescription>
        </DialogHeader>
        <form action={createPhase}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phaseType">Phase Type</Label>
              <Select name="phaseType" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INITIAL_OFFERING">Initial Offering</SelectItem>
                  <SelectItem value="SECOND_OFFERING">Second Offering</SelectItem>
                  <SelectItem value="FIRST_LISTING">First Listing</SelectItem>
                  <SelectItem value="SECOND_LISTING">Second Listing</SelectItem>
                  <SelectItem value="GAME_DAY">Game Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekNumber">Week Number</Label>
              <Input
                id="weekNumber"
                name="weekNumber"
                type="number"
                defaultValue={1}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Phase Name (Optional)</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Week 1 Trading"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="datetime-local"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Create Phase</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

async function PhasesPageContent() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard")
  }

  const data = await getPhasesData()

  if (!data.season) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>
              Create a season first before adding phases.
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Phases</h1>
          <p className="text-muted-foreground">
            Season: {data.season.name} • {data.phases.length} phases
          </p>
        </div>
        <CreatePhaseDialog />
      </div>

      {/* Phases Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Phases</CardTitle>
          <CardDescription>Manage trading phases and schedules</CardDescription>
        </CardHeader>
        <CardContent>
          {data.phases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.phases.map((phase) => {
                  const open = isPhaseOpen(phase)
                  return (
                    <TableRow key={phase.id}>
                      <TableCell className="font-medium">{phase.name || PHASE_NAMES[phase.phaseType]}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{PHASE_NAMES[phase.phaseType]}</Badge>
                      </TableCell>
                      <TableCell>{phase.weekNumber}</TableCell>
                      <TableCell>{formatDateTime(phase.startDate)}</TableCell>
                      <TableCell>{phase.endDate ? formatDateTime(phase.endDate) : "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {phase.isManuallyOverridden && (
                            <Badge variant="secondary" className="text-xs">Manual</Badge>
                          )}
                          {open ? (
                            <Badge variant="default" className="bg-green-600">Open</Badge>
                          ) : (
                            <Badge variant="secondary">Closed</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <form action={togglePhaseStatus}>
                            <input type="hidden" name="phaseId" value={phase.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                            >
                              {open ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          </form>
                          <form action={deletePhase}>
                            <input type="hidden" name="phaseId" value={phase.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                            >
                              ×
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No phases created yet</p>
              <CreatePhaseDialog />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase Info Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">About Phases</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-2">
            <li><strong>Initial/Second Offering:</strong> Silent auction phases where players place bids</li>
            <li><strong>First/Second Listing:</strong> Open trading where players can buy and sell stocks</li>
            <li><strong>Game Day:</strong> Episode airs - all trading is closed</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PhasesPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Trading Phases</h1>
              <p className="text-muted-foreground">Loading phases...</p>
            </div>
          </div>
        }
      >
        <PhasesPageContent />
      </Suspense>
    </div>
  )
}
