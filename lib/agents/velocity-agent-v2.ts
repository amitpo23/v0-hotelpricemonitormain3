/**
 * Enhanced Booking Velocity Agent V2
 * Advanced booking analytics with:
 * - Booking Curve Analysis (lead time patterns)
 * - Cancellation Rate Tracking
 * - Price Sensitivity Analysis
 * - Multi-dimensional velocity metrics
 */

import { createClient } from '@/lib/supabase/server'

interface BookingCurveData {
  bookings_0_7_days: number
  bookings_8_14_days: number
  bookings_15_30_days: number
  bookings_31_60_days: number
  bookings_61_90_days: number
  bookings_90_plus_days: number
  avgLeadTime: number
  bookingWindowTrend: 'last_minute' | 'early_bird' | 'mixed'
}

interface CancellationMetrics {
  cancellationRate7Days: number
  cancellationRate30Days: number
  avgDaysBeforeCancellation: number
  totalCancellations: number
  revenueImpact: number
}

interface PriceSensitivity {
  demandElasticity: number // negative = elastic, positive = inelastic
  priceOptimalRange: { min: number; max: number }
  lastPriceChangeImpact: string
  confidence: number
}

export interface EnhancedVelocityResult {
  hotelId: string
  period: string
  timestamp: string
  
  // Basic velocity (existing)
  totalBookings: number
  bookingsLast7Days: number
  bookingsLast14Days: number
  bookingsLast30Days: number
  averageBookingsPerDay: number
  
  // Trend analysis (existing)
  trend: 'accelerating' | 'increasing' | 'stable' | 'decreasing' | 'declining'
  trendStrength: 'strong' | 'moderate' | 'weak'
  velocityScore: number
  
  // NEW: Booking Curve
  bookingCurve: BookingCurveData
  
  // NEW: Cancellation Metrics
  cancellations: CancellationMetrics
  
  // NEW: Price Sensitivity
  priceSensitivity: PriceSensitivity
  
  // Enhanced pricing recommendation
  pricingImpact: number
  recommendation: string
  confidence: number
  
  // ML-ready features
  features: {
    velocityMomentum: number // Rate of change
    lastMinuteRatio: number // % bookings within 7 days
    cancellationRisk: number // 0-1 scale
    priceElasticity: number
    demandPressure: number // Combined score
  }
}

/**
 * Calculate booking curve from bookings data
 */
