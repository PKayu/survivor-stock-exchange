# Survivor Stock Exchange 🏝️💰

A fantasy stock trading game where players buy, sell, and trade shares of Survivor contestants. Build your portfolio, predict who will be voted out, and compete against other players to become the ultimate Survivor trader!

## Features

### For Players
- **📊 Portfolio Management** - Track your stock portfolio and performance over time
- **💹 Trading System** - Buy and sell shares of contestants through listings and bids
- **📈 Live Stock Prices** - Real-time price updates based on market activity
- **🏆 Leaderboard** - Compete against other players and track your rankings
- **⭐ Contestant Ratings** - Rate contestants based on their gameplay and entertainment value
- **💰 Dividend System** - Earn dividends when your contestants achieve milestones

### For Administrators
- **👥 Player Management** - Manage player accounts and permissions
- **🎭 Contestant Management** - Add/edit contestants and their attributes
- **📅 Season Management** - Create and manage multiple Survivor seasons
- **💵 Dividend Configuration** - Set up dividend rules and payouts
- **🎯 Phase Management** - Control game phases (trading, voting, etc.)
- **📊 Bids Oversight** - Monitor and manage all trading activity
- **🏆 Achievements** - Create and award player achievements

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Database**: [Prisma ORM](https://www.prisma.io/) with PostgreSQL
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database running locally or remotely
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/survivor-stock-exchange.git
   cd survivor-stock-exchange
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your database credentials and NextAuth secrets:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/survivor_stock_exchange"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="generate-a-secret-key-here"
   NODE_ENV="development"
   ```

   **Generate a NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

4. **Set up the database**
   ```bash
   # Push schema to database
   npm run db:push

   # (Optional) Seed with sample data
   npm run db:seed
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest in watch mode
- `npm run test:run` - Run Vitest once
- `npm run db:push` - Push Prisma schema to database
- `npm run db:migrate` - Create and run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio to view/edit data

## Project Structure

```
survivor-stock-exchange/
├── app/                      # Next.js app router pages
│   ├── (auth)/              # Authentication pages (login, register)
│   ├── (player)/            # Player-facing pages
│   ├── admin/               # Admin dashboard pages
│   └── api/                 # API routes
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── trading/             # Trading-related components
│   └── ratings/             # Rating-related components
├── lib/                     # Utility libraries
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client
│   └── calculations.ts      # Business logic calculations
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma        # Prisma schema
│   └── seed.ts              # Database seeding script
└── types/                   # TypeScript type definitions
```

## Testing

- `npm run test` - Vitest watch mode
- `npm run test:run` - Vitest single run
- Single test: `npm run test -- path/to/file.test.ts`

## How It Works

### Trading System
1. **Listings**: Players can list shares they own for sale at a specific price
2. **Bids**: Buyers can place bids on listings or make offers to buy shares
3. **Stock Prices**: Contestant stock prices fluctuate based on market activity and game events
4. **Transactions**: Automatic execution when bids match listing prices

### Dividend System
- Contestants pay dividends when they achieve milestones (winning immunity, finding idols, etc.)
- Shareholders automatically receive dividend payouts proportional to their holdings
- Administrators configure dividend rules and amounts

### Rating System
- Players can rate contestants on various criteria (gameplay, entertainment, strategy)
- Ratings affect stock prices and overall contestant performance metrics
- Aggregate ratings displayed in contestant profiles

## Database Schema

The application uses PostgreSQL with the following main entities:
- **User** - Player accounts with roles (player/admin)
- **Season** - Survivor seasons
- **Contestant** - Contestants with seasons, tribes, and status
- **Listing** - Stock listings for sale
- **Bid** - Bids on listings
- **Portfolio** - Player stock holdings
- **Transaction** - Transaction history
- **Rating** - Contestant ratings
- **Dividend** - Dividend payouts

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Inspired by fantasy sports and stock trading platforms

---

**Note**: This is a fantasy game for entertainment purposes only. No real money is involved.
