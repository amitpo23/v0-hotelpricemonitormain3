/**
 * RAG (Retrieval-Augmented Generation) Context Builder - Enhanced
 * Builds rich context from multiple data sources for LLM predictions
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { weatherService } from "@/lib/external/weather-service"
import { bookingVelocityTracker } from "@/lib/analytics/booking-velocity"
import { yoyService } from "@/lib/analytics/year-over-year"

interface HistoricalPriceData {
  date: string
  price: number
  occupancy: number
  demand: string
}

interface CompetitorData {
  name: string
  avgPrice: number
  priceRange: { min: number; max: number }
}

interface PredictionContext {
  hotelName: string
  location: string
  targetDate: string
  currentPrice: number
  currentOccupancy: number
  historicalPrices: HistoricalPriceData[]
  competitorPrices: CompetitorData[]
  recentTrends: string
  seasonalPattern: string
  marketContext: string
  
  // Enhanced context (NEW!)
  weatherForecast?: string
  bookingMomentum?: string
  yoyComparison?: string
  demandSignals?: string
  dataQuality?: number
}

/**
 * Build context from historical price data
 */
export async function buildPredictionContext(
  supabase: SupabaseClient,
  hotelId: string,
  targetDate: Date,
): Promise<PredictionContext> {
  // Get hotel info
  const { data: hotel } = await supabase.from("hotels").select("name, location").eq("id", hotelId).single()

  // Get historical prices (last 90 days)
  const ninetyDaysAgo = new Date(targetDate)
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: historicalPrices } = await supabase
    .from("daily_prices")
    .select("date, our_price, occupancy_forecast, demand_level")
    .eq("hotel_id", hotelId)
    .gte("date", ninetyDaysAgo.toISOString().split("T")[0])
    .lt("date", targetDate.toISOString().split("T")[0])
    .order("date", { ascending: false })
    .limit(90)

  // Get competitor data
  const { data: competitors } = await supabase
    .from("hotel_competitors")
    .select("competitor_hotel_name, competitor_daily_prices(price)")
    .eq("hotel_id", hotelId)
    .eq("is_active", true)

  // Get current price
  const { data: currentPriceData } = await supabase
    .from("daily_prices")
    .select("our_price, occupancy_forecast")
    .eq("hotel_id", hotelId)
    .eq("date", new Date().toISOString().split("T")[0])
    .single()

  // Transform historical data
  const historicalData: HistoricalPriceData[] = (historicalPrices || []).map((p) => ({
    date: p.date,
    price: p.our_price || 0,
    occupancy: p.occupancy_forecast || 0,
    demand: p.demand_level || "medium",
  }))

  // Aggregate competitor data
  const competitorData: CompetitorData[] = (competitors || []).map((c) => {
    const prices = c.competitor_daily_prices?.map((p: any) => p.price || 0) || []
    return {
      name: c.competitor_hotel_name,
      avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
    }
  })

  // Analyze trends
  const recentTrends = analyzeRecentTrends(historicalData)
  const seasonalPattern = detectSeasonalPattern(historicalData, targetDate)
  const marketContext = buildMarketContext(historicalData, competitorData)

  return {
    hotelName: hotel?.name || "Unknown Hotel",
    location: hotel?.location || "Unknown Location",
    targetDate: targetDate.toISOString().split("T")[0],
    currentPrice: currentPriceData?.our_price || 0,
    currentOccupancy: currentPriceData?.occupancy_forecast || 0,
    historicalPrices: historicalData,
    competitorPrices: competitorData,
    recentTrends,
    seasonalPattern,
    marketContext,
  }
}

/**
 * Build enhanced prediction context with all data sources (NEW!)
 */
