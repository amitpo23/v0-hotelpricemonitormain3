/**
 * Advanced Prediction Algorithms Library
 * Enhanced ML-based price prediction with multi-source intelligence
 */

import { buildPredictionContext, formatContextForPrompt, combinePredictions } from "./rag/prediction-context"
import { getHotelPricingInsights } from "./llm/perplexity-client"
import { weatherService } from "./external/weather-service"
import { bookingVelocityTracker } from "./analytics/booking-velocity"
import { yoyService } from "./analytics/year-over-year"
import { featureEngineer } from "./features/feature-engineering"
import type { SupabaseClient } from "@supabase/supabase-js"

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
  
  // Enhanced fields (optional for backward compatibility)
  weatherScore?: number
  bookingVelocity7d?: number
  bookingVelocity30d?: number
  bookingMomentumScore?: number
  yoyPriceChange?: number
  yoySeasonalIndex?: number
  competitorPriceStd?: number
  pricePositionVsCompetitors?: number
  dataQualityScore?: number
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

  // 9. Weather factor (NEW!)
  if (input.weatherScore !== undefined && input.weatherFactor !== undefined) {
    const weatherImpact = Math.round(input.weatherScore * 15)
    if (Math.abs(weatherImpact) > 3) {
      factors.push({
        name: "Weather Conditions",
        impact: weatherImpact,
        description: weatherImpact > 0 ? "Excellent weather forecast" : "Poor weather expected",
      })
      priceMultiplier *= input.weatherFactor
      confidenceScore += Math.abs(weatherImpact) / 3 // More confident with weather data
    }
  }

  // 10. Booking velocity (NEW!)
  if (input.bookingVelocity7d !== undefined && input.bookingVelocity30d !== undefined) {
    const velocityTrend = input.bookingVelocity7d - input.bookingVelocity30d
    if (velocityTrend > 0.2) {
      // Accelerating bookings
      const velocityImpact = Math.min(Math.round(velocityTrend * 25), 15)
      factors.push({
        name: "Booking Acceleration",
        impact: velocityImpact,
        description: `Bookings accelerating rapidly (+${velocityImpact}% boost)`,
      })
      priceMultiplier *= 1 + velocityImpact / 100
      confidenceScore += 8
    } else if (velocityTrend < -0.2) {
      // Slowing bookings
      const velocityImpact = Math.max(Math.round(velocityTrend * 25), -10)
      factors.push({
        name: "Booking Slowdown",
        impact: velocityImpact,
        description: `Booking pace slowing (${velocityImpact}% adjustment)`,
      })
      priceMultiplier *= 1 + velocityImpact / 100
      confidenceScore -= 3
    }
  }

  // 11. Booking momentum (NEW!)
  if (input.bookingMomentumScore !== undefined && input.bookingMomentumScore > 0.7) {
    const momentumImpact = Math.round((input.bookingMomentumScore - 0.5) * 20)
    factors.push({
      name: "High Booking Momentum",
      impact: momentumImpact,
      description: "Strong recent booking activity",
    })
    priceMultiplier *= 1 + momentumImpact / 100
    confidenceScore += 5
  }

  // 12. Year-over-Year patterns (NEW!)
  if (input.yoyPriceChange !== undefined && input.yoySeasonalIndex !== undefined) {
    // Apply seasonal index
    if (Math.abs(input.yoySeasonalIndex - 1) > 0.1) {
      const seasonalImpact = Math.round((input.yoySeasonalIndex - 1) * 100)
      factors.push({
        name: "Seasonal Pattern (YoY)",
        impact: seasonalImpact,
        description: `Historical seasonal pattern: ${seasonalImpact > 0 ? 'high' : 'low'} season`,
      })
      priceMultiplier *= input.yoySeasonalIndex
      confidenceScore += 10 // YoY data is very reliable
    }
  }

  // 13. Price position vs competitors (NEW!)
  if (input.pricePositionVsCompetitors !== undefined && input.competitorPriceStd !== undefined) {
    const position = input.pricePositionVsCompetitors
    if (position < -0.5) {
      // We're significantly cheaper - room to increase
      const positionImpact = Math.round(Math.abs(position) * 10)
      factors.push({
        name: "Competitive Price Position",
        impact: positionImpact,
        description: "Priced below market - opportunity to increase",
      })
      priceMultiplier *= 1 + positionImpact / 100
    } else if (position > 0.5) {
      // We're significantly more expensive - may need to adjust
      const positionImpact = -Math.round(position * 8)
      factors.push({
        name: "Competitive Price Position",
        impact: positionImpact,
        description: "Priced above market - consider adjustment",
      })
      priceMultiplier *= 1 + positionImpact / 100
    }
  }

  // 9. Price trend momentum (kept from original)
  if (Math.abs(input.priceHistoryTrend) > 0.1) {
    const trendImpact = Math.round(input.priceHistoryTrend * 10)
    factors.push({
      name: "Price Trend",
      impact: trendImpact,
      description: input.priceHistoryTrend > 0 ? "Prices trending up" : "Prices trending down",
    })
    priceMultiplier *= 1 + input.priceHistoryTrend * 0.05
  }

  // Adjust confidence based on data quality
  if (input.dataQualityScore !== undefined) {
    confidenceScore = Math.round(confidenceScore * input.dataQualityScore)
    if (input.dataQualityScore < 0.7) {
      factors.push({
        name: "Data Quality",
        impact: -Math.round((1 - input.dataQualityScore) * 20),
        description: `Limited data availability (${Math.round(input.dataQualityScore * 100)}% complete)`,
      })
    }
  }

  // Calculate predicted price
  const predictedPrice = Math.round(input.currentPrice * priceMultiplier)

  // ===== PRICING CONSTRAINTS =====
  // Apply strict pricing floors based on user requirements
  const ABSOLUTE_MINIMUM = 300 // Hard floor: never go below ₪300
  
  // Calculate market-based minimums
  const marketMinimums: number[] = [ABSOLUTE_MINIMUM]
  
  // 1. Don't go below competitor average (primary market constraint)
  const competitorFloor = input.competitorAvgPrice
  if (competitorFloor > 0) {
    marketMinimums.push(competitorFloor)
  }
  
  // 2. Don't go below government statistics baseline (approximated as 85% of competitor avg)
  // In production, this should come from actual CBS/tourism ministry data
  const govStatsFloor = input.competitorAvgPrice * 0.85
  if (govStatsFloor > 0) {
    marketMinimums.push(govStatsFloor)
  }
  
  // 3. Don't discount more than 30% below current price
  const currentPriceFloor = input.currentPrice * 0.70
  marketMinimums.push(currentPriceFloor)
  
  // Apply the HIGHEST floor (most restrictive constraint wins)
  const minPrice = Math.round(Math.max(...marketMinimums))
  const maxPrice = Math.round(input.currentPrice * 1.5)
  
  // Apply constraints and ensure we never go below the floor
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
 * Enhanced prediction using all available data sources (NEW!)
 * Integrates weather, booking velocity, YoY patterns, and more
 */
