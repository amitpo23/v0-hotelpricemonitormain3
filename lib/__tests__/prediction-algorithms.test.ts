import { describe, it, expect } from "vitest"
import {
  predictPrice,
  calculateSeasonalityFactor,
  isHolidayOrEvent,
  calculateDemandScore,
  calculateDemandForecast,
  calculateSeasonalMultiplier,
  calculateCompetitorInfluence,
  applyPricingStrategy,
  type PredictionInput,
} from "../prediction-algorithms"

function createBaseInput(overrides: Partial<PredictionInput> = {}): PredictionInput {
  return {
    date: "2026-03-15",
    dayOfWeek: 0, // Sunday
    isWeekend: false,
    isHoliday: false,
    daysUntilDate: 30,
    currentOccupancy: 60,
    historicalOccupancy: 55,
    currentPrice: 500,
    competitorAvgPrice: 480,
    competitorBookingPrice: 475,
    competitorExpediaPrice: 490,
    demandScore: 0.5,
    seasonalityFactor: 1.0,
    eventFactor: 1.0,
    priceHistoryTrend: 0,
    ...overrides,
  }
}

describe("predictPrice", () => {
  it("returns a valid prediction output", async () => {
    const input = createBaseInput()
    const result = await predictPrice(input)

    expect(result).toHaveProperty("date", "2026-03-15")
    expect(result).toHaveProperty("predictedPrice")
    expect(result).toHaveProperty("confidenceScore")
    expect(result).toHaveProperty("demandLevel")
    expect(result).toHaveProperty("recommendation")
    expect(result).toHaveProperty("recommendedPrice")
    expect(result).toHaveProperty("priceRange")
    expect(result).toHaveProperty("factors")
    expect(result.priceRange).toHaveProperty("min")
    expect(result.priceRange).toHaveProperty("max")
  })

  it("predicted price is a positive number", async () => {
    const result = await predictPrice(createBaseInput())
    expect(result.predictedPrice).toBeGreaterThan(0)
    expect(result.recommendedPrice).toBeGreaterThan(0)
  })

  it("confidence score is between 40 and 95", async () => {
    const result = await predictPrice(createBaseInput())
    expect(result.confidenceScore).toBeGreaterThanOrEqual(40)
    expect(result.confidenceScore).toBeLessThanOrEqual(95)
  })

  it("recommends higher prices on weekends", async () => {
    const weekdayResult = await predictPrice(createBaseInput({ isWeekend: false, dayOfWeek: 2 }))
    const weekendResult = await predictPrice(createBaseInput({ isWeekend: true, dayOfWeek: 6 }))

    expect(weekendResult.predictedPrice).toBeGreaterThan(weekdayResult.predictedPrice)
  })

  it("recommends higher prices on holidays", async () => {
    const normalResult = await predictPrice(createBaseInput({ isHoliday: false }))
    const holidayResult = await predictPrice(createBaseInput({ isHoliday: true }))

    expect(holidayResult.predictedPrice).toBeGreaterThan(normalResult.predictedPrice)
  })

  it("increases price when occupancy is high", async () => {
    const lowOccResult = await predictPrice(createBaseInput({ currentOccupancy: 30 }))
    const highOccResult = await predictPrice(createBaseInput({ currentOccupancy: 95 }))

    expect(highOccResult.predictedPrice).toBeGreaterThan(lowOccResult.predictedPrice)
  })

  it("applies last-minute premium pricing", async () => {
    const farResult = await predictPrice(createBaseInput({ daysUntilDate: 90 }))
    const lastMinuteResult = await predictPrice(createBaseInput({ daysUntilDate: 2 }))

    expect(lastMinuteResult.predictedPrice).toBeGreaterThan(farResult.predictedPrice)
  })

  it("factors in high demand score", async () => {
    const lowDemand = await predictPrice(createBaseInput({ demandScore: 0.1 }))
    const highDemand = await predictPrice(createBaseInput({ demandScore: 0.9 }))

    expect(highDemand.predictedPrice).toBeGreaterThan(lowDemand.predictedPrice)
  })

  it("enforces price floor of 300 when current price allows it", async () => {
    const result = await predictPrice(
      createBaseInput({
        currentPrice: 500,
        competitorAvgPrice: 200,
        currentOccupancy: 10,
        demandScore: 0.1,
        seasonalityFactor: 0.85,
      }),
    )

    // The absolute minimum floor is 300, applied via minPrice
    expect(result.priceRange.min).toBeGreaterThanOrEqual(300)
  })

  it("price cap (1.5x) may override absolute minimum when current price is very low", async () => {
    // NOTE: This test documents a potential business logic issue:
    // When currentPrice is 100, maxPrice becomes 150 (1.5x),
    // which is below the absolute minimum of 300.
    // The algorithm caps at maxPrice, resulting in 150 < 300.
    const result = await predictPrice(
      createBaseInput({
        currentPrice: 100,
        competitorAvgPrice: 90,
        currentOccupancy: 10,
        demandScore: 0.1,
        seasonalityFactor: 0.5,
      }),
    )

    // maxPrice = 100 * 1.5 = 150, which overrides the 300 floor
    expect(result.recommendedPrice).toBeLessThanOrEqual(150)
  })

  it("respects the price cap of 1.5x current price", async () => {
    const currentPrice = 500
    const result = await predictPrice(
      createBaseInput({
        currentPrice,
        isWeekend: true,
        isHoliday: true,
        currentOccupancy: 99,
        demandScore: 1.0,
        seasonalityFactor: 1.5,
        eventFactor: 1.5,
      }),
    )

    expect(result.recommendedPrice).toBeLessThanOrEqual(currentPrice * 1.5)
  })

  it("correctly identifies demand levels", async () => {
    const lowDemand = await predictPrice(createBaseInput({ demandScore: 0.1, currentOccupancy: 20 }))
    expect(lowDemand.demandLevel).toBe("low")

    const highDemand = await predictPrice(createBaseInput({ demandScore: 0.9, currentOccupancy: 90 }))
    expect(["high", "very_high"]).toContain(highDemand.demandLevel)
  })

  it("provides recommendation based on price difference", async () => {
    // When occupancy is high with events, should recommend increase
    const increaseResult = await predictPrice(
      createBaseInput({
        isWeekend: true,
        currentOccupancy: 95,
        demandScore: 0.9,
        eventFactor: 1.3,
      }),
    )
    expect(increaseResult.recommendation).toBe("increase")
  })

  it("factors include descriptive information", async () => {
    const result = await predictPrice(createBaseInput({ isWeekend: true }))

    expect(result.factors.length).toBeGreaterThan(0)
    for (const factor of result.factors) {
      expect(factor).toHaveProperty("name")
      expect(factor).toHaveProperty("impact")
      expect(factor).toHaveProperty("description")
      expect(typeof factor.name).toBe("string")
      expect(typeof factor.impact).toBe("number")
      expect(typeof factor.description).toBe("string")
    }
  })

  it("lowers confidence when data quality is low", async () => {
    const highQuality = await predictPrice(
      createBaseInput({
        dataQualityScore: 0.9,
        weatherScore: 0.5,
        bookingVelocity7d: 5,
        yoyPriceChange: 10,
      }),
    )
    const lowQuality = await predictPrice(
      createBaseInput({
        dataQualityScore: 0.3,
      }),
    )

    expect(highQuality.confidenceScore).toBeGreaterThan(lowQuality.confidenceScore)
  })
})