export async function buildEnhancedPredictionContext(
  supabase: SupabaseClient,
  hotelId: string,
  targetDate: Date,
  location: string = 'Tel Aviv'
): Promise<PredictionContext> {
  // Get base context
  const baseContext = await buildPredictionContext(supabase, hotelId, targetDate)
  
  const targetDateStr = targetDate.toISOString().split('T')[0]
  
  try {
    // Fetch enhanced data in parallel
    const [
      weatherImpact,
      bookingVelocity,
      yoyComparison,
      bookingMomentum,
    ] = await Promise.all([
      weatherService.getWeatherImpact(location, targetDateStr),
      bookingVelocityTracker.getVelocityForDate(hotelId, targetDateStr),
      yoyService.compareYearOverYear(hotelId, targetDateStr, 3),
      bookingVelocityTracker.getBookingMomentum(hotelId),
    ])

    // Build enhanced context strings
    const weatherForecast = `Weather: ${weatherImpact.temp}°C, ${weatherImpact.condition}. ${weatherImpact.reasoning}. Impact: ${weatherImpact.score > 0 ? '+' : ''}${(weatherImpact.score * 100).toFixed(0)}%`

    const bookingMomentumStr = `Booking velocity: ${bookingVelocity.velocity7d.toFixed(2)}/day (last 7d), ${bookingVelocity.velocity30d.toFixed(2)}/day (last 30d). Trend: ${bookingVelocity.trend}. ${bookingVelocity.reasoning}. Momentum: ${bookingMomentum.momentum} (score: ${(bookingMomentum.score * 100).toFixed(0)}%).`

    const yoyComparisonStr = yoyComparison.historicalPrices.length > 0
      ? `Year-over-year: ${yoyComparison.pattern} (${yoyComparison.priceChange > 0 ? '+' : ''}${yoyComparison.priceChange.toFixed(1)}% vs last year). Seasonal index: ${yoyComparison.seasonalIndex.toFixed(2)}. ${yoyComparison.reasoning}`
      : 'No year-over-year data available'

    const demandSignalsStr = `Demand score: ${(bookingVelocity.demandScore * 100).toFixed(0)}%. Recent bookings: ${bookingVelocity.recentBookings} in last 7 days (${bookingVelocity.totalBookings} total for this date). Booking momentum: ${bookingMomentum.reasoning}.`

    // Calculate data quality
    const dataQuality = (
      (weatherImpact.score !== 0 ? 0.25 : 0) +
      (bookingVelocity.totalBookings > 0 ? 0.25 : 0) +
      (yoyComparison.historicalPrices.length > 0 ? 0.25 : 0) +
      (baseContext.competitorPrices.length > 0 ? 0.25 : 0)
    )

    return {
      ...baseContext,
      weatherForecast,
      bookingMomentum: bookingMomentumStr,
      yoyComparison: yoyComparisonStr,
      demandSignals: demandSignalsStr,
      dataQuality,
    }
  } catch (error) {
    console.error('Error building enhanced context:', error)
    return {
      ...baseContext,
      weatherForecast: 'Weather data unavailable',
      bookingMomentum: 'Booking momentum data unavailable',
      yoyComparison: 'Year-over-year data unavailable',
      demandSignals: 'Demand signals unavailable',
      dataQuality: 0.25, // Only base context available
    }
  }
}

/**
 * Analyze recent pricing trends
 */
function analyzeRecentTrends(historicalData: HistoricalPriceData[]): string {
  if (historicalData.length < 7) return "Insufficient data for trend analysis"

  const recentWeek = historicalData.slice(0, 7)
  const previousWeek = historicalData.slice(7, 14)

  const recentAvg = recentWeek.reduce((sum, d) => sum + d.price, 0) / recentWeek.length
  const previousAvg = previousWeek.reduce((sum, d) => sum + d.price, 0) / previousWeek.length

  const change = ((recentAvg - previousAvg) / previousAvg) * 100

  if (change > 5) return `Prices trending up (+${change.toFixed(1)}% vs last week)`
  if (change < -5) return `Prices trending down (${change.toFixed(1)}% vs last week)`
  return "Prices stable"
}

/**
 * Detect seasonal patterns
 */
