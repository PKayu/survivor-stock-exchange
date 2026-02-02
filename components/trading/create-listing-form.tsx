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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface PortfolioStock {
  id: string
  contestantId: string
  shares: number
  averagePrice: number
  contestant: {
    id: string
    name: string
    currentPrice: number
    isActive: boolean
  }
}

interface CreateListingFormProps {
  stocks: PortfolioStock[]
  phaseId: string
}

export function CreateListingForm({ stocks, phaseId }: CreateListingFormProps) {
  const router = useRouter()
  const [contestantId, setContestantId] = useState("")
  const [shares, setShares] = useState(1)
  const [minimumPrice, setMinimumPrice] = useState(0)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const selectedStock = stocks.find((s) => s.contestant.id === contestantId)

  // Calculate expected sale price (50% of current value)
  const expectedSalePrice = selectedStock
    ? selectedStock.contestant.currentPrice * shares * 0.5
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!contestantId || shares < 1) {
      setError("Please select a contestant and enter valid shares")
      return
    }

    if (!selectedStock || shares > selectedStock.shares) {
      setError("Not enough shares")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId,
          contestantId,
          shares,
          minimumPrice,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create listing")
        return
      }

      router.refresh()
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

      {stocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You don't have any stocks to sell.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="contestant">Select Stock to Sell</Label>
            <Select
              value={contestantId}
              onValueChange={(value) => {
                setContestantId(value)
                const stock = stocks.find((s) => s.contestant.id === value)
                if (stock) {
                  setShares(1)
                  setMinimumPrice(Math.round(stock.contestant.currentPrice * 0.5 * 100) / 100)
                }
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="contestant">
                <SelectValue placeholder="Choose a contestant" />
              </SelectTrigger>
              <SelectContent>
                {stocks.map((stock) => (
                  <SelectItem key={stock.id} value={stock.contestant.id}>
                    {stock.contestant.name} ({stock.shares} shares @{" "}
                    {formatCurrency(stock.contestant.currentPrice)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStock && (
            <>
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Owned Shares</p>
                      <p className="font-medium">{selectedStock.shares}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Price</p>
                      <p className="font-medium">{formatCurrency(selectedStock.contestant.currentPrice)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="shares">Number of Shares to Sell</Label>
                <Input
                  id="shares"
                  type="number"
                  min="1"
                  max={selectedStock.shares}
                  value={shares}
                  onChange={(e) => setShares(Math.min(parseInt(e.target.value) || 1, selectedStock.shares))}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minPrice">Minimum Price per Share</Label>
                <Input
                  id="minPrice"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={minimumPrice}
                  onChange={(e) => setMinimumPrice(parseFloat(e.target.value) || 0)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Buyers must pay at least this amount per share
                </p>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Note:</strong> When selling stocks, you receive 50% of the current stock
                  value as per game rules. Expected proceeds:{" "}
                  {formatCurrency(expectedSalePrice)}
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                List {shares} {shares === 1 ? "Share" : "Shares"} for Sale
              </Button>
            </>
          )}
        </>
      )}
    </form>
  )
}
