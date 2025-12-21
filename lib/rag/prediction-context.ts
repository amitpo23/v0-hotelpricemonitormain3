/**
 * RAG (Retrieval-Augmented Generation) Context Builder
 * Builds rich context from historical data for LLM-enhanced predictions
 */

import type { SupabaseClient } from "@supabase/supabase-js"

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
 * Format context for LLM prompt
 */
export function formatContextForPrompt(context: PredictionContext): string {
  return `
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
