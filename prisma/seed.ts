import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@survivor.com" },
    update: {},
    create: {
      email: "admin@survivor.com",
      password: adminPassword,
      name: "Admin User",
      isAdmin: true,
    },
  })
  console.log("Created admin user:", admin.email)

  // Create test users
  const testPassword = await bcrypt.hash("test123", 12)
  const testUser1 = await prisma.user.upsert({
    where: { email: "player1@test.com" },
    update: {},
    create: {
      email: "player1@test.com",
      password: testPassword,
      name: "Test Player 1",
      isAdmin: false,
    },
  })
  console.log("Created test user:", testUser1.email)

  const testUser2 = await prisma.user.upsert({
    where: { email: "player2@test.com" },
    update: {},
    create: {
      email: "player2@test.com",
      password: testPassword,
      name: "Test Player 2",
      isAdmin: false,
    },
  })
  console.log("Created test user:", testUser2.email)

  // Create a sample season
  const season = await prisma.season.upsert({
    where: { id: "sample-season" },
    update: {},
    create: {
      id: "sample-season",
      name: "Survivor 47 (Sample)",
      startDate: new Date(),
      startingSalary: 100,
      isActive: true,
    },
  })
  console.log("Created sample season:", season.name)

  // Create sample contestants
  const contestants = [
    { name: "Andy Shen", tribe: "Lava" },
    { name: "Anika Dhar", tribe: "Lava" },
    { name: "Aysha Welch", tribe: "Lava" },
    { name: "Caroline Vidmar", tribe: "Lava" },
    { name: "Gabe Ortis", tribe: "Vati" },
    { name: "Genevieve Mushaluk", tribe: "Vati" },
    { name: "Kishan Patel", tribe: "Vati" },
    { name: "Kyle Ostwald", tribe: "Vati" },
    { name: "Rachel LaMont", tribe: "Taku" },
    { name: "Rome Cooney", tribe: "Taku" },
    { name: "Sam Phalen", tribe: "Taku" },
    { name: "Sue Smey", tribe: "Taku" },
    { name: "Tiyana Leumi", tribe: "Reba" },
    { name: "Teen Karikari", tribe: "Reba" },
    { name: "Tulan Sebastian-Scot", tribe: "Reba" },
    { name: 'Vincent "Vinny" Poteito', tribe: "Reba" },
    { name: "Chloe Lipson", tribe: "Laga" },
    { name: "David Avila", tribe: "Laga" },
    { name: "Kendra McQuarrie", tribe: "Laga" },
    { name: 'Sierra "Ray" Wright', tribe: "Laga" },
  ]

  const totalPlayers = 3 // admin + 2 test users
  const sharesPerContestant = Math.floor((totalPlayers * 100) / (contestants.length * 2))

  for (const c of contestants) {
    await prisma.contestant.upsert({
      where: { id: `${c.name.toLowerCase().replace(/\s/g, "-")}-${season.id}` },
      update: {},
      create: {
        id: `${c.name.toLowerCase().replace(/\s/g, "-")}-${season.id}`,
        seasonId: season.id,
        name: c.name,
        tribe: c.tribe,
        totalShares: sharesPerContestant,
      },
    })
  }
  console.log(`Created ${contestants.length} contestants`)

  // Create portfolios for test users
  const portfolio1 = await prisma.portfolio.upsert({
    where: {
      userId_seasonId: {
        userId: testUser1.id,
        seasonId: season.id,
      },
    },
    update: {},
    create: {
      userId: testUser1.id,
      seasonId: season.id,
      cashBalance: 100,
      totalStock: 0,
      netWorth: 100,
    },
  })

  const portfolio2 = await prisma.portfolio.upsert({
    where: {
      userId_seasonId: {
        userId: testUser2.id,
        seasonId: season.id,
      },
    },
    update: {},
    create: {
      userId: testUser2.id,
      seasonId: season.id,
      cashBalance: 100,
      totalStock: 0,
      netWorth: 100,
    },
  })

  console.log("Created portfolios for test users")

  // Create initial phase
  const now = new Date()
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  await prisma.phase.upsert({
    where: { id: `initial-${season.id}` },
    update: {},
    create: {
      id: `initial-${season.id}`,
      seasonId: season.id,
      phaseType: "INITIAL_OFFERING",
      startDate: now,
      endDate: weekEnd,
      weekNumber: 1,
      name: "Week 1 Initial Offering",
      isOpen: true,
    },
  })

  console.log("Created initial trading phase")

  console.log("Seed completed!")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
