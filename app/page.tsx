import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TorchIcon } from "@/components/icons/torch-icon"
import { TrendingUp, Users, Trophy, DollarSign } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-island-bg.jpg')" }}
        />

        {/* Jungle Overlay */}
        <div className="absolute inset-0 jungle-overlay" />

        {/* Animated particles/fireflies */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/50 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center pt-20">
          {/* Torches */}
          <div className="flex justify-center gap-8 mb-8">
            <TorchIcon size="lg" animated />
            <TorchIcon size="lg" animated />
          </div>

          {/* Main Title */}
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl tracking-wider mb-4">
            <span className="text-gradient-fire">SURVIVOR</span>
          </h1>
          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl tracking-widest text-gradient-ocean mb-6">
            STOCK EXCHANGE
          </h2>

          {/* Tagline */}
          <p className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Trade stocks of your favorite Survivor contestants. Build your portfolio.
            <span className="text-primary font-semibold"> Outwit. Outplay. Out-invest.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="torch" size="xl" asChild>
              <Link href="/login">Enter the Exchange</Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link href="/contestants">View Contestants</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="font-display text-3xl md:text-5xl tracking-wider text-center mb-12 text-gradient-fire">
            HOW IT WORKS
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-tribal p-6 text-center">
              <CardHeader>
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 glow-fire">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="font-heading text-xl">Trade Stocks</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-body text-base">
                  Buy and sell contestant stocks through silent auctions. Watch prices rise and fall
                  based on player ratings.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="card-tribal p-6 text-center">
              <CardHeader>
                <div className="h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4 glow-ocean">
                  <DollarSign className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="font-heading text-xl">Build Your Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-body text-base">
                  Strategically invest your $100 starting balance across multiple contestants
                  to diversify your risk.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="card-tribal p-6 text-center">
              <CardHeader>
                <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-8 w-8 text-accent-foreground" />
                </div>
                <CardTitle className="font-heading text-xl">Outlast Everyone</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-body text-base">
                  Earn dividends when your contestants win immunity, find idols, or claim rewards.
                  The player with the most shares of the Sole Survivor wins the game!
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Game Rules */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl md:text-5xl tracking-wider text-center mb-12 text-gradient-sunset">
            TRADING RULES
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-tribal">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Starting Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm text-muted-foreground">
                  Every player starts with <strong className="text-primary">$100</strong> to invest in contestants.
                  Stock is allocated based on the formula: (Players × $100) / (Contestants × 2)
                </p>
              </CardContent>
            </Card>

            <Card className="card-tribal">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                  Stock Prices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm text-muted-foreground">
                  Stock prices are determined by the <strong className="text-secondary">median</strong> of all player ratings
                  (1-10 scale) submitted each week.
                </p>
              </CardContent>
            </Card>

            <Card className="card-tribal">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Badge className="bg-gradient-fire text-black font-heading">$$</Badge>
                  Dividends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm text-muted-foreground">
                  Earn dividends paid the day after each episode:
                  <br />• Reward: $0.05/share
                  <br />• Hidden Idol: $0.05/share
                  <br />• Tribal Immunity: $0.10/share
                  <br />• Individual Immunity: $0.15/share
                </p>
              </CardContent>
            </Card>

            <Card className="card-tribal">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent-foreground" />
                  Winning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm text-muted-foreground">
                  The player with the <strong className="text-accent-foreground">most shares</strong> of the winning contestant wins!
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
          <h2 className="font-display text-3xl md:text-5xl tracking-wider text-center mb-12 text-gradient-ocean">
            TRADING PHASES
          </h2>
          <div className="space-y-4">
            {[
              { name: "Initial Offering", desc: "Silent auction for initial stock allocation", badge: "badge-tribe-orange" },
              { name: "Second Offering", desc: "Additional silent auction for remaining stocks", badge: "badge-tribe-blue" },
              { name: "First Listing", desc: "Open trading period - buy and sell stocks", badge: "badge-tribe-green" },
              { name: "Second Listing", desc: "Final trading before episode airs", badge: "badge-tribe-yellow" },
              { name: "Game Day", desc: "Episode airs - trading is closed", badge: "badge-tribe-red" },
            ].map((phase, i) => (
              <Card key={i} className="card-tribal">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center font-bold font-display text-xl glow-fire">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-heading font-semibold text-lg">{phase.name}</h3>
                        <span className={phase.badge}>{phase.name.toUpperCase().split(" ")[0]}</span>
                      </div>
                      <p className="font-body text-sm text-muted-foreground mt-1">{phase.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <TorchIcon size="lg" animated className="mx-auto mb-8" />
          <h3 className="font-display text-4xl md:text-6xl tracking-wider mb-4 text-gradient-fire">
            READY TO PLAY?
          </h3>
          <p className="font-body text-lg text-muted-foreground max-w-lg mx-auto mb-8">
            Join the ultimate Survivor fantasy game. Trade stocks, earn dividends, and prove
            you have what it takes to outlast everyone.
          </p>
          <Button variant="torch" size="xl" asChild>
            <Link href="/login">Start Trading Now</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
