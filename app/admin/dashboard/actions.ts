"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  calculateTotalShares,
  processListings,
  processDividends,
  settleBids,
  updatePortfolioValues,
} from "@/lib/calculations"

async function requireAdminAndActiveSeason() {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized")
  }

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } })
  if (!activeSeason) {
    throw new Error("No active season")
  }

  return activeSeason
}

export async function enrollPlayersToActiveSeason() {
  const activeSeason = await requireAdminAndActiveSeason()

  const players = await prisma.user.findMany({
    where: { isAdmin: false },
    select: { id: true },
  })

  for (const player of players) {
    await prisma.portfolio.upsert({
      where: {
        userId_seasonId: {
          userId: player.id,
          seasonId: activeSeason.id,
        },
      },
      update: {},
      create: {
        userId: player.id,
        seasonId: activeSeason.id,
        cashBalance: activeSeason.startingSalary,
        totalStock: 0,
        netWorth: activeSeason.startingSalary,
        movement: 0,
      },
    })
  }

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/players")
}

export async function allocateSharesForActiveSeason() {
  const activeSeason = await requireAdminAndActiveSeason()

  await calculateTotalShares(activeSeason.id)

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/contestants")
}

export async function createDefaultPhasesForNextWeek() {
  const activeSeason = await requireAdminAndActiveSeason()

  const weekStats = await prisma.phase.aggregate({
    where: { seasonId: activeSeason.id },
    _max: { weekNumber: true },
  })

  const nextWeek = (weekStats._max.weekNumber ?? 0) + 1
  const existingWeekPhases = await prisma.phase.count({
    where: { seasonId: activeSeason.id, weekNumber: nextWeek },
  })

  if (existingWeekPhases > 0) {
    revalidatePath("/admin/dashboard")
    revalidatePath("/admin/phases")
    return
  }

  const now = new Date()
  const day = (numDays: number) =>
    new Date(now.getTime() + numDays * 24 * 60 * 60 * 1000)

  await prisma.phase.createMany({
    data: [
      {
        seasonId: activeSeason.id,
        phaseType: "INITIAL_OFFERING",
        weekNumber: nextWeek,
        name: `Week ${nextWeek} Initial Offering`,
        startDate: day(0),
        endDate: day(3),
        isOpen: false,
      },
      {
        seasonId: activeSeason.id,
        phaseType: "SECOND_OFFERING",
        weekNumber: nextWeek,
        name: `Week ${nextWeek} Second Offering`,
        startDate: day(3),
        endDate: day(4),
        isOpen: false,
      },
      {
        seasonId: activeSeason.id,
        phaseType: "FIRST_LISTING",
        weekNumber: nextWeek,
        name: `Week ${nextWeek} First Listing`,
        startDate: day(5),
        endDate: day(7),
        isOpen: false,
      },
      {
        seasonId: activeSeason.id,
        phaseType: "SECOND_LISTING",
        weekNumber: nextWeek,
        name: `Week ${nextWeek} Second Listing`,
        startDate: day(7),
        endDate: day(9),
        isOpen: false,
      },
      {
        seasonId: activeSeason.id,
        phaseType: "GAME_DAY",
        weekNumber: nextWeek,
        name: `Week ${nextWeek} Game Day`,
        startDate: day(10),
        endDate: day(11),
        isOpen: false,
      },
    ],
  })

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/phases")
}

export async function recalculateActiveSeasonPortfolios() {
  const activeSeason = await requireAdminAndActiveSeason()

  await updatePortfolioValues(activeSeason.id)

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/players")
  revalidatePath("/admin/dividends")
  revalidatePath("/standings")
}

export async function settleCurrentOfferingPhase(formData: FormData) {
  const activeSeason = await requireAdminAndActiveSeason()
  const phaseId = (formData.get("phaseId") as string) || null

  const phase = phaseId
    ? await prisma.phase.findFirst({
        where: {
          id: phaseId,
          seasonId: activeSeason.id,
          isOpen: true,
          phaseType: { in: ["INITIAL_OFFERING", "SECOND_OFFERING"] },
        },
      })
    : await prisma.phase.findFirst({
        where: {
          seasonId: activeSeason.id,
          isOpen: true,
          phaseType: { in: ["INITIAL_OFFERING", "SECOND_OFFERING"] },
        },
        orderBy: { startDate: "desc" },
      })

  if (!phase) {
    return
  }

  await settleBids(phase.id)

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/phases")
  revalidatePath("/admin/bids")
  revalidatePath("/dashboard")
  revalidatePath("/portfolio")
  revalidatePath("/standings")
  revalidatePath("/trade")
}

export async function settleCurrentListingPhase(formData: FormData) {
  const activeSeason = await requireAdminAndActiveSeason()
  const phaseId = (formData.get("phaseId") as string) || null

  const phase = phaseId
    ? await prisma.phase.findFirst({
        where: {
          id: phaseId,
          seasonId: activeSeason.id,
          isOpen: true,
          phaseType: { in: ["FIRST_LISTING", "SECOND_LISTING"] },
        },
      })
    : await prisma.phase.findFirst({
        where: {
          seasonId: activeSeason.id,
          isOpen: true,
          phaseType: { in: ["FIRST_LISTING", "SECOND_LISTING"] },
        },
        orderBy: { startDate: "desc" },
      })

  if (!phase) {
    return
  }

  await processListings(phase.id)

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/phases")
  revalidatePath("/admin/bids")
  revalidatePath("/dashboard")
  revalidatePath("/portfolio")
  revalidatePath("/standings")
  revalidatePath("/trade")
}

export async function markWeekAired(formData: FormData) {
  const activeSeason = await requireAdminAndActiveSeason()
  const weekNumber = Number(formData.get("weekNumber"))

  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    throw new Error("Invalid week number")
  }

  const existingGame = await prisma.game.findFirst({
    where: {
      seasonId: activeSeason.id,
      episodeNumber: weekNumber,
    },
  })

  if (existingGame) {
    await prisma.game.update({
      where: { id: existingGame.id },
      data: {
        aired: true,
        airDate: existingGame.airDate ?? new Date(),
      },
    })
  } else {
    await prisma.game.create({
      data: {
        seasonId: activeSeason.id,
        episodeNumber: weekNumber,
        airDate: new Date(),
        aired: true,
        dividendProcessed: false,
        title: `Episode ${weekNumber}`,
      },
    })
  }

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/achievements")
  revalidatePath("/admin/dividends")
  revalidatePath("/ratings")
}

export async function processWeekDividends(formData: FormData) {
  const activeSeason = await requireAdminAndActiveSeason()
  const weekNumber = Number(formData.get("weekNumber"))

  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    throw new Error("Invalid week number")
  }

  const game = await prisma.game.findFirst({
    where: {
      seasonId: activeSeason.id,
      episodeNumber: weekNumber,
    },
  })

  if (!game?.aired) {
    throw new Error("Cannot process dividends before week is marked aired")
  }

  if (game.dividendProcessed) {
    return
  }

  await processDividends(activeSeason.id, weekNumber)
  await updatePortfolioValues(activeSeason.id)

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/dividends")
  revalidatePath("/dashboard")
  revalidatePath("/portfolio")
  revalidatePath("/standings")
}