async function analyzeBookingCurve(
  hotelId: string,
  daysBack: number = 90
): Promise<BookingCurveData> {
  try {
    const supabase = await createClient()
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    
    const { data: bookings } = await supabase
      .from('bookings')
      .select('created_at, check_in_date, lead_time_days')
      .eq('hotel_id', hotelId)
      .eq('status', 'confirmed')
      .gte('created_at', startDate.toISOString().split('T')[0])
    
    if (!bookings || bookings.length === 0) {
      return {
        bookings_0_7_days: 0,
        bookings_8_14_days: 0,
        bookings_15_30_days: 0,
        bookings_31_60_days: 0,
        bookings_61_90_days: 0,
        bookings_90_plus_days: 0,
        avgLeadTime: 0,
        bookingWindowTrend: 'mixed'
      }
    }
    
    // Calculate lead time for each booking if not set
    const bookingsWithLeadTime = bookings.map(b => {
      const leadTime = b.lead_time_days || Math.floor(
        (new Date(b.check_in_date).getTime() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      return { ...b, lead_time_days: leadTime }
    })
    
    // Count bookings by lead time buckets
    const curve: BookingCurveData = {
      bookings_0_7_days: bookingsWithLeadTime.filter(b => b.lead_time_days >= 0 && b.lead_time_days <= 7).length,
      bookings_8_14_days: bookingsWithLeadTime.filter(b => b.lead_time_days >= 8 && b.lead_time_days <= 14).length,
      bookings_15_30_days: bookingsWithLeadTime.filter(b => b.lead_time_days >= 15 && b.lead_time_days <= 30).length,
      bookings_31_60_days: bookingsWithLeadTime.filter(b => b.lead_time_days >= 31 && b.lead_time_days <= 60).length,
      bookings_61_90_days: bookingsWithLeadTime.filter(b => b.lead_time_days >= 61 && b.lead_time_days <= 90).length,
      bookings_90_plus_days: bookingsWithLeadTime.filter(b => b.lead_time_days > 90).length,
      avgLeadTime: bookingsWithLeadTime.reduce((sum, b) => sum + b.lead_time_days, 0) / bookingsWithLeadTime.length,
      bookingWindowTrend: 'mixed'
    }
    
    // Determine booking window trend
    const lastMinutePercent = (curve.bookings_0_7_days / bookings.length) * 100
    const earlyBirdPercent = ((curve.bookings_61_90_days + curve.bookings_90_plus_days) / bookings.length) * 100
    
    let bookingWindowTrend: 'last_minute' | 'early_bird' | 'mixed' = 'mixed'
    if (lastMinutePercent > 50) {
      bookingWindowTrend = 'last_minute'
    } else if (earlyBirdPercent > 40) {
      bookingWindowTrend = 'early_bird'
    }
    
    curve.bookingWindowTrend = bookingWindowTrend
    
    return curve
    
  } catch (error) {
    console.error('[VelocityAgent] Error analyzing booking curve:', error)
    return {
      bookings_0_7_days: 0,
      bookings_8_14_days: 0,
      bookings_15_30_days: 0,
      bookings_31_60_days: 0,
      bookings_61_90_days: 0,
      bookings_90_plus_days: 0,
      avgLeadTime: 0,
      bookingWindowTrend: 'mixed'
    }
  }
}

/**
 * Calculate cancellation metrics
 */
async function analyzeCancellations(
  hotelId: string,
  daysBack: number = 30
): Promise<CancellationMetrics> {
  try {
    const supabase = await createClient()
    
    const startDate7 = new Date()
    startDate7.setDate(startDate7.getDate() - 7)
    
    const startDate30 = new Date()
    startDate30.setDate(startDate30.getDate() - daysBack)
    
    // Get cancelled bookings
    const { data: cancelled30Days } = await supabase
      .from('bookings')
      .select('cancellation_date, created_at, check_in_date, total_price')
      .eq('hotel_id', hotelId)
      .eq('status', 'cancelled')
      .gte('cancellation_date', startDate30.toISOString().split('T')[0])
      .not('cancellation_date', 'is', null)
    
    const { data: cancelled7Days } = await supabase
      .from('bookings')
      .select('cancellation_date')
      .eq('hotel_id', hotelId)
      .eq('status', 'cancelled')
      .gte('cancellation_date', startDate7.toISOString().split('T')[0])
      .not('cancellation_date', 'is', null)
    
    // Get total bookings for rate calculation
    const { data: total30Days } = await supabase
      .from('bookings')
      .select('id')
      .eq('hotel_id', hotelId)
      .gte('created_at', startDate30.toISOString().split('T')[0])
    
    const { data: total7Days } = await supabase
      .from('bookings')
      .select('id')
      .eq('hotel_id', hotelId)
      .gte('created_at', startDate7.toISOString().split('T')[0])
    
    const totalCancellations = cancelled30Days?.length || 0
    const cancellationRate7Days = (cancelled7Days?.length || 0) / Math.max(1, total7Days?.length || 1)
    const cancellationRate30Days = totalCancellations / Math.max(1, total30Days?.length || 1)
    
    // Calculate average days before cancellation
    let avgDaysBeforeCancellation = 0
    let revenueImpact = 0
    
    if (cancelled30Days && cancelled30Days.length > 0) {
      const daysBeforeCancellation = cancelled30Days.map(b => {
        const checkIn = new Date(b.check_in_date)
        const cancelled = new Date(b.cancellation_date || b.created_at)
        return Math.max(0, Math.floor((checkIn.getTime() - cancelled.getTime()) / (1000 * 60 * 60 * 24)))
      })
      
      avgDaysBeforeCancellation = daysBeforeCancellation.reduce((a, b) => a + b, 0) / daysBeforeCancellation.length
      revenueImpact = cancelled30Days.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0)
    }
    
    return {
      cancellationRate7Days,
      cancellationRate30Days,
      avgDaysBeforeCancellation,
      totalCancellations,
      revenueImpact
    }
    
  } catch (error) {
    console.error('[VelocityAgent] Error analyzing cancellations:', error)
    return {
      cancellationRate7Days: 0,
      cancellationRate30Days: 0,
      avgDaysBeforeCancellation: 0,
      totalCancellations: 0,
      revenueImpact: 0
    }
  }
}

/**
 * Analyze price sensitivity
 */
async function analyzePriceSensitivity(
  hotelId: string
): Promise<PriceSensitivity> {
  try {
    const supabase = await createClient()
    
    // Get recent price sensitivity logs
    const { data: logs } = await supabase
      .from('price_sensitivity_log')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('analysis_date', { ascending: false })
      .limit(5)
    
    if (!logs || logs.length === 0) {
      return {
        demandElasticity: -0.5, // Default: moderately elastic
        priceOptimalRange: { min: 400, max: 800 },
        lastPriceChangeImpact: 'unknown',
        confidence: 0.3
      }
    }
    
    // Calculate average elasticity
    const elasticities = logs
      .filter(l => l.demand_elasticity !== null && !isNaN(l.demand_elasticity))
      .map(l => Number(l.demand_elasticity))
    
    const avgElasticity = elasticities.length > 0 
      ? elasticities.reduce((a, b) => a + b, 0) / elasticities.length 
      : -0.5
    
    // Get optimal price range from successful experiments
    const successfulPrices = logs
      .filter(l => l.bookings_after_7days > l.bookings_before_7days)
      .map(l => Number(l.new_price))
    
    const priceOptimalRange = successfulPrices.length > 0 ? {
      min: Math.min(...successfulPrices),
      max: Math.max(...successfulPrices)
    } : { min: 400, max: 800 }
    
    // Last price change impact
    const lastLog = logs[0]
    const lastPriceChangeImpact = lastLog.bookings_after_7days > lastLog.bookings_before_7days 
      ? 'positive' 
      : lastLog.bookings_after_7days < lastLog.bookings_before_7days 
        ? 'negative' 
        : 'neutral'
    
    const confidence = Math.min(0.9, logs.length * 0.15)
    
    return {
      demandElasticity: avgElasticity,
      priceOptimalRange,
      lastPriceChangeImpact,
      confidence
    }
    
  } catch (error) {
    console.error('[VelocityAgent] Error analyzing price sensitivity:', error)
    return {
      demandElasticity: -0.5,
      priceOptimalRange: { min: 400, max: 800 },
      lastPriceChangeImpact: 'unknown',
      confidence: 0.3
    }
  }
}

/**
 * Calculate ML-ready features
 */
function calculateMLFeatures(
  bookingsLast7Days: number,
  bookingsLast14Days: number,
  bookingCurve: BookingCurveData,
  cancellations: CancellationMetrics,
  priceSensitivity: PriceSensitivity
): EnhancedVelocityResult['features'] {
  
  // Velocity momentum (acceleration)
  const avg7 = bookingsLast7Days / 7
  const avg14to7 = (bookingsLast14Days - bookingsLast7Days) / 7
  const velocityMomentum = avg14to7 > 0 ? avg7 / avg14to7 : 1.0
  
  // Last minute booking ratio
  const totalBookings = Object.values(bookingCurve).slice(0, 6).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0)
  const lastMinuteRatio = totalBookings > 0 ? bookingCurve.bookings_0_7_days / totalBookings : 0
  
  // Cancellation risk (0-1 scale)
  const cancellationRisk = Math.min(1, cancellations.cancellationRate30Days * 2)
  
  // Price elasticity (absolute value, normalized)
  const priceElasticity = Math.abs(priceSensitivity.demandElasticity)
  
  // Demand pressure (combined score 0-1)
  const demandPressure = Math.min(1, (
    (velocityMomentum - 0.8) * 0.3 +
    (1 - cancellationRisk) * 0.3 +
    (bookingsLast7Days / 10) * 0.4
  ))
  
  return {
    velocityMomentum,
    lastMinuteRatio,
    cancellationRisk,
    priceElasticity,
    demandPressure
  }
}

