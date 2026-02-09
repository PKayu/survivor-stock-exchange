import { Suspense } from "react"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { StarIcon } from "lucide-react"
import { RatingsForm } from "@/components/ratings/ratings-form"

async function getRatingsData(userId: string) {
  // Get active season
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      contestants: {
        orderBy: { name: "asc" },
      },
    },
  })

  if (!activeSeason) {
    return { season: null, contestants: [], existingRatings: [], currentWeek: 1 }
  }

  // Get current week from latest aired game
  const latestGame = await prisma.game.findFirst({
    where: { seasonId: activeSeason.id, aired: true },
    orderBy: { episodeNumber: "desc" },
  })

  const currentWeek = (latestGame?.episodeNumber ?? 0) + 1

  // Get user's existing ratings for this week
  const existingRatings = await prisma.rating.findMany({
    where: {
      userId,
      contestantId: { in: activeSeason.contestants.map((c) => c.id) },
      weekNumber: currentWeek,
    },
  })

  const ratingsMap = new Map(existingRatings.map((r) => [r.contestantId, r.rating]))

  // Get all user's ratings history
  const allRatings = await prisma.rating.findMany({
    where: {
      userId,
      contestantId: { in: activeSeason.contestants.map((c) => c.id) },
    },
    include: { contestant: true },
    orderBy: [{ weekNumber: "desc" }, { createdAt: "desc" }],
  })

  return {
    season: activeSeason,
    contestants: activeSeason.contestants.map((c) => ({
      ...c,
      currentRating: ratingsMap.get(c.id),
    })),
    existingRatings,
    allRatings,
    currentWeek,
  }
}

async function submitRating(formData: FormData) {
  "use server"

  const session = await auth()

  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const contestantId = formData.get("contestantId") as string
  const rating = parseInt(formData.get("rating") as string)
  const weekNumber = parseInt(formData.get("weekNumber") as string)

  if (rating < 1 || rating > 10) {
    throw new Error("Rating must be between 1 and 10")
  }

  // Check contestant is active
  const contestant = await prisma.contestant.findUnique({
    where: { id: contestantId },
  })

  if (!contestant || !contestant.isActive) {
    throw new Error("Cannot rate eliminated contestants")
  }

  // Upsert rating
  await prisma.rating.upsert({
    where: {
      userId_contestantId_weekNumber: {
        userId: session.user.id,
        contestantId,
        weekNumber,
      },
    },
    update: { rating },
    create: {
      userId: session.user.id,
      contestantId,
      weekNumber,
      rating,
    },
  })

  // Recalculate stock price
  const allRatings = await prisma.rating.findMany({
    where: { contestantId, weekNumber },
    select: { rating: true },
  })

  const values = allRatings.map((r) => r.rating).sort((a, b) => a - b)
  const mid = Math.floor(values.length / 2)
  const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2

  await prisma.stockPrice.upsert({
    where: {
      contestantId_weekNumber: {
        contestantId,
        weekNumber,
      },
    },
    update: { price: median },
    create: {
      contestantId,
      weekNumber,
      price: median,
    },
  })

  revalidatePath("/ratings")
  revalidatePath("/trade")
  revalidatePath("/dashboard")
}

async function RatingsPageContent() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const data = await getRatingsData(session.user.id)

  if (!data.season) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>
              There are no active Survivor seasons at the moment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { contestants, allRatings, currentWeek } = data

  // Group ratings by week
  const ratingsByWeek = new Map<number, typeof allRatings>()
  for (const rating of allRatings) {
    if (!ratingsByWeek.has(rating.weekNumber)) {
      ratingsByWeek.set(rating.weekNumber, [])
    }
    ratingsByWeek.get(rating.weekNumber)!.push(rating)
  }

  const activeContestants = contestants.filter((c) => c.isActive)
  const eliminatedContestants = contestants.filter((c) => !c.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Contestant Ratings</h1>
        <p className="text-muted-foreground">
          Rate contestants 1-10 to determine stock prices for Week {currentWeek}
        </p>
      </div>

      <Alert>
        <StarIcon className="h-4 w-4" />
        <AlertDescription>
          Stock prices are calculated as the <strong>median</strong> of all player ratings.
          Submit your ratings each week to influence the market!
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ratings Form */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Ratings - Week {currentWeek}</CardTitle>
            <CardDescription>
              Rate active contestants. Eliminated contestants cannot be rated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RatingsForm
              contestants={activeContestants}
              weekNumber={currentWeek}
              existingRatings={contestants
                .filter((c) => c.currentRating)
                .map((c) => ({ contestantId: c.id, rating: c.currentRating! }))}
              onSubmit={submitRating}
            />
          </CardContent>
        </Card>

        {/* Ratings History */}
        <Card>
          <CardHeader>
            <CardTitle>Your Rating History</CardTitle>
            <CardDescription>Your previous ratings this season</CardDescription>
          </CardHeader>
          <CardContent>
            {ratingsByWeek.size > 0 ? (
              <div className="space-y-4">
                {Array.from(ratingsByWeek.entries())
                  .sort((a, b) => b[0] - a[0])
                  .map(([week, ratings]) => (
                    <div key={week}>
                      <h4 className="text-sm font-medium mb-2">Week {week}</h4>
                      <div className="space-y-1">
                        {ratings.slice(0, 5).map((rating) => (
                          <div
                            key={rating.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{rating.contestant.name}</span>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <StarIcon className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {rating.rating}
                            </Badge>
                          </div>
                        ))}
                        {ratings.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            +{ratings.length - 5} more
                          </p>
                        )}
                      </div>
                      {week !== Array.from(ratingsByWeek.keys()).sort((a, b) => b - a)[0] && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No ratings submitted yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Eliminated Contestants */}
      {eliminatedContestants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eliminated Contestants</CardTitle>
            <CardDescription>
              These contestants have been eliminated and cannot be rated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {eliminatedContestants.map((c) => (
                <Badge key={c.id} variant="secondary" className="px-3 py-1">
                  {c.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function RatingsPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Contestant Ratings</h1>
              <p className="text-muted-foreground">Loading ratings...</p>
            </div>
            <Card>
              <CardContent className="py-12">
                <div className="h-8 bg-muted animate-pulse rounded w-48" />
              </CardContent>
            </Card>
          </div>
        }
      >
        <RatingsPageContent />
      </Suspense>
    </div>
  )
}