export async function predictPriceEnhanced(
  hotelId: string,
  targetDate: string,
  currentPrice: number,
  location: string = 'Tel Aviv'
): Promise<PredictionOutput> {
  try {
    // Generate comprehensive features
    const features = await featureEngineer.generateFeatures(hotelId, targetDate, location)

    // Build enhanced prediction input
    const enhancedInput: PredictionInput = {
      date: targetDate,
      dayOfWeek: features.dayOfWeek,
      isWeekend: features.isWeekend,
      isHoliday: features.isHoliday,
      daysUntilDate: features.daysUntilCheckIn,
      currentOccupancy: features.currentOccupancy,
      historicalOccupancy: features.historicalOccupancy,
      currentPrice,
      competitorAvgPrice: features.competitorAvgPrice,
      competitorBookingPrice: features.competitorAvgPrice, // Simplified
      competitorExpediaPrice: features.competitorAvgPrice, // Simplified
      demandScore: features.demandScore,
      seasonalityFactor: features.seasonalIndex,
      eventFactor: 1 + features.eventImpactScore,
      weatherFactor: features.weatherMultiplier,
      priceHistoryTrend: features.currentPriceMomentum,
      
      // Enhanced fields
      weatherScore: features.weatherScore,
      bookingVelocity7d: features.bookingVelocity7d,
      bookingVelocity30d: features.bookingVelocity30d,
      bookingMomentumScore: features.bookingMomentumScore,
      yoyPriceChange: features.yoyPriceChange,
      yoySeasonalIndex: features.seasonalIndex,
      competitorPriceStd: features.competitorPriceStd,
      pricePositionVsCompetitors: features.pricePositionVsCompetitors,
      dataQualityScore: features.dataQuality,
    }

    // Run prediction with enhanced features
    const prediction = predictPrice(enhancedInput)

    // Boost confidence if data quality is high
    if (features.dataQuality > 0.8 && features.confidenceLevel > 0.7) {
      prediction.confidenceScore = Math.min(95, prediction.confidenceScore + 10)
    }

    return prediction
  } catch (error) {
    console.error('Enhanced prediction error:', error)
    // Fallback to basic prediction
    return predictPrice({
      date: targetDate,
      dayOfWeek: new Date(targetDate).getDay(),
      isWeekend: [5, 6].includes(new Date(targetDate).getDay()),
      isHoliday: false,
      daysUntilDate: Math.floor((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      currentOccupancy: 50,
      historicalOccupancy: 55,
      currentPrice,
      competitorAvgPrice: currentPrice,
      competitorBookingPrice: currentPrice,
      competitorExpediaPrice: currentPrice,
      demandScore: 0.5,
      seasonalityFactor: 1.0,
      eventFactor: 1.0,
      priceHistoryTrend: 0,
    })
  }
}

/**
 * Batch enhanced prediction for multiple dates
 */
export async function predictPricesEnhancedBatch(
  hotelId: string,
  dates: string[],
  currentPrice: number,
  location: string = 'Tel Aviv'
): Promise<PredictionOutput[]> {
  const predictions = await Promise.all(
    dates.map(date => predictPriceEnhanced(hotelId, date, currentPrice, location))
  )
  return predictions
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

/**
 * Enhanced prediction with RAG+LLM
 */
export async function predictPriceWithAI(
  input: PredictionInput,
  supabase: SupabaseClient,
  hotelId: string,
  enableLLM = true,
): Promise<PredictionOutput> {
  // Get base algorithmic prediction
  const algorithmicPrediction = predictPrice(input)

  // If LLM disabled or no API key, return algorithmic prediction
  if (!enableLLM || !process.env.PERPLEXITY_API_KEY) {
    console.log("[Prediction] LLM disabled or API key missing, using algorithmic prediction only")
    return algorithmicPrediction
  }

  try {
    // Build context from historical data
    const targetDate = new Date(input.date)
    const context = await buildPredictionContext(supabase, hotelId, targetDate)

    // Get LLM insights
    const llmInsight = await getHotelPricingInsights({
      hotelName: context.hotelName,
      location: context.location,
      date: input.date,
      competitorPrices: context.competitorPrices.map((c) => ({
        name: c.name,
        price: c.avgPrice,
      })),
      currentOccupancy: input.currentOccupancy,
      historicalContext: formatContextForPrompt(context),
    })

    // Combine predictions
    const enhancedPrediction = combinePredictions(algorithmicPrediction, llmInsight)

    console.log("[Prediction] Enhanced with AI insights:", {
      algorithmic: algorithmicPrediction.recommendedPrice,
      llm: llmInsight.suggestedPrice,
      final: enhancedPrediction.recommendedPrice,
    })

    return enhancedPrediction
  } catch (error) {
    console.error("[Prediction] AI enhancement failed, falling back to algorithmic:", error)
    return algorithmicPrediction
  }
}

/**
 * 🎯 NEW: Enhanced prediction using Decision Agent for dynamic weighting
 * This is the future-proof version that adapts to changing conditions
 */
export interface DecisionAgentPredictionInput extends PredictionInput {
  decisionData?: {
    recommendation: 'increase' | 'decrease' | 'maintain'
    suggestedPriceMultiplier: number
    confidence: number
    reasoning: string[]
    dominantFactors: Array<{
      factor: string
      weight: number
      impact: string
    }>
  }
}

export function predictPriceWithDecisionAgent(input: DecisionAgentPredictionInput): PredictionOutput {
  // If we have Decision Agent data, use it as the primary source
  if (input.decisionData) {
    const { decisionData } = input
    const basePrediction = predictPrice(input) // Get traditional prediction
    
    // Combine Decision Agent wisdom with traditional algorithm
    const decisionWeight = decisionData.confidence
    const traditionalWeight = 1 - decisionWeight
    
    // Calculate Decision Agent suggested price
    const decisionPrice = input.currentPrice * decisionData.suggestedPriceMultiplier
    
    // Weighted average
    const finalPrice = (decisionPrice * decisionWeight) + (basePrediction.predictedPrice * traditionalWeight)
    
    // Build enhanced factors from Decision Agent
    const enhancedFactors: PredictionFactor[] = [
      {
        name: "Decision Agent Recommendation",
        impact: Math.round((decisionData.suggestedPriceMultiplier - 1) * 100),
        description: `${decisionData.recommendation.toUpperCase()}: ${decisionData.reasoning[0] || 'Intelligent multi-agent analysis'}`
      },
      ...decisionData.dominantFactors.map(f => ({
        name: f.factor,
        impact: Math.round((parseFloat(f.impact) - 1) * 100),
        description: `Weight: ${(f.weight * 100).toFixed(0)}% - ${f.impact}`
      })),
      ...basePrediction.factors.slice(0, 3) // Keep top 3 traditional factors for context
    ]
    
    // Calculate enhanced confidence
    const baseConfidence = basePrediction.confidenceScore
    const decisionConfidence = decisionData.confidence * 100
    const enhancedConfidence = Math.min(
      Math.round((decisionConfidence * 0.7) + (baseConfidence * 0.3)),
      95 // Cap at 95% to avoid overconfidence
    )
    
    // Determine demand level based on price movement
    let demandLevel: "low" | "medium" | "high" | "very_high"
    if (decisionData.recommendation === 'increase' && decisionData.suggestedPriceMultiplier > 1.2) {
      demandLevel = 'very_high'
    } else if (decisionData.recommendation === 'increase') {
      demandLevel = 'high'
    } else if (decisionData.recommendation === 'decrease') {
      demandLevel = 'low'
    } else {
      demandLevel = 'medium'
    }
    
    return {
      date: input.date,
      predictedPrice: Math.round(finalPrice),
      confidenceScore: enhancedConfidence,
      demandLevel,
      recommendation: decisionData.recommendation,
      recommendedPrice: Math.round(finalPrice),
      priceRange: {
        min: Math.round(finalPrice * 0.92),
        max: Math.round(finalPrice * 1.08)
      },
      factors: enhancedFactors
    }
  }
  
  // Fallback to traditional algorithm if no Decision Agent data
  console.log('[Prediction] No Decision Agent data available, using traditional algorithm')
  return predictPrice(input)
}
/**
 * Calculate demand forecast based on date and price statistics
 * Used by the cron job for automated predictions
 */
export function calculateDemandForecast(
  date: Date,
  priceStats: { avgPrice: number; minPrice: number; maxPrice: number; dataPoints: number }
): number {
  const dayOfWeek = date.getDay()
  const month = date.getMonth() + 1
  
  // Base demand factor
  let demandMultiplier = 1.0
  
  // Weekend boost
  if (dayOfWeek === 5 || dayOfWeek === 6) {
    demandMultiplier *= 1.15
  }
  
  // Seasonal adjustment
  const seasonalFactors: Record<number, number> = {
    1: 0.85, 2: 0.90, 3: 1.00, 4: 1.15,
    5: 1.10, 6: 1.25, 7: 1.30, 8: 1.30,
    9: 1.10, 10: 1.00, 11: 0.95, 12: 1.20
  }
  demandMultiplier *= seasonalFactors[month] || 1.0
  
  // Check for holidays
  const { isHoliday, eventFactor } = isHolidayOrEvent(date)
  if (isHoliday) {
    demandMultiplier *= eventFactor
  }
  
  return demandMultiplier
}

/**
 * Calculate seasonal multiplier for a given date
 */
export function calculateSeasonalMultiplier(date: Date): number {
  const month = date.getMonth() + 1
  
  const seasonalMultipliers: Record<number, number> = {
    1: 0.85,  // January - low season
    2: 0.90,  // February
    3: 1.00,  // March
    4: 1.15,  // April - Passover, spring break
    5: 1.10,  // May
    6: 1.25,  // June - summer start
    7: 1.30,  // July - peak summer
    8: 1.30,  // August - peak summer
    9: 1.15,  // September - Jewish holidays
    10: 1.05, // October - Sukkot
    11: 0.95, // November
    12: 1.20  // December - Christmas, New Year
  }
  
  return seasonalMultipliers[month] || 1.0
}

/**
 * Calculate competitor influence on pricing
 */
export function calculateCompetitorInfluence(
  ourAvgPrice: number,
  competitorMinPrice: number,
  competitorMaxPrice: number
): number {
  if (!competitorMinPrice || !competitorMaxPrice) {
    return 0
  }
  
  const competitorAvgPrice = (competitorMinPrice + competitorMaxPrice) / 2
  
  // Calculate price position relative to competitors
  const priceDiff = (competitorAvgPrice - ourAvgPrice) / ourAvgPrice
  
  // Clamp influence between -0.2 and 0.2
  return Math.max(-0.2, Math.min(0.2, priceDiff))
}

/**
 * Apply pricing strategy with min/max bounds
 */
export function applyPricingStrategy(
  recommendedPrice: number,
  basePrice: number,
  minMultiplier: number = 0.7,
  maxMultiplier: number = 2.0
): number {
  const minPrice = basePrice * minMultiplier
  const maxPrice = basePrice * maxMultiplier
  
  return Math.max(minPrice, Math.min(maxPrice, recommendedPrice))
}