/**
 * Advanced Prediction Algorithms
 * Includes time series analysis, trend detection, and price optimization
 */

export interface PricePoint {
  date: string
  price: number
  occupancy?: number
  demand?: string
}

export interface TrendAnalysis {
  direction: "up" | "down" | "stable"
  strength: number // 0-1
  velocity: number // rate of change
  confidence: number // 0-1
}

export interface SeasonalPattern {
  period: number // days
  amplitude: number
  phase: number
}

/**
 * Simple Moving Average
 */
export function calculateSMA(prices: number[], window: number): number[] {
  const sma: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < window - 1) {
      sma.push(prices[i]) // Not enough data for window, use actual price
    } else {
      const sum = prices.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0)
      sma.push(sum / window)
    }
  }

  return sma
}

/**
 * Exponential Moving Average - gives more weight to recent prices
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return []

  const k = 2 / (period + 1) // Smoothing factor
  const ema: number[] = [prices[0]]

  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k))
  }

  return ema
}

/**
 * Detect trend in price/occupancy data
 */
export function detectTrend(dataPoints: number[], recentWindow: number = 7): TrendAnalysis {
  if (dataPoints.length < 3) {
    return { direction: "stable", strength: 0, velocity: 0, confidence: 0.3 }
  }

  // Get recent data
  const recent = dataPoints.slice(-Math.min(recentWindow, dataPoints.length))

  // Calculate linear regression
  const n = recent.length
  const x = Array.from({ length: n }, (_, i) => i)
  const y = recent

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)

  // Slope (rate of change)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  // Calculate R² (coefficient of determination)
  const meanY = sumY / n
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0)
  const ssResidual = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + (sumY - slope * sumX) / n
    return sum + Math.pow(yi - predicted, 2)
  }, 0)

  const r2 = 1 - ssResidual / ssTotal
  const confidence = Math.max(0, Math.min(1, r2))

  // Normalize slope to get direction and strength
  const avgValue = meanY
  const normalizedSlope = slope / avgValue // As percentage of average

  let direction: "up" | "down" | "stable" = "stable"
  let strength = Math.abs(normalizedSlope) * 10 // Scale it

  if (normalizedSlope > 0.01 && confidence > 0.3) {
    direction = "up"
  } else if (normalizedSlope < -0.01 && confidence > 0.3) {
    direction = "down"
  }

  strength = Math.min(1, strength)

  return {
    direction,
    strength,
    velocity: normalizedSlope,
    confidence,
  }
}

/**
 * Analyze booking pace compared to historical data
 */
export function analyzeBookingPace(
  currentBookings: number,
  historicalBookingsAtSameLeadTime: number[],
): {
  pace: "ahead" | "behind" | "on_track"
  deviation: number // percentage
  multiplier: number // suggested price multiplier
} {
  if (historicalBookingsAtSameLeadTime.length === 0) {
    return { pace: "on_track", deviation: 0, multiplier: 1.0 }
  }

  const avgHistorical = historicalBookingsAtSameLeadTime.reduce((a, b) => a + b, 0) / historicalBookingsAtSameLeadTime.length
  const deviation = avgHistorical > 0 ? ((currentBookings - avgHistorical) / avgHistorical) * 100 : 0

  let pace: "ahead" | "behind" | "on_track" = "on_track"
  let multiplier = 1.0

  if (deviation > 15) {
    pace = "ahead"
    multiplier = 1.0 + Math.min(0.15, deviation / 200) // Up to +15%
  } else if (deviation < -15) {
    pace = "behind"
    multiplier = 1.0 - Math.min(0.12, Math.abs(deviation) / 200) // Up to -12%
  }

  return { pace, deviation, multiplier }
}

/**
 * Calculate price elasticity - how demand responds to price changes
 * Uses historical data to estimate elasticity
 */
export function estimatePriceElasticity(
  priceChanges: Array<{ oldPrice: number; newPrice: number; oldOccupancy: number; newOccupancy: number }>,
): number {
  if (priceChanges.length === 0) return -1.2 // Default elasticity

  let totalElasticity = 0
  let validSamples = 0

  for (const change of priceChanges) {
    const priceChangePercent = ((change.newPrice - change.oldPrice) / change.oldPrice) * 100
    const occupancyChangePercent = ((change.newOccupancy - change.oldOccupancy) / change.oldOccupancy) * 100

    if (priceChangePercent !== 0) {
      const elasticity = occupancyChangePercent / priceChangePercent
      totalElasticity += elasticity
      validSamples++
    }
  }

  if (validSamples === 0) return -1.2

  return totalElasticity / validSamples
}

/**
 * Optimize price based on elasticity and revenue maximization
 */