/**
 * Generate enhanced recommendation
 */
function generateEnhancedRecommendation(
  trend: EnhancedVelocityResult['trend'],
  bookingCurve: BookingCurveData,
  cancellations: CancellationMetrics,
  priceSensitivity: PriceSensitivity,
  features: EnhancedVelocityResult['features']
): string {
  const parts: string[] = []
  
  // Trend
  if (trend === 'accelerating') {
    parts.push('🚀 ביקוש מואץ!')
  } else if (trend === 'increasing') {
    parts.push('📈 ביקוש עולה')
  } else if (trend === 'declining') {
    parts.push('⚠️ ביקוש יורד')
  } else {
    parts.push('✅ ביקוש יציב')
  }
  
  // Booking window
  if (bookingCurve.bookingWindowTrend === 'last_minute') {
    parts.push(`רוב ההזמנות (${(features.lastMinuteRatio * 100).toFixed(0)}%) ברגע האחרון - העלה מחירים לטווח קצר`)
  } else if (bookingCurve.bookingWindowTrend === 'early_bird') {
    parts.push(`הזמנות מראש (${bookingCurve.avgLeadTime.toFixed(0)} ימים ממוצע) - שמור על מחירים יציבים`)
  }
  
  // Cancellations
  if (cancellations.cancellationRate30Days > 0.15) {
    parts.push(`⚠️ שיעור ביטולים גבוה (${(cancellations.cancellationRate30Days * 100).toFixed(1)}%) - שקול מדיניות ביטול חמורה יותר`)
  }
  
  // Price sensitivity
  if (Math.abs(priceSensitivity.demandElasticity) < 0.5) {
    parts.push('💰 ביקוש לא רגיש למחיר - העלה מחירים בביטחון')
  } else if (Math.abs(priceSensitivity.demandElasticity) > 1.5) {
    parts.push('⚠️ ביקוש רגיש מאוד למחיר - זהיר עם העלאות')
  }
  
  // Demand pressure
  if (features.demandPressure > 0.7) {
    parts.push('🔥 לחץ ביקוש גבוה - זמן אידיאלי להעלאת מחירים')
  } else if (features.demandPressure < 0.3) {
    parts.push('💡 לחץ ביקוש נמוך - שקול מבצעים או שיווק')
  }
  
  return parts.join('. ')
}

