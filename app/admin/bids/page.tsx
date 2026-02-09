import { Suspense } from "react"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { settleBids } from "@/lib/calculations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Gavel, AlertCircle } from "lucide-react"

async function getBidsData() {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
    return { season: null, bids: [], currentPhase: null }
  }

  // Get current phase
  const now = new Date()
  const currentPhase = await prisma.phase.findFirst({
    where: {
      seasonId: activeSeason.id,
      isOpen: true,
      startDate: { lte: now },
    },
    orderBy: { startDate: "desc" },
  })

  // Get all bids for the season, grouped by phase
  const bids = await prisma.bid.findMany({
    where: {
      phase: { seasonId: activeSeason.id },
    },
    include: {
      user: { select: { id: true, name: true } },
      phase: true,
    },
    orderBy: [
      { phase: { startDate: "desc" } },
      { bidPrice: "desc" },
    ],
  })

  return { season: activeSeason, currentPhase, bids }
}

async function settlePhaseBids(formData: FormData) {
  "use server"

  const session = await auth()

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const phaseId = formData.get("phaseId") as string

  if (!phaseId) {
    throw new Error("Phase ID is required")
  }

  await settleBids(phaseId)

  revalidatePath("/admin/bids")
  revalidatePath("/dashboard")
  revalidatePath("/portfolio")
  revalidatePath("/trade")
}

async function deleteBid(formData: FormData) {
  "use server"

  const session = await auth()

  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const bidId = formData.get("bidId") as string

  await prisma.bid.delete({
    where: { id: bidId },
  })

  revalidatePath("/admin/bids")
  revalidatePath("/trade")
}

async function BidsPageContent() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!session.user.isAdmin) {
    redirect("/dashboard")
  }

  const data = await getBidsData()

  if (!data.season) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>
              Create a season first before managing bids.
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

  // Group bids by contestant within each phase
  const bidsByContestant = new Map<string, typeof data.bids>()
  for (const bid of data.bids) {
    const key = `${bid.phaseId}-${bid.contestantId}`
    if (!bidsByContestant.has(key)) {
      bidsByContestant.set(key, [])
    }
    bidsByContestant.get(key)!.push(bid)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bid Management</h1>
        <p className="text-muted-foreground">
          Season: {data.season.name}
        </p>
      </div>

      {/* Current Phase Actions */}
      {data.currentPhase && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Phase: {data.currentPhase.name}</CardTitle>
                <CardDescription>
                  {data.currentPhase.phaseType === "INITIAL_OFFERING" ||
                   data.currentPhase.phaseType === "SECOND_OFFERING"
                    ? "Silent auction in progress - settle bids when ready"
                    : "View bids from completed auctions"}
                </CardDescription>
              </div>
              {(data.currentPhase.phaseType === "INITIAL_OFFERING" ||
                data.currentPhase.phaseType === "SECOND_OFFERING") && (
                <form action={settlePhaseBids}>
                  <input type="hidden" name="phaseId" value={data.currentPhase.id} />
                  <Button type="submit">
                    <Gavel className="h-4 w-4 mr-2" />
                    Settle Bids
                  </Button>
                </form>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Bids List */}
      <Card>
        <CardHeader>
          <CardTitle>All Bids</CardTitle>
          <CardDescription>
            Silent auction bids
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.bids.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Contestant ID</TableHead>
                  <TableHead>Phase ID</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Bid Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bids
                  .sort((a: any, b: any) => b.bidPrice - a.bidPrice || a.createdAt.getTime() - b.createdAt.getTime())
                  .map((bid: any) => (
                    <TableRow key={bid.id}>
                      <TableCell className="font-medium">{bid.user?.name ?? "Unknown"}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {bid.contestantId.substring(0, 8)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {bid.phaseId.substring(0, 8)}
                      </TableCell>
                      <TableCell className="text-right">{bid.shares}</TableCell>
                      <TableCell className="text-right">{formatCurrency(bid.bidPrice)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bid.shares * bid.bidPrice)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bid.isAwarded ? "default" : "secondary"}>
                          {bid.isAwarded ? "Awarded" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!bid.isAwarded && (
                          <form action={deleteBid}>
                            <input type="hidden" name="bidId" value={bid.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                            >
                              Delete
                            </Button>
                          </form>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Gavel className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No bids placed yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bid Settlement Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Bid Settlement Process
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="mb-2">
            When you settle bids for a phase, the system processes all silent auction bids:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Bids are grouped by contestant</li>
            <li>Bids are sorted by price (highest first), then by time of submission</li>
            <li>Shares are awarded to highest bidders until stock runs out</li>
            <li>Player cash is deducted for awarded bids</li>
            <li>Portfolio values are recalculated</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BidsPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Bid Management</h1>
              <p className="text-muted-foreground">Loading bids...</p>
            </div>
          </div>
        }
      >
        <BidsPageContent />
      </Suspense>
    </div>
  )
}
