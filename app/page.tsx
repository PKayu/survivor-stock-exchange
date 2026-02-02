import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SurvivorIcon } from "@/components/icons/survivor-icon"
import { TrendingUp, Users, Trophy, DollarSign } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-6">
            <SurvivorIcon className="h-20 w-20 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Survivor Stock Exchange
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Buy and trade stocks of Survivor contestants. Build your portfolio,
            earn dividends, and the player with the most stock of the winner takes it all!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Join a Season</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Sign up and join an active Survivor season. Every player starts with $100
                  to build their portfolio.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Trade Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Place bids in silent auctions and buy stocks from other players.
                  Stock prices are determined by community ratings.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Win Big</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Earn dividends when your contestants achieve immunity or find idols.
                  The player with the most shares of the winner wins!
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Game Rules */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Game Rules</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Starting Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Every player starts with <strong>$100</strong> to invest in contestants.
                  Stock is allocated based on the formula: (Players × $100) / (Contestants × 2)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Stock Prices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Stock prices are determined by the <strong>median</strong> of all player ratings
                  (1-10 scale) submitted each week.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-600">$$</Badge>
                  Dividends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Earn dividends paid the day after each episode:
                  <br />• Reward: $0.05/share
                  <br />• Hidden Idol: $0.05/share
                  <br />• Tribal Immunity: $0.10/share
                  <br />• Individual Immunity: $0.15/share
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Winning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The player with the <strong>most shares</strong> of the winning contestant wins!
                  Tie-breaker: most cash on hand at the end.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trading Phases */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Trading Phases</h2>
          <div className="space-y-4">
            {[
              { name: "Initial Offering", desc: "Silent auction for initial stock allocation" },
              { name: "Second Offering", desc: "Additional silent auction for remaining stocks" },
              { name: "First Listing", desc: "Open trading period - buy and sell stocks" },
              { name: "Second Listing", desc: "Final trading before episode airs" },
              { name: "Game Day", desc: "Episode airs - trading is closed" },
            ].map((phase, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{phase.name}</h3>
                      <p className="text-sm text-muted-foreground">{phase.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary/10">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Play?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join now and test your Survivor knowledge. Build the winning portfolio
            and become the ultimate Survivor Stock Exchange champion!
          </p>
          <Link href="/register">
            <Button size="lg">Create Your Account</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