/**
 * Main function: Enhanced velocity analysis
 */
export async function analyzeEnhancedVelocity(
  hotelId: string,
  daysBack: number = 30
): Promise<EnhancedVelocityResult | null> {
  console.log(`[EnhancedVelocityAgent] Analyzing hotel ${hotelId}`)

  try {
    const supabase = await createClient()
    
    // Get basic bookings data
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    
    const { data: bookings } = await supabase
      .from('bookings')
      .select('created_at, status')
      .eq('hotel_id', hotelId)
      .eq('status', 'confirmed')
      .gte('created_at', startDate.toISOString().split('T')[0])
    
    if (!bookings || bookings.length === 0) {
      console.log('[EnhancedVelocityAgent] No bookings data')
      return null
    }
    
    // Basic velocity metrics
    const now = new Date()
    const date7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const date14DaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const date30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const bookingsLast7Days = bookings.filter(b => new Date(b.created_at) >= date7DaysAgo).length
    const bookingsLast14Days = bookings.filter(b => new Date(b.created_at) >= date14DaysAgo).length
    const bookingsLast30Days = bookings.filter(b => new Date(b.created_at) >= date30DaysAgo).length
    
    const averageBookingsPerDay = bookingsLast30Days / 30
    
    // Determine trend
    const avg7 = bookingsLast7Days / 7
    const avg14to7 = (bookingsLast14Days - bookingsLast7Days) / 7
    const recentVsPrevious = avg7 / (avg14to7 || 1)
    
    let trend: EnhancedVelocityResult['trend'] = 'stable'
    let trendStrength: EnhancedVelocityResult['trendStrength'] = 'weak'
    
    if (recentVsPrevious > 1.3) {
      trend = 'accelerating'
      trendStrength = 'strong'
    } else if (recentVsPrevious > 1.15) {
      trend = 'increasing'
      trendStrength = recentVsPrevious > 1.25 ? 'strong' : 'moderate'
    } else if (recentVsPrevious < 0.7) {
      trend = 'declining'
      trendStrength = 'strong'
    } else if (recentVsPrevious < 0.85) {
      trend = 'decreasing'
      trendStrength = recentVsPrevious < 0.75 ? 'strong' : 'moderate'
    }
    
    const velocityScore = Math.min(100, (averageBookingsPerDay / 5) * 50 + 
      (trend === 'accelerating' ? 30 : trend === 'increasing' ? 15 : trend === 'declining' ? -20 : 0))
    
    // Enhanced analytics
    const [bookingCurve, cancellations, priceSensitivity] = await Promise.all([
      analyzeBookingCurve(hotelId, 90),
      analyzeCancellations(hotelId, 30),
      analyzePriceSensitivity(hotelId)
    ])
    
    // ML features
    const features = calculateMLFeatures(
      bookingsLast7Days,
      bookingsLast14Days,
      bookingCurve,
      cancellations,
      priceSensitivity
    )
    
    // Pricing impact (enhanced)
    let pricingImpact = 1.0
    
    // Base impact from trend
    if (trend === 'accelerating') pricingImpact = 1.08
    else if (trend === 'increasing') pricingImpact = 1.05
    else if (trend === 'decreasing') pricingImpact = 0.97
    else if (trend === 'declining') pricingImpact = 0.93
    
    // Adjust by demand pressure
    pricingImpact *= (1 + (features.demandPressure - 0.5) * 0.1)
    
    // Adjust by cancellation risk
    pricingImpact *= (1 - cancellations.cancellationRate30Days * 0.1)
    
    // Adjust by booking window
    if (bookingCurve.bookingWindowTrend === 'last_minute') {
      pricingImpact *= 1.03 // Last minute bookings = higher prices
    }
    
    pricingImpact = Math.max(0.85, Math.min(1.15, pricingImpact))
    
    // Generate recommendation
    const recommendation = generateEnhancedRecommendation(
      trend,
      bookingCurve,
      cancellations,
      priceSensitivity,
      features
    )
    
    const confidence = Math.min(0.95, (
      (bookings.length > 20 ? 0.4 : 0.2) +
      (priceSensitivity.confidence * 0.3) +
      (cancellations.totalCancellations > 5 ? 0.2 : 0.1) +
      0.1
    ))
    
    const result: EnhancedVelocityResult = {
      hotelId,
      period: `${date30DaysAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`,
      timestamp: now.toISOString(),
      totalBookings: bookings.length,
      bookingsLast7Days,
      bookingsLast14Days,
      bookingsLast30Days,
      averageBookingsPerDay,
      trend,
      trendStrength,
      velocityScore,
      bookingCurve,
      cancellations,
      priceSensitivity,
      pricingImpact,
      recommendation,
      confidence,
      features
    }
    
    console.log(`[EnhancedVelocityAgent] Complete:`, {
      trend,
      velocityScore: velocityScore.toFixed(1),
      demandPressure: features.demandPressure.toFixed(2),
      pricingImpact: pricingImpact.toFixed(3)
    })
    
    return result
    
  } catch (error) {
    console.error('[EnhancedVelocityAgent] Error:', error)
    return null
  }
}

/**
 * Save snapshot to database for historical tracking
 */
export async function saveVelocitySnapshot(result: EnhancedVelocityResult): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    await supabase.from('booking_velocity_snapshots').insert({
      hotel_id: result.hotelId,
      snapshot_date: new Date().toISOString().split('T')[0],
      bookings_last_7days: result.bookingsLast7Days,
      bookings_last_14days: result.bookingsLast14Days,
      bookings_last_30days: result.bookingsLast30Days,
      avg_bookings_per_day: result.averageBookingsPerDay,
      velocity_trend: result.trend,
      velocity_score: result.velocityScore,
      avg_lead_time: result.bookingCurve.avgLeadTime,
      last_minute_ratio: result.features.lastMinuteRatio,
      cancellation_rate_7days: result.cancellations.cancellationRate7Days,
      cancellation_rate_30days: result.cancellations.cancellationRate30Days
    })
    
    console.log(`[EnhancedVelocityAgent] Snapshot saved for hotel ${result.hotelId}`)
    return true
    
  } catch (error) {
    console.error('[EnhancedVelocityAgent] Error saving snapshot:', error)
    return false
  }
}
