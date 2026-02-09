import { describe, expect, it } from "vitest"
import {
  calculateMedian,
  calculateSharesPerContestant,
  isPhaseOpen,
} from "@/lib/utils"

describe("calculateMedian", () => {
  it("returns middle value for odd-length arrays", () => {
    expect(calculateMedian([5, 1, 9])).toBe(5)
  })

  it("returns average of middle values for even-length arrays", () => {
    expect(calculateMedian([1, 4, 7, 10])).toBe(5.5)
  })

  it("returns 0 for empty arrays", () => {
    expect(calculateMedian([])).toBe(0)
  })
})

describe("calculateSharesPerContestant", () => {
  it("applies official share formula", () => {
    expect(calculateSharesPerContestant(12, 18, 100)).toBe(33)
  })

  it("rounds down to whole shares", () => {
    expect(calculateSharesPerContestant(5, 13, 100)).toBe(19)
  })
})

describe("isPhaseOpen", () => {
  it("returns false when phase is manually closed", () => {
    const now = new Date()
    expect(
      isPhaseOpen({
        isOpen: false,
        startDate: new Date(now.getTime() - 60_000),
        endDate: new Date(now.getTime() + 60_000),
      })
    ).toBe(false)
  })

  it("returns true when current time is within open window", () => {
    const now = new Date()
    expect(
      isPhaseOpen({
        isOpen: true,
        startDate: new Date(now.getTime() - 60_000),
        endDate: new Date(now.getTime() + 60_000),
      })
    ).toBe(true)
  })

  it("returns false after phase end date", () => {
    const now = new Date()
    expect(
      isPhaseOpen({
        isOpen: true,
        startDate: new Date(now.getTime() - 120_000),
        endDate: new Date(now.getTime() - 60_000),
      })
    ).toBe(false)
  })
})
