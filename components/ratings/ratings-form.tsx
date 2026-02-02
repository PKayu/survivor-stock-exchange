"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { StarIcon } from "lucide-react"

interface Contestant {
  id: string
  name: string
  tribe: string | null
}

interface ExistingRating {
  contestantId: string
  rating: number
}

interface RatingsFormProps {
  contestants: Contestant[]
  weekNumber: number
  existingRatings: ExistingRating[]
  onSubmit: (formData: FormData) => Promise<void>
}

export function RatingsForm({
  contestants,
  weekNumber,
  existingRatings,
  onSubmit,
}: RatingsFormProps) {
  const router = useRouter()
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(existingRatings.map((r) => [r.contestantId, r.rating]))
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedCount, setSubmittedCount] = useState(new Set(existingRatings.map((r) => r.contestantId)))

  const handleRating = async (contestantId: string, rating: number) => {
    if (isSubmitting) return

    setRatings((prev) => ({ ...prev, [contestantId]: rating }))
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("contestantId", contestantId)
    formData.append("rating", rating.toString())
    formData.append("weekNumber", weekNumber.toString())

    await onSubmit(formData)

    setSubmittedCount((prev) => new Set(prev).add(contestantId))
    setIsSubmitting(false)
  }

  const getRatingColor = (rating: number) => {
    if (rating <= 3) return "text-red-500"
    if (rating <= 5) return "text-orange-500"
    if (rating <= 7) return "text-yellow-500"
    return "text-green-500"
  }

  return (
    <div className="space-y-3">
      {contestants.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No active contestants to rate
        </p>
      ) : (
        contestants.map((contestant) => {
          const currentRating = ratings[contestant.id]
          const isRated = submittedCount.has(contestant.id)

          return (
            <Card key={contestant.id} className={!isRated ? "border-muted" : ""}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="font-medium">{contestant.name}</Label>
                      {isRated && (
                        <span className="text-xs text-muted-foreground">(Rated)</span>
                      )}
                    </div>
                    {contestant.tribe && (
                      <span className="text-xs text-muted-foreground">{contestant.tribe}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleRating(contestant.id, value)}
                        disabled={isSubmitting}
                        className="focus:outline-none focus:ring-2 focus:ring-primary rounded-sm transition-transform hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
                        aria-label={`Rate ${contestant.name} ${value} stars`}
                      >
                        <StarIcon
                          className={`h-5 w-5 ${
                            currentRating && value <= currentRating
                              ? `fill-current ${getRatingColor(currentRating)}`
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {currentRating && (
                    <span className={`text-sm font-semibold min-w-[2rem] text-right ${getRatingColor(currentRating)}`}>
                      {currentRating}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}

      <div className="pt-2 text-xs text-muted-foreground">
        {submittedCount.size} of {contestants.length} contestants rated
      </div>
    </div>
  )
}
