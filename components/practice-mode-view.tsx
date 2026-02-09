import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, Info, BarChart3 } from "lucide-react"

// Generate practice data
const PRACTICE_CONTESTANTS = [
  { id: "1", name: "Jane Doe", tribe: "Lavi", price: 25.50, change: 5.2 },
  { id: "2", name: "John Smith", tribe: "Lavi", price: 18.75, change: -2.1 },
  { id: "3", name: "Sarah Johnson", tribe: "Vatu", price: 32.00, change: 8.4 },
  { id: "4", name: "Mike Wilson", tribe: "Vatu", price: 15.25, change: -4.3 },
  { id: "5", name: "Emily Davis", tribe: "Lavi", price: 28.90, change: 3.7 },
  { id: "6", name: "Chris Brown", tribe: "Vatu", price: 22.50, change: 1.2 },
  { id: "7", name: "Amanda Lee", tribe: "Lavi", price: 19.80, change: -0.5 },
  { id: "8", name: "David Kim", tribe: "Vatu", price: 35.00, change: 10.1 },
  { id: "9", name: "Rachel Green", tribe: "Lavi", price: 16.75, change: -1.8 },
  { id: "10", name: "Tom Martinez", tribe: "Vatu", price: 29.50, change: 6.9 },
]

const PRACTICE_STANDINGS = [
  { rank: 1, name: "Demo Player 1", netWorth: 145.50, movement: 15.5 },
  { rank: 2, name: "Demo Player 2", netWorth: 138.75, movement: 12.3 },
  { rank: 3, name: "Demo Player 3", netWorth: 125.00, movement: 8.7 },
  { rank: 4, name: "Demo Player 4", netWorth: 118.25, movement: 5.2 },
  { rank: 5, name: "Demo Player 5", netWorth: 112.50, movement: 3.1 },
]

export function PracticeModeView({ userName }: { userName: string }) {
  return (
    <div className="space-y-6">
      {/* Practice Mode Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Practice Mode
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Explore the interface with demo data. Trading is disabled when no active season exists.
              </p>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
              Demo
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userName}! Season: Practice Round
        </p>
      </div>

      {/* Current Phase Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="text-sm px-3 py-1">Practice Round</Badge>
              <span className="text-sm text-muted-foreground">Week 1</span>
            </div>
            <Button size="sm" disabled>
              Trade Now
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Trading is disabled in practice mode. Join an active season to compete!
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid (Demo Data) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Portfolio Value
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$100.00</div>
            <p className="text-xs text-muted-foreground mt-1">
              Starting balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Balance
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$100.00</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready to invest
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contestants
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{PRACTICE_CONTESTANTS.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available to trade
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Practice Mode
            </CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Demo</div>
            <p className="text-xs text-muted-foreground mt-1">
              No active season
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contestant List (Practice) */}
        <Card>
          <CardHeader>
            <CardTitle>Contestant Market</CardTitle>
            <CardDescription>Demo contestant data</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contestant</TableHead>
                  <TableHead>Tribe</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PRACTICE_CONTESTANTS.map((contestant) => (
                  <TableRow key={contestant.id}>
                    <TableCell className="font-medium">{contestant.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{contestant.tribe}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(contestant.price)}</TableCell>
                    <TableCell className={`text-right ${
                      contestant.change >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      <span className="flex items-center justify-end gap-1">
                        {contestant.change >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {contestant.change >= 0 ? "+" : ""}{contestant.change.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mock Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>Top performers (Demo)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Net Worth</TableHead>
                  <TableHead className="text-right">Movement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PRACTICE_STANDINGS.map((entry) => (
                  <TableRow key={entry.rank}>
                    <TableCell>
                      <Badge variant={entry.rank === 1 ? "default" : "secondary"}>{entry.rank}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.netWorth)}</TableCell>
                    <TableCell className={`text-right ${
                      entry.movement >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      <span className="flex items-center justify-end gap-1">
                        {entry.movement >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {entry.movement >= 0 ? "+" : ""}{entry.movement.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">About Practice Mode</p>
              <p>
                This is a demo environment that lets you explore the Survivor Stock Exchange interface.
                When an active season is available, you'll be able to participate in real offerings,
                trade stocks, and compete against other players on the live leaderboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
