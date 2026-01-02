/**
 * Revenue Calculator - Single Source of Truth
 * 
 * This is the ONLY place where revenue calculations should happen.
 * All APIs and components must use these functions to ensure consistency.
 */

interface Hotel {
  id: string
  name?: string
  total_rooms: number
  base_price: number
}

interface RevenueCalculationInput {
  price: number
  rooms: number
  occupancy: number // 0-100
  days?: number
}

interface RevenueCalculationResult {
  revenue: number
  dailyRevenue: number
  formula: string
  breakdown: {
    price: number
    rooms: number
    occupancy: number
    days: number
  }
}

/**
 * Calculate revenue using the standard formula
 * Formula: price × rooms × (occupancy / 100) × days
 */
export function calculateRevenue(input: RevenueCalculationInput): RevenueCalculationResult {
  const { price, rooms, occupancy, days = 1 } = input
  
  // Validate inputs
  if (price < 0 || rooms < 0 || occupancy < 0 || occupancy > 100 || days < 0) {
    throw new Error('Invalid input parameters for revenue calculation')
  }
  
  const dailyRevenue = price * rooms * (occupancy / 100)
  const totalRevenue = dailyRevenue * days
  
  return {
    revenue: Math.round(totalRevenue),
    dailyRevenue: Math.round(dailyRevenue),
    formula: `${price} × ${rooms} × ${occupancy}% × ${days} days`,
    breakdown: {
      price,
      rooms,
      occupancy,
      days
    }
  }
}

/**
 * Calculate expected occupancy based on historical data and demand factors
 * This ensures consistent occupancy calculation across all predictions
 */
export function calculateExpectedOccupancy(params: {
  historicalOccupancy?: number
  demandMultiplier?: number
  isWeekend?: boolean
  isHoliday?: boolean
  hasEarlyBookings?: boolean
}): number {
  const {
    historicalOccupancy = 65,
    demandMultiplier = 1.0,
    isWeekend = false,
    isHoliday = false,
    hasEarlyBookings = false
  } = params
  
  let occupancy = historicalOccupancy
  
  // Apply demand multiplier
  occupancy *= demandMultiplier
  
  // Weekend boost
  if (isWeekend) {
    occupancy *= 1.08
  }
  
  // Holiday boost
  if (isHoliday) {
    occupancy *= 1.15
  }
  
  // Early bookings indicator
  if (hasEarlyBookings) {
    occupancy *= 1.05
  }
  
  // Cap at realistic maximum
  return Math.min(95, Math.max(30, occupancy))
}

/**
 * Calculate confidence score with detailed breakdown
 * Returns both score and explanation of contributing factors
 */
export interface ConfidenceFactors {
  dataQuality: number      // 0-25 points
  scanRecency: number      // 0-20 points
  historicalData: number   // 0-20 points
  competitorData: number   // 0-15 points
  bookingData: number      // 0-10 points
  marketConsistency: number // 0-10 points
}

export interface ConfidenceResult {
  score: number // 0-100
  level: 'low' | 'medium' | 'high' | 'very_high'
  factors: ConfidenceFactors
  explanation: string
  improvements: string[]
}

export function calculateConfidence(factors: Partial<ConfidenceFactors>): ConfidenceResult {
  const {
    dataQuality = 0,
    scanRecency = 0,
    historicalData = 0,
    competitorData = 0,
    bookingData = 0,
    marketConsistency = 0
  } = factors
  
  const totalScore = 
    dataQuality + 
    scanRecency + 
    historicalData + 
    competitorData + 
    bookingData + 
    marketConsistency
  
  // Determine level
  let level: ConfidenceResult['level']
  if (totalScore >= 80) level = 'very_high'
  else if (totalScore >= 65) level = 'high'
  else if (totalScore >= 45) level = 'medium'
  else level = 'low'
  
  // Build explanation
  const explanationParts: string[] = []
  const improvements: string[] = []
  
  if (dataQuality >= 20) {
    explanationParts.push('נתונים איכותיים')
  } else {
    improvements.push('שפר איכות נתונים')
  }
  
  if (scanRecency >= 15) {
    explanationParts.push('סריקות עדכניות')
  } else {
    improvements.push('הרץ סריקה חדשה')
  }
  
  if (historicalData >= 15) {
    explanationParts.push('היסטוריה עשירה')
  } else {
    improvements.push('צבור עוד נתונים היסטוריים')
  }
  
  if (competitorData >= 10) {
    explanationParts.push('מחירי מתחרים')
  } else {
    improvements.push('הוסף מתחרים')
  }
  
  if (bookingData >= 5) {
    explanationParts.push('הזמנות קיימות')
  }
  
  if (marketConsistency >= 5) {
    explanationParts.push('שוק יציב')
  }
  
  return {
    score: Math.round(totalScore),
    level,
    factors: {
      dataQuality,
      scanRecency,
      historicalData,
      competitorData,
      bookingData,
      marketConsistency
    },
    explanation: explanationParts.join(' • ') || 'אין מספיק נתונים',
    improvements: improvements.length > 0 ? improvements : ['המשך לצבור נתונים']
  }
}