describe("calculateSeasonalityFactor", () => {
  it("returns higher factor for summer months", () => {
    const julyFactor = calculateSeasonalityFactor(7)
    const januaryFactor = calculateSeasonalityFactor(1)

    expect(julyFactor).toBeGreaterThan(januaryFactor)
  })

  it("returns 1.0 for spring (neutral month)", () => {
    const marchFactor = calculateSeasonalityFactor(3)
    expect(marchFactor).toBe(1.0)
  })

  it("uses historical data when available", () => {
    const historicalData = [
      { month: 1, avgOccupancy: 40 },
      { month: 7, avgOccupancy: 90 },
    ]

    const julyFactor = calculateSeasonalityFactor(7, historicalData)
    const januaryFactor = calculateSeasonalityFactor(1, historicalData)

    expect(julyFactor).toBeGreaterThan(januaryFactor)
  })

  it("falls back to default for unknown months with no data", () => {
    const result = calculateSeasonalityFactor(13 as number) // Invalid month
    expect(result).toBe(1.0)
  })
})

describe("isHolidayOrEvent", () => {
  it("detects New Year", () => {
    const result = isHolidayOrEvent(new Date("2026-01-01"))
    expect(result.isHoliday).toBe(true)
    expect(result.eventFactor).toBeGreaterThan(1.0)
  })

  it("detects New Year Eve with high factor", () => {
    const result = isHolidayOrEvent(new Date("2026-12-31"))
    expect(result.isHoliday).toBe(true)
    expect(result.eventFactor).toBe(1.5)
  })

  it("returns no holiday for regular dates", () => {
    const result = isHolidayOrEvent(new Date("2026-03-15"))
    expect(result.isHoliday).toBe(false)
    expect(result.eventFactor).toBe(1.0)
  })

  it("detects holidays within 2-day range", () => {
    const result = isHolidayOrEvent(new Date("2026-04-16")) // Near Passover (April 15)
    expect(result.isHoliday).toBe(true)
  })
})

