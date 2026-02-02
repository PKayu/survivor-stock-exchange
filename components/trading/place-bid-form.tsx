"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Contestant {
  id: string
  name: string
  tribe: string | null
  currentPrice: number
}

interface Bid {
  contestantId: string
  shares: number
  bidPrice: number
}

interface ExistingBid {
  id: string
  contestantId: string
  shares: number
  bidPrice: number
  isAwarded: boolean
}

interface PlaceBidFormProps {
  contestants: Contestant[]
  phaseId: string
  existingBids: ExistingBid[]
  cashBalance: number
}

export function PlaceBidForm({
  contestants,
  phaseId,
  existingBids,
  cashBalance,
}: PlaceBidFormProps) {
  const router = useRouter()
  const [bids, setBids] = useState<Bid[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Get contestants that already have bids
  const bidContestantIds = new Set(existingBids.map((b) => b.contestantId))

  const availableContestants = contestants.filter(
    (c) => !bidContestantIds.has(c.id)
  )

  const addBid = () => {
    if (availableContestants.length > 0 && bids.length < availableContestants.length) {
      const remainingContestants = availableContestants.filter(
        (c) => !bids.some((b) => b.contestantId === c.id)
      )
      if (remainingContestants.length > 0) {
        setBids([
          ...bids,
          {
            contestantId: remainingContestants[0].id,
            shares: 1,
            bidPrice: remainingContestants[0].currentPrice,
          },
        ])
      }
    }
  }

  const removeBid = (index: number) => {
    setBids(bids.filter((_, i) => i !== index))
  }

  const updateBid = (index: number, field: keyof Bid, value: number | string) => {
    const newBids = [...bids]
    newBids[index] = { ...newBids[index], [field]: value }
    setBids(newBids)
  }

  const getTotalCost = () => {
    return bids.reduce((sum, bid) => sum + bid.shares * bid.bidPrice, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const totalCost = getTotalCost()

    if (totalCost > cashBalance) {
      setError(`Insufficient funds. Total cost: ${formatCurrency(totalCost)}, Available: ${formatCurrency(cashBalance)}`)
      return
    }

    if (bids.length === 0) {
      setError("Please add at least one bid")
      return
    }

    setIsLoading(true)

    try {
      // Submit each bid
      const promises = bids.map((bid) =>
        fetch("/api/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phaseId,
            contestantId: bid.contestantId,
            shares: bid.shares,
            bidPrice: bid.bidPrice,
          }),
        })
      )

      const results = await Promise.all(promises)

      if (results.every((r) => r.ok)) {
        router.refresh()
      } else {
        setError("Some bids failed. Please try again.")
      }
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {bids.length === 0 ? (
        <Button type="button" onClick={addBid} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Bid
        </Button>
      ) : (
        <div className="space-y-3">
          {bids.map((bid, index) => {
            const contestant = contestants.find((c) => c.id === bid.contestantId)
            return (
              <Card key={index}>
                <CardContent className="py-4">
                  <div className="grid gap-4 md:grid-cols-[2fr,1fr,1fr,auto] items-end">
                    <div className="space-y-2">
                      <Label>Contestant</Label>
                      <Select
                        value={bid.contestantId}
                        onValueChange={(value) => updateBid(index, "contestantId", value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableContestants
                            .filter((c) => !bids.some((b, i) => b.contestantId === c.id && i !== index))
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Shares</Label>
                      <Input
                        type="number"
                        min="1"
                        value={bid.shares}
                        onChange={(e) => updateBid(index, "shares", parseInt(e.target.value) || 1)}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Bid Price</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={bid.bidPrice}
                        onChange={(e) => updateBid(index, "bidPrice", parseFloat(e.target.value) || 0)}
                        disabled={isLoading}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBid(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {contestant && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {contestant.name}: {bid.shares} shares @ {formatCurrency(bid.bidPrice)} ={" "}
                      <strong>{formatCurrency(bid.shares * bid.bidPrice)}</strong>
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}

          <div className="flex gap-2 flex-wrap">
            {bids.length < availableContestants.length && (
              <Button type="button" onClick={addBid} variant="outline" disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Another Bid
              </Button>
            )}

            <Button type="submit" disabled={isLoading} className="ml-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Bids ({formatCurrency(getTotalCost())})
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Available cash: {formatCurrency(cashBalance)}
          </div>
        </div>
      )}
    </form>
  )
}
