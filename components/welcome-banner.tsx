"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Sparkles, X } from "lucide-react"

interface WelcomeBannerProps {
  onDismiss: () => Promise<void>
}

export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDismiss = () => {
    startTransition(async () => {
      await onDismiss()
    })
  }

  return (
    <>
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                  Welcome to Survivor Stock Exchange!
                </h3>
                <Badge variant="secondary" className="text-xs">New Player</Badge>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Build the most valuable portfolio by investing in Survivor contestants. Learn how to play below!
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowHowToPlay(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  How to Play
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  disabled={isPending}
                  className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                >
                  Got it!
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              disabled={isPending}
              className="flex-shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 disabled:opacity-50"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </>
  )
}

interface HowToPlayModalProps {
  onClose: () => void
}

function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">How to Play</CardTitle>
              <CardDescription>Learn the basics of Survivor Stock Exchange</CardDescription>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Objective */}
          <section>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">1</span>
              The Objective
            </h3>
            <p className="text-muted-foreground ml-8">
              Build the most valuable portfolio by strategically buying and selling stock in Survivor contestants.
              Your portfolio value is determined by your cash balance plus the value of all your stock holdings.
            </p>
          </section>

          {/* Starting Out */}
          <section>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">2</span>
              Initial Offerings
            </h3>
            <p className="text-muted-foreground ml-8">
              When a new season begins, you'll receive a starting salary (e.g., $100). Use this to participate in
              <strong> Initial Offerings</strong> - silent auctions where you bid on contestants. Submit bids for
              multiple contestants to diversify your portfolio!
            </p>
            <div className="mt-2 ml-8 p-3 bg-muted rounded-lg text-sm">
              <strong>Tip:</strong> Bid strategically! You have limited funds, so spread your bids across contestants
              you think will perform well.
            </div>
          </section>

          {/* Trading */}
          <section>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">3</span>
              Bidding & Trading
            </h3>
            <ul className="space-y-2 text-muted-foreground ml-8">
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="flex-shrink-0">Offerings</Badge>
                <span>Silent auctions where you submit bids. Highest bidders win shares.</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="flex-shrink-0">Listings</Badge>
                <span>Sell your shares to other players. Set a minimum price and wait for a buyer.</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="flex-shrink-0">Stock Prices</Badge>
                <span>Determined weekly by player ratings. Higher ratings = higher stock prices.</span>
              </li>
            </ul>
          </section>

          {/* Dividends */}
          <section>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">4</span>
              Dividends
            </h3>
            <p className="text-muted-foreground ml-8">
              Earn weekly dividends when contestants you own achieve things like:
            </p>
            <ul className="space-y-1 text-muted-foreground ml-8 mt-2">
              <li>• Winning reward challenges</li>
              <li>• Finding hidden immunity idols</li>
              <li>• Winning tribal or individual immunity</li>
            </ul>
            <p className="text-muted-foreground ml-8 mt-2">
              The longer you hold stock in successful contestants, the more you earn!
            </p>
          </section>

          {/* Winning */}
          <section>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">5</span>
              Winning the Game
            </h3>
            <p className="text-muted-foreground ml-8">
              Climb the leaderboard by growing your portfolio value. The player with the highest net worth
              at the end of the season wins! Watch the standings to see how you rank against other players.
            </p>
          </section>

          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Start Trading</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