describe("calculateDemandScore", () => {
  it("returns value between 0 and 1", () => {
    const score = calculateDemandScore(50, 5, 0.5, 0.5)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it("higher occupancy increases demand score", () => {
    const lowOcc = calculateDemandScore(20, 5, 0.5, 0.5)
    const highOcc = calculateDemandScore(95, 5, 0.5, 0.5)
    expect(highOcc).toBeGreaterThan(lowOcc)
  })

  it("higher booking velocity increases demand score", () => {
    const lowVelocity = calculateDemandScore(50, 1, 0.5, 0.5)
    const highVelocity = calculateDemandScore(50, 10, 0.5, 0.5)
    expect(highVelocity).toBeGreaterThan(lowVelocity)
  })

  it("lower competitor availability increases demand", () => {
    const highAvail = calculateDemandScore(50, 5, 0.5, 0.9) // Lots available
    const lowAvail = calculateDemandScore(50, 5, 0.5, 0.1) // Scarce
    expect(lowAvail).toBeGreaterThan(highAvail)
  })

  it("caps at 1.0", () => {
    const score = calculateDemandScore(100, 20, 1.0, 0)
    expect(score).toBeLessThanOrEqual(1.0)
  })

  it("floors at 0.0", () => {
    const score = calculateDemandScore(0, 0, 0, 1)
    expect(score).toBeGreaterThanOrEqual(0)
  })
})

describe("calculateDemandForecast", () => {
  it("returns higher value for weekends", () => {
    const friday = new Date("2026-03-13") // Friday
    const tuesday = new Date("2026-03-10") // Tuesday

    const weekendForecast = calculateDemandForecast(friday, { avgPrice: 500, minPrice: 400, maxPrice: 600, dataPoints: 10 })
    const weekdayForecast = calculateDemandForecast(tuesday, { avgPrice: 500, minPrice: 400, maxPrice: 600, dataPoints: 10 })

    expect(weekendForecast).toBeGreaterThan(weekdayForecast)
  })

  it("returns higher value for summer months", () => {
    const july = new Date("2026-07-15")
    const january = new Date("2026-01-15")

    const summerForecast = calculateDemandForecast(july, { avgPrice: 500, minPrice: 400, maxPrice: 600, dataPoints: 10 })
    const winterForecast = calculateDemandForecast(january, { avgPrice: 500, minPrice: 400, maxPrice: 600, dataPoints: 10 })

    expect(summerForecast).toBeGreaterThan(winterForecast)
  })
})

describe("calculateSeasonalMultiplier", () => {
  it("July and August have the highest multiplier", () => {
    const julyMultiplier = calculateSeasonalMultiplier(new Date("2026-07-15"))
    expect(julyMultiplier).toBe(1.30)
  })

  it("January has the lowest multiplier", () => {
    const janMultiplier = calculateSeasonalMultiplier(new Date("2026-01-15"))
    expect(janMultiplier).toBe(0.85)
  })
})

describe("calculateCompetitorInfluence", () => {
  it("returns positive when competitors are more expensive", () => {
    const influence = calculateCompetitorInfluence(400, 450, 550)
    expect(influence).toBeGreaterThan(0)
  })

  it("returns negative when competitors are cheaper", () => {
    const influence = calculateCompetitorInfluence(600, 350, 450)
    expect(influence).toBeLessThan(0)
  })

  it("clamps between -0.2 and 0.2", () => {
    const extreme = calculateCompetitorInfluence(100, 500, 600)
    expect(extreme).toBeLessThanOrEqual(0.2)
    expect(extreme).toBeGreaterThanOrEqual(-0.2)
  })

  it("returns 0 when no competitor data", () => {
    expect(calculateCompetitorInfluence(500, 0, 0)).toBe(0)
  })
})

describe("applyPricingStrategy", () => {
  it("caps price at max multiplier", () => {
    const result = applyPricingStrategy(2000, 500, 0.7, 2.0)
    expect(result).toBeLessThanOrEqual(1000) // 500 * 2.0
  })

  it("floors price at min multiplier", () => {
    const result = applyPricingStrategy(100, 500, 0.7, 2.0)
    expect(result).toBeGreaterThanOrEqual(350) // 500 * 0.7
  })

  it("passes through prices within range", () => {
    const result = applyPricingStrategy(600, 500, 0.7, 2.0)
    expect(result).toBe(600)
  })
})
