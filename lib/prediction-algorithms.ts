/**
 * Advanced Prediction Algorithms Library
 * ML-based price prediction and demand forecasting
 */

export interface PredictionInput {
  date: string
  dayOfWeek: number
  isWeekend: boolean
  isHoliday: boolean
  daysUntilDate: number
  currentOccupancy: number
  historicalOccupancy: number
  currentPrice: number
  competitorAvgPrice: number
  competitorBookingPrice: number
  competitorExpediaPrice: number
  demandScore: number
  seasonalityFactor: number
  eventFactor: number
  weatherFactor?: number
  priceHistoryTrend: number // -1 to 1
}

export interface PredictionOutput {
  date: string
  predictedPrice: number
  confidenceScore: number // 0-100
  demandLevel: "low" | "medium" | "high" | "very_high"
  recommendation: "decrease" | "maintain" | "increase"
  recommendedPrice: number
  priceRange: { min: number; max: number }
  factors: PredictionFactor[]
}

export interface PredictionFactor {
  name: string
  impact: number // -100 to 100
  description: string
}

/**
 * Main prediction algorithm using weighted multi-factor analysis
 */
export function predictPrice(input: PredictionInput): PredictionOutput {
  const factors: PredictionFactor[] = []
  let priceMultiplier = 1.0
  let confidenceScore = 75

  // 1. Day of week factor (weekends typically higher)
  const weekendFactor = input.isWeekend ? 1.15 : 1.0
  const weekendImpact = input.isWeekend ? 15 : 0
  factors.push({
    name: "Day of Week",
    impact: weekendImpact,
    description: input.isWeekend ? "Weekend - higher demand expected" : "Weekday - normal demand",
  })
  priceMultiplier *= weekendFactor

  // 2. Holiday factor
  if (input.isHoliday) {
    priceMultiplier *= 1.25
    factors.push({
      name: "Holiday",
      impact: 25,
      description: "Holiday period - significantly higher demand",
    })
    confidenceScore += 5
  }

  // 3. Days until date factor (closer = more certain pricing)
  let urgencyFactor = 1.0
  if (input.daysUntilDate <= 3) {
    urgencyFactor = 1.2 // Last minute pricing
    confidenceScore += 10
    factors.push({
      name: "Last Minute",
      impact: 20,
      description: "Very close date - premium pricing opportunity",
    })
  } else if (input.daysUntilDate <= 7) {
    urgencyFactor = 1.1
    confidenceScore += 5
    factors.push({
      name: "Short Notice",
      impact: 10,
      description: "Within a week - moderate urgency premium",
    })
  } else if (input.daysUntilDate > 60) {
    urgencyFactor = 0.95
    confidenceScore -= 10
    factors.push({
      name: "Far Future",
      impact: -5,
      description: "Far ahead booking - slight discount to encourage early bookings",
    })
  }
  priceMultiplier *= urgencyFactor

  // 4. Occupancy-based dynamic pricing
  let occupancyFactor = 1.0
  if (input.currentOccupancy >= 90) {
    occupancyFactor = 1.3
    factors.push({
      name: "High Occupancy",
      impact: 30,
      description: `${input.currentOccupancy}% occupancy - premium pricing recommended`,
    })
  } else if (input.currentOccupancy >= 75) {
    occupancyFactor = 1.15
    factors.push({
      name: "Good Occupancy",
      impact: 15,
      description: `${input.currentOccupancy}% occupancy - moderate price increase`,
    })
  } else if (input.currentOccupancy < 50) {
    occupancyFactor = 0.9
    factors.push({
      name: "Low Occupancy",
      impact: -10,
      description: `${input.currentOccupancy}% occupancy - consider discounts to fill rooms`,
    })
  }
  priceMultiplier *= occupancyFactor

  // 5. Competitor price positioning
  const competitorDiff = input.currentPrice - input.competitorAvgPrice
  const competitorDiffPercent = (competitorDiff / input.competitorAvgPrice) * 100
  let competitorFactor = 1.0

  if (competitorDiffPercent > 20) {
    // We're significantly more expensive
    competitorFactor = 0.95
    factors.push({
      name: "Competitor Pricing",
      impact: -5,
      description: `${competitorDiffPercent.toFixed(0)}% above competitors - consider alignment`,
    })
  } else if (competitorDiffPercent < -10) {
    // We're cheaper than competitors
    competitorFactor = 1.08
    factors.push({
      name: "Competitor Pricing",
      impact: 8,
      description: `${Math.abs(competitorDiffPercent).toFixed(0)}% below competitors - room to increase`,
    })
  } else {
    factors.push({
      name: "Competitor Pricing",
      impact: 0,
      description: "Price aligned with market",
    })
  }
  priceMultiplier *= competitorFactor

  // 6. Demand score factor
  const demandFactor = 1 + (input.demandScore - 0.5) * 0.3 // -15% to +15%
  const demandImpact = Math.round((input.demandScore - 0.5) * 30)
  factors.push({
    name: "Demand Level",
    impact: demandImpact,
    description: `Demand score: ${(input.demandScore * 100).toFixed(0)}%`,
  })
  priceMultiplier *= demandFactor

  // 7. Seasonality factor
  const seasonalityImpact = Math.round((input.seasonalityFactor - 1) * 100)
  if (Math.abs(seasonalityImpact) > 5) {
    factors.push({
      name: "Seasonality",
      impact: seasonalityImpact,
      description: seasonalityImpact > 0 ? "Peak season" : "Off-season",
    })
  }
  priceMultiplier *= input.seasonalityFactor

  // 8. Event factor
  if (input.eventFactor > 1.05) {
    const eventImpact = Math.round((input.eventFactor - 1) * 100)
    factors.push({
      name: "Local Events",
      impact: eventImpact,
      description: "Events in area driving demand",
    })
    priceMultiplier *= input.eventFactor
  }

  // 9. Price trend momentum
  if (Math.abs(input.priceHistoryTrend) > 0.1) {
    const trendImpact = Math.round(input.priceHistoryTrend * 10)
    factors.push({
      name: "Price Trend",
      impact: trendImpact,
      description: input.priceHistoryTrend > 0 ? "Prices trending up" : "Prices trending down",
    })
    priceMultiplier *= 1 + input.priceHistoryTrend * 0.05
  }

  // Calculate predicted price
  const predictedPrice = Math.round(input.currentPrice * priceMultiplier)

  // Calculate recommended price (capped at reasonable bounds)
  const minPrice = Math.round(input.currentPrice * 0.7)
  const maxPrice = Math.round(input.currentPrice * 1.5)
  const recommendedPrice = Math.min(maxPrice, Math.max(minPrice, predictedPrice))

  // Determine demand level
  let demandLevel: PredictionOutput["demandLevel"] = "medium"
  if (input.demandScore >= 0.8 || input.currentOccupancy >= 85) {
    demandLevel = "very_high"
  } else if (input.demandScore >= 0.6 || input.currentOccupancy >= 70) {
    demandLevel = "high"
  } else if (input.demandScore < 0.3 || input.currentOccupancy < 40) {
    demandLevel = "low"
  }

  // Determine recommendation
  let recommendation: PredictionOutput["recommendation"] = "maintain"
  const priceDiffPercent = ((recommendedPrice - input.currentPrice) / input.currentPrice) * 100
  if (priceDiffPercent > 5) {
    recommendation = "increase"
  } else if (priceDiffPercent < -5) {
    recommendation = "decrease"
  }

  // Ensure confidence is within bounds
  confidenceScore = Math.min(95, Math.max(40, confidenceScore))

  return {
    date: input.date,
    predictedPrice,
    confidenceScore,
    demandLevel,
    recommendation,
    recommendedPrice,
    priceRange: { min: minPrice, max: maxPrice },
    factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
  }
}