export function optimizePrice(
  currentPrice: number,
  currentOccupancy: number,
  totalRooms: number,
  elasticity: number,
  targetOccupancy: number = 75,
): {
  optimalPrice: number
  expectedOccupancy: number
  expectedRevenue: number
  reasoning: string
} {
  // If occupancy is at target, maintain price
  if (Math.abs(currentOccupancy - targetOccupancy) < 5) {
    return {
      optimalPrice: currentPrice,
      expectedOccupancy: currentOccupancy,
      expectedRevenue: currentPrice * (currentOccupancy / 100) * totalRooms,
      reasoning: "Occupancy near target, maintaining price",
    }
  }

  // Calculate price adjustment to reach target occupancy
  const occupancyGap = targetOccupancy - currentOccupancy
  const priceChangePercent = occupancyGap / elasticity // If elasticity is -1.2 and we need +10% occupancy, reduce price by 8.3%

  // Limit price changes to ±20%
  const limitedPriceChange = Math.max(-20, Math.min(20, priceChangePercent))
  const optimalPrice = Math.round(currentPrice * (1 + limitedPriceChange / 100))

  const expectedOccupancy = currentOccupancy + limitedPriceChange * elasticity

  const expectedRevenue = optimalPrice * (expectedOccupancy / 100) * totalRooms

  let reasoning = ""
  if (currentOccupancy < targetOccupancy - 10) {
    reasoning = `Low occupancy (${currentOccupancy.toFixed(1)}%) - reducing price to increase bookings`
  } else if (currentOccupancy > targetOccupancy + 10) {
    reasoning = `High occupancy (${currentOccupancy.toFixed(1)}%) - increasing price to maximize revenue`
  } else {
    reasoning = "Fine-tuning price to optimize revenue"
  }

  return {
    optimalPrice,
    expectedOccupancy,
    expectedRevenue,
    reasoning,
  }
}

/**
 * Detect seasonal patterns in historical data
 */
export function detectSeasonality(dataPoints: PricePoint[]): SeasonalPattern | null {
  if (dataPoints.length < 30) return null

  // Extract prices
  const prices = dataPoints.map((p) => p.price)

  // Test for weekly seasonality (7 days)
  const weeklyScore = calculateSeasonalityScore(prices, 7)

  // Test for bi-weekly seasonality (14 days)
  const biWeeklyScore = calculateSeasonalityScore(prices, 14)

  // Test for monthly seasonality (30 days)
  const monthlyScore = calculateSeasonalityScore(prices, 30)

  // Find the strongest pattern
  const patterns = [
    { period: 7, score: weeklyScore },
    { period: 14, score: biWeeklyScore },
    { period: 30, score: monthlyScore },
  ]

  const strongest = patterns.reduce((max, p) => (p.score > max.score ? p : max))

  if (strongest.score < 0.3) return null // No strong seasonality

  return {
    period: strongest.period,
    amplitude: strongest.score,
    phase: 0, // Could be calculated for more precision
  }
}

function calculateSeasonalityScore(data: number[], period: number): number {
  if (data.length < period * 2) return 0

  const cycles = Math.floor(data.length / period)
  let totalCorrelation = 0

  for (let i = 0; i < cycles - 1; i++) {
    const cycle1 = data.slice(i * period, (i + 1) * period)
    const cycle2 = data.slice((i + 1) * period, (i + 2) * period)

    const correlation = calculateCorrelation(cycle1, cycle2)
    totalCorrelation += correlation
  }

  return totalCorrelation / (cycles - 1)
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0

  const n = x.length
  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX
    const diffY = y[i] - meanY
    numerator += diffX * diffY
    denomX += diffX * diffX
    denomY += diffY * diffY
  }

  const denominator = Math.sqrt(denomX * denomY)

  if (denominator === 0) return 0

  return numerator / denominator
}

/**
 * Forecast future prices using weighted historical data
 */
export function forecastPrice(
  historicalPrices: PricePoint[],
  daysAhead: number,
  basePrice: number,
): { forecasted: number; confidence: number } {
  if (historicalPrices.length < 7) {
    return { forecasted: basePrice, confidence: 0.3 }
  }

  // Sort by date
  const sorted = [...historicalPrices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Get recent prices (last 30 days)
  const recentPrices = sorted.slice(-30).map((p) => p.price)

  // Calculate EMA
  const ema = calculateEMA(recentPrices, 7)
  const latestEMA = ema[ema.length - 1]

  // Detect trend
  const trend = detectTrend(recentPrices)

  // Project forward
  const trendAdjustment = trend.velocity * daysAhead * latestEMA
  const forecasted = Math.round(latestEMA + trendAdjustment)

  // Confidence decreases with days ahead
  const timeDecay = Math.max(0.3, 1 - daysAhead / 60)
  const confidence = trend.confidence * timeDecay

  return {
    forecasted: Math.max(basePrice * 0.7, Math.min(basePrice * 1.5, forecasted)),
    confidence,
  }
}

/**
 * Machine Learning-like prediction using weighted factors
 */
export function mlPrediction(
  basePrice: number,
  features: {
    historicalAvg: number
    competitorAvg: number
    occupancy: number
    leadTime: number
    seasonalityFactor: number
    trendVelocity: number
    eventImpact: number
  },
): number {
  // Weights learned from "training" (these would normally be learned from data)
  const weights = {
    historical: 0.25,
    competitor: 0.25,
    occupancy: 0.2,
    leadTime: 0.1,
    seasonality: 0.15,
    trend: 0.05,
  }

  // Normalize features
  const historicalFactor = features.historicalAvg / basePrice
  const competitorFactor = features.competitorAvg / basePrice
  const occupancyFactor = 0.85 + (features.occupancy / 100) * 0.3 // Maps 0-100% to 0.85-1.15
  const leadTimeFactor = features.leadTime < 7 ? 1.1 : features.leadTime < 30 ? 1.0 : 0.95
  const trendFactor = 1.0 + features.trendVelocity

  // Weighted combination
  const prediction =
    basePrice *
    (historicalFactor * weights.historical +
      competitorFactor * weights.competitor +
      occupancyFactor * weights.occupancy +
      leadTimeFactor * weights.leadTime +
      features.seasonalityFactor * weights.seasonality +
      trendFactor * weights.trend)

  return Math.round(prediction * features.eventImpact)
}