/**
 * Calculate price with detailed breakdown
 */
export interface PriceCalculationFactors {
  basePrice: number
  seasonalityMultiplier: number
  demandMultiplier: number
  competitorAdjustment: number
  eventImpact: number
  budgetPressure: number
}

export interface PriceCalculationResult {
  price: number
  factors: PriceCalculationFactors
  formula: string
  reasoning: string[]
}

export function calculateOptimalPrice(factors: PriceCalculationFactors): PriceCalculationResult {
  const {
    basePrice,
    seasonalityMultiplier,
    demandMultiplier,
    competitorAdjustment,
    eventImpact,
    budgetPressure
  } = factors
  
  let price = basePrice
  const reasoning: string[] = []
  
  // Apply seasonality
  price *= seasonalityMultiplier
  if (seasonalityMultiplier > 1.05) {
    reasoning.push(`עונה גבוהה (+${((seasonalityMultiplier - 1) * 100).toFixed(0)}%)`)
  } else if (seasonalityMultiplier < 0.95) {
    reasoning.push(`עונה נמוכה (${((seasonalityMultiplier - 1) * 100).toFixed(0)}%)`)
  }
  
  // Apply demand
  price *= demandMultiplier
  if (demandMultiplier > 1.05) {
    reasoning.push(`ביקוש גבוה (+${((demandMultiplier - 1) * 100).toFixed(0)}%)`)
  } else if (demandMultiplier < 0.95) {
    reasoning.push(`ביקוש נמוך (${((demandMultiplier - 1) * 100).toFixed(0)}%)`)
  }
  
  // Apply competitor adjustment
  price += competitorAdjustment
  if (competitorAdjustment > 10) {
    reasoning.push(`מתחרים יקרים (+₪${Math.round(competitorAdjustment)})`)
  } else if (competitorAdjustment < -10) {
    reasoning.push(`מתחרים זולים (₪${Math.round(competitorAdjustment)})`)
  }
  
  // Apply event impact
  price *= eventImpact
  if (eventImpact > 1.05) {
    reasoning.push(`אירועים (+${((eventImpact - 1) * 100).toFixed(0)}%)`)
  }
  
  // Apply budget pressure
  price *= budgetPressure
  if (budgetPressure > 1.05) {
    reasoning.push(`לחץ תקציבי (+${((budgetPressure - 1) * 100).toFixed(0)}%)`)
  }
  
  // Round to nearest 5
  price = Math.round(price / 5) * 5
  
  return {
    price,
    factors,
    formula: `${basePrice} × ${seasonalityMultiplier.toFixed(2)} × ${demandMultiplier.toFixed(2)} + ${competitorAdjustment.toFixed(0)}`,
    reasoning: reasoning.length > 0 ? reasoning : ['מחיר בסיס']
  }
}

/**
 * Compare two revenue scenarios
 */
export interface RevenueComparison {
  current: RevenueCalculationResult
  proposed: RevenueCalculationResult
  difference: number
  percentChange: number
  recommendation: string
}

export function compareRevenue(
  current: RevenueCalculationInput,
  proposed: RevenueCalculationInput
): RevenueComparison {
  const currentResult = calculateRevenue(current)
  const proposedResult = calculateRevenue(proposed)
  
  const difference = proposedResult.revenue - currentResult.revenue
  const percentChange = (difference / currentResult.revenue) * 100
  
  let recommendation = ''
  if (percentChange > 10) {
    recommendation = 'שינוי משמעותי - בדוק זהירות'
  } else if (percentChange > 5) {
    recommendation = 'שינוי מומלץ'
  } else if (percentChange > 0) {
    recommendation = 'שיפור קל'
  } else if (percentChange > -5) {
    recommendation = 'ירידה קלה - שקול שוב'
  } else {
    recommendation = 'לא מומלץ - ירידה משמעותית'
  }
  
  return {
    current: currentResult,
    proposed: proposedResult,
    difference,
    percentChange,
    recommendation
  }
}