/**
 * Batch prediction for multiple dates
 */
export function predictPricesForRange(inputs: PredictionInput[]): PredictionOutput[] {
  return inputs.map((input) => predictPrice(input))
}

/**
 * Calculate seasonality factor based on historical data
 */
export function calculateSeasonalityFactor(
  month: number,
  historicalData?: { month: number; avgOccupancy: number }[],
): number {
  // Default seasonality if no historical data
  const defaultSeasonality: Record<number, number> = {
    1: 0.85, // January - low
    2: 0.9, // February
    3: 1.0, // March
    4: 1.1, // April - spring break
    5: 1.05, // May
    6: 1.2, // June - summer start
    7: 1.25, // July - peak summer
    8: 1.25, // August - peak summer
    9: 1.1, // September
    10: 1.0, // October
    11: 0.95, // November
    12: 1.15, // December - holidays
  }

  if (!historicalData || historicalData.length === 0) {
    return defaultSeasonality[month] || 1.0
  }

  // Calculate from historical data
  const monthData = historicalData.find((d) => d.month === month)
  const avgOccupancy = historicalData.reduce((sum, d) => sum + d.avgOccupancy, 0) / historicalData.length

  if (monthData) {
    return monthData.avgOccupancy / avgOccupancy
  }

  return defaultSeasonality[month] || 1.0
}

/**
 * Detect if a date is a holiday or special event
 */
export function isHolidayOrEvent(date: Date): { isHoliday: boolean; eventFactor: number; eventName?: string } {
  const month = date.getMonth() + 1
  const day = date.getDate()

  // Israeli holidays (approximate dates - should use a proper calendar)
  const holidays: { month: number; day: number; name: string; factor: number }[] = [
    { month: 1, day: 1, name: "New Year", factor: 1.3 },
    { month: 4, day: 15, name: "Passover", factor: 1.4 },
    { month: 5, day: 14, name: "Independence Day", factor: 1.35 },
    { month: 9, day: 25, name: "Rosh Hashanah", factor: 1.4 },
    { month: 10, day: 4, name: "Yom Kippur", factor: 1.3 },
    { month: 10, day: 9, name: "Sukkot", factor: 1.35 },
    { month: 12, day: 25, name: "Christmas", factor: 1.3 },
    { month: 12, day: 31, name: "New Year Eve", factor: 1.5 },
  ]

  // Check for holidays (within 2 days range)
  for (const holiday of holidays) {
    if (month === holiday.month && Math.abs(day - holiday.day) <= 2) {
      return { isHoliday: true, eventFactor: holiday.factor, eventName: holiday.name }
    }
  }

  return { isHoliday: false, eventFactor: 1.0 }
}

/**
 * Calculate demand score from multiple signals
 */
export function calculateDemandScore(
  occupancy: number,
  bookingVelocity: number, // bookings per day
  searchVolume: number, // relative search interest 0-1
  competitorAvailability: number, // 0-1, lower = less availability = higher demand
): number {
  const weights = {
    occupancy: 0.35,
    velocity: 0.25,
    search: 0.2,
    competition: 0.2,
  }

  const normalizedOccupancy = occupancy / 100
  const normalizedVelocity = Math.min(1, bookingVelocity / 10) // Cap at 10 bookings/day
  const competitionScore = 1 - competitorAvailability

  const score =
    normalizedOccupancy * weights.occupancy +
    normalizedVelocity * weights.velocity +
    searchVolume * weights.search +
    competitionScore * weights.competition

  return Math.min(1, Math.max(0, score))
}