function detectSeasonalPattern(historicalData: HistoricalPriceData[], targetDate: Date): string {
  const targetMonth = targetDate.getMonth()
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  // Find historical data for same month
  const sameMonthData = historicalData.filter((d) => new Date(d.date).getMonth() === targetMonth)

  if (sameMonthData.length === 0) {
    return `${monthNames[targetMonth]} - no historical data available`
  }

  const avgPrice = sameMonthData.reduce((sum, d) => sum + d.price, 0) / sameMonthData.length
  const avgOccupancy = sameMonthData.reduce((sum, d) => sum + d.occupancy, 0) / sameMonthData.length

  return `${monthNames[targetMonth]} typically averages $${avgPrice.toFixed(0)} with ${avgOccupancy.toFixed(0)}% occupancy`
}

/**
 * Build market context summary
 */
function buildMarketContext(historicalData: HistoricalPriceData[], competitorData: CompetitorData[]): string {
  const avgPrice = historicalData.reduce((sum, d) => sum + d.price, 0) / historicalData.length
  const avgOccupancy = historicalData.reduce((sum, d) => sum + d.occupancy, 0) / historicalData.length

  const competitorAvg = competitorData.reduce((sum, c) => sum + c.avgPrice, 0) / (competitorData.length || 1)

  const competitive = avgPrice < competitorAvg ? "below" : "above"
  const diff = Math.abs(((avgPrice - competitorAvg) / competitorAvg) * 100)

  return `Historical average: $${avgPrice.toFixed(0)} at ${avgOccupancy.toFixed(0)}% occupancy. Currently priced ${diff.toFixed(0)}% ${competitive} market average ($${competitorAvg.toFixed(0)})`
}

/**
 * Format context for LLM prompt (Enhanced)
 */
export function formatContextForPrompt(context: PredictionContext): string {
  return `
Hotel: ${context.hotelName} in ${context.location}
Target Date: ${context.targetDate}
Current Price: $${context.currentPrice}
Current Occupancy: ${context.currentOccupancy}%

Historical Performance (Last 90 Days):
${context.historicalPrices
  .slice(0, 10)
  .map((p) => `${p.date}: $${p.price} (${p.occupancy}% occupancy, ${p.demand} demand)`)
  .join("\n")}

Recent Trends:
${context.recentTrends}

Seasonal Pattern:
${context.seasonalPattern}

Market Context:
${context.marketContext}

Competitor Positioning:
${context.competitorPrices.map((c) => `${c.name}: $${c.avgPrice.toFixed(0)} (range: $${c.priceRange.min}-$${c.priceRange.max})`).join("\n")}

${context.weatherForecast ? `\nWeather Forecast:\n${context.weatherForecast}\n` : ''}${context.bookingMomentum ? `\nBooking Momentum:\n${context.bookingMomentum}\n` : ''}${context.yoyComparison ? `\nYear-over-Year Comparison:\n${context.yoyComparison}\n` : ''}${context.demandSignals ? `\nDemand Signals:\n${context.demandSignals}\n` : ''}${context.dataQuality !== undefined ? `\nData Quality: ${(context.dataQuality * 100).toFixed(0)}%\n` : ''}
`
}

/**
 * Combine LLM insights with algorithmic prediction
 */
export function combinePredictions(
  algorithmicPrediction: any,
  llmInsight: any,
  weight: { algorithm: number; llm: number } = { algorithm: 0.6, llm: 0.4 },
) {
  // Blend recommended prices
  const blendedPrice = Math.round(
    algorithmicPrediction.recommendedPrice * weight.algorithm + llmInsight.suggestedPrice * weight.llm,
  )

  // Average confidence scores
  const blendedConfidence = Math.round(
    algorithmicPrediction.confidenceScore * weight.algorithm + llmInsight.confidence * weight.llm,
  )

  // Determine final recommendation
  let recommendation = algorithmicPrediction.recommendation
  if (algorithmicPrediction.recommendation !== llmInsight.recommendation) {
    // If they disagree, use LLM if it has high confidence
    if (llmInsight.confidence > 75) {
      recommendation = llmInsight.recommendation
    }
  }

  return {
    ...algorithmicPrediction,
    recommendedPrice: blendedPrice,
    confidenceScore: blendedConfidence,
    recommendation,
    aiInsights: {
      reasoning: llmInsight.reasoning,
      marketTrends: llmInsight.marketTrends,
      risks: llmInsight.risks,
      opportunities: llmInsight.opportunities,
    },
  }
}
