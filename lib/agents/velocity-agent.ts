/**
 * Booking Velocity Agent
 * Tracks booking pace and predicts demand trends based on recent booking activity
 */

import { createClient } from '@/lib/supabase/server'

interface BookingVelocityResult {
  hotelId: string
  period: string
  totalBookings: number
  bookingsLast7Days: number
  bookingsLast14Days: number
  bookingsLast30Days: number
  averageBookingsPerDay: number
  trend: 'accelerating' | 'increasing' | 'stable' | 'decreasing' | 'declining'
  trendStrength: 'strong' | 'moderate' | 'weak'
  velocityScore: number // 0-100 scale
  pricingImpact: number // Multiplier: >1.0 = increase prices, <1.0 = decrease
  recommendation: string
  confidence: number
  dataPoints: Array<{
    date: string
    bookings: number
  }>
}

/**
 * Get bookings from database for analysis
 */
async function getBookingsData(
  hotelId: string,
  daysBack: number = 30
): Promise<Array<{ booking_date: string; check_in_date: string; total_price: number }>> {
  try {
    const supabase = await createClient()
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('bookings')
      .select('created_at, check_in_date, total_price, status')
      .eq('hotel_id', hotelId)
      .eq('status', 'confirmed')
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: true })

    if (error || !data) {
      console.log(`[VelocityAgent] No bookings found for hotel ${hotelId}`)
      return []
    }

    return data.map(booking => ({
      booking_date: booking.created_at.split('T')[0],
      check_in_date: booking.check_in_date,
      total_price: Number(booking.total_price) || 0,
    }))
  } catch (error) {
    console.error('[VelocityAgent] Error fetching bookings:', error)
    return []
  }
}

/**
 * Group bookings by date
 */
function groupBookingsByDate(
  bookings: Array<{ booking_date: string }>
): Array<{ date: string; bookings: number }> {
  const groups: Record<string, number> = {}

  bookings.forEach(booking => {
    const date = booking.booking_date
    groups[date] = (groups[date] || 0) + 1
  })

  return Object.entries(groups)
    .map(([date, bookings]) => ({ date, bookings }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Calculate moving average
 */
function calculateMovingAverage(dataPoints: number[], windowSize: number): number {
  if (dataPoints.length === 0) return 0
  const window = dataPoints.slice(-windowSize)
  return window.reduce((sum, val) => sum + val, 0) / window.length
}

/**
 * Determine trend from booking data
 */
function determineTrend(
  bookingsLast7Days: number,
  bookingsLast14Days: number,
  bookingsLast30Days: number,
  dataPoints: Array<{ date: string; bookings: number }>
): { trend: BookingVelocityResult['trend']; strength: BookingVelocityResult['trendStrength'] } {
  
  // Calculate daily averages for each period
  const avg7 = bookingsLast7Days / 7
  const avg14to7 = (bookingsLast14Days - bookingsLast7Days) / 7
  const avg30to14 = (bookingsLast30Days - bookingsLast14Days) / 16

  // Calculate trend based on period comparisons
  const recentVsPrevious = avg7 / (avg14to7 || 1)
  const previousVsOlder = avg14to7 / (avg30to14 || 1)

  let trend: BookingVelocityResult['trend'] = 'stable'
  let strength: BookingVelocityResult['trendStrength'] = 'weak'

  // Strong trends (>30% change)
  if (recentVsPrevious > 1.3 && previousVsOlder > 1.1) {
    trend = 'accelerating'
    strength = 'strong'
  } else if (recentVsPrevious < 0.7 && previousVsOlder < 0.9) {
    trend = 'declining'
    strength = 'strong'
  }
  // Moderate trends (15-30% change)
  else if (recentVsPrevious > 1.15) {
    trend = 'increasing'
    strength = recentVsPrevious > 1.25 ? 'strong' : 'moderate'
  } else if (recentVsPrevious < 0.85) {
    trend = 'decreasing'
    strength = recentVsPrevious < 0.75 ? 'strong' : 'moderate'
  }
  // Weak/stable (<15% change)
  else {
    trend = 'stable'
    strength = 'weak'
  }

  return { trend, strength }
}

/**
 * Calculate velocity score (0-100)
 */
function calculateVelocityScore(
  bookingsLast7Days: number,
  averageBookingsPerDay: number,
  trend: BookingVelocityResult['trend']
): number {
  // Base score from daily booking rate (assuming 5 bookings/day is "good")
  let score = Math.min(100, (averageBookingsPerDay / 5) * 50)

  // Add trend bonus/penalty
  switch (trend) {
    case 'accelerating':
      score += 30
      break
    case 'increasing':
      score += 15
      break
    case 'stable':
      score += 5
      break
    case 'decreasing':
      score -= 10
      break
    case 'declining':
      score -= 20
      break
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate pricing impact
 */
function calculatePricingImpact(
  trend: BookingVelocityResult['trend'],
  strength: BookingVelocityResult['trendStrength'],
  velocityScore: number
): number {
  let impact = 1.0

  // Base impact from trend
  switch (trend) {
    case 'accelerating':
      impact = 1.08
      break
    case 'increasing':
      impact = 1.05
      break
    case 'stable':
      impact = 1.0
      break
    case 'decreasing':
      impact = 0.97
      break
    case 'declining':
      impact = 0.93
      break
  }

  // Adjust by strength
  if (strength === 'strong') {
    impact += (impact - 1.0) * 0.3 // Amplify by 30%
  } else if (strength === 'weak') {
    impact = 1.0 + (impact - 1.0) * 0.5 // Reduce impact by 50%
  }

  // High velocity score = more aggressive pricing
  if (velocityScore > 80) {
    impact *= 1.02
  } else if (velocityScore < 30) {
    impact *= 0.98
  }

  return Math.max(0.90, Math.min(1.10, impact))
}

/**
 * Generate recommendation
 */
function generateRecommendation(
  trend: BookingVelocityResult['trend'],
  strength: BookingVelocityResult['trendStrength'],
  bookingsLast7Days: number,
  averageBookingsPerDay: number
): string {
  switch (trend) {
    case 'accelerating':
      return `🚀 ביקוש מואץ! ${bookingsLast7Days} הזמנות ב-7 ימים. המלצה: העלה מחירים ב-8-10% - הביקוש חזק`
    
    case 'increasing':
      return `📈 ביקוש עולה: ${averageBookingsPerDay.toFixed(1)} הזמנות/יום. המלצה: העלה מחירים ב-5% והתכונן לביקוש נוסף`
    
    case 'stable':
      return `✅ קצב יציב: ${averageBookingsPerDay.toFixed(1)} הזמנות/יום. שמור על מחירים נוכחיים`
    
    case 'decreasing':
      return `📉 ירידה בקצב: רק ${bookingsLast7Days} הזמנות השבוע. שקול מבצע קל או שיווק מוגבר`
    
    case 'declining':
      return `⚠️ ביקוש נמוך: ${bookingsLast7Days} הזמנות ב-7 ימים. המלצה: הפעל מבצעים ושיווק אגרסיבי`
    
    default:
      return 'נתונים לא מספיקים לניתוח'
  }
}

/**
 * Main function: Analyze booking velocity
 */
export async function analyzeBookingVelocity(
  hotelId: string,
  daysBack: number = 30
): Promise<BookingVelocityResult | null> {
  console.log(`[VelocityAgent] Analyzing booking velocity for hotel ${hotelId}`)

  try {
    const bookings = await getBookingsData(hotelId, daysBack)

    if (bookings.length === 0) {
      console.log('[VelocityAgent] No bookings data available')
      return null
    }

    const totalBookings = bookings.length
    
    // Count bookings in different time windows
    const now = new Date()
    const date7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const date14DaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const date30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const bookingsLast7Days = bookings.filter(b => new Date(b.booking_date) >= date7DaysAgo).length
    const bookingsLast14Days = bookings.filter(b => new Date(b.booking_date) >= date14DaysAgo).length
    const bookingsLast30Days = bookings.filter(b => new Date(b.booking_date) >= date30DaysAgo).length

    const averageBookingsPerDay = bookingsLast30Days / 30

    const dataPoints = groupBookingsByDate(bookings)

    const { trend, strength } = determineTrend(
      bookingsLast7Days,
      bookingsLast14Days,
      bookingsLast30Days,
      dataPoints
    )

    const velocityScore = calculateVelocityScore(bookingsLast7Days, averageBookingsPerDay, trend)
    const pricingImpact = calculatePricingImpact(trend, strength, velocityScore)
    const recommendation = generateRecommendation(trend, strength, bookingsLast7Days, averageBookingsPerDay)

    const confidence = bookings.length > 20 ? 0.9 : bookings.length > 10 ? 0.7 : 0.5

    const period = `${date30DaysAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`

    const result: BookingVelocityResult = {
      hotelId,
      period,
      totalBookings,
      bookingsLast7Days,
      bookingsLast14Days,
      bookingsLast30Days,
      averageBookingsPerDay,
      trend,
      trendStrength: strength,
      velocityScore,
      pricingImpact,
      recommendation,
      confidence,
      dataPoints,
    }

    console.log(`[VelocityAgent] Result:`, {
      bookingsLast7Days,
      averageBookingsPerDay: averageBookingsPerDay.toFixed(1),
      trend,
      strength,
      velocityScore,
      pricingImpact: pricingImpact.toFixed(2),
    })

    return result

  } catch (error) {
    console.error('[VelocityAgent] Error analyzing velocity:', error)
    return null
  }
}

/**
 * Batch version: Analyze velocity for multiple hotels
 */
export async function analyzeBookingVelocityBatch(
  hotelIds: string[],
  daysBack: number = 30
): Promise<Map<string, BookingVelocityResult>> {
  console.log(`[VelocityAgent] Batch analyzing ${hotelIds.length} hotels`)

  const results = new Map<string, BookingVelocityResult>()

  const promises = hotelIds.map(async (hotelId) => {
    const result = await analyzeBookingVelocity(hotelId, daysBack)
    if (result) {
      results.set(hotelId, result)
    }
  })

  await Promise.all(promises)

  console.log(`[VelocityAgent] Batch complete: ${results.size}/${hotelIds.length} hotels analyzed`)

  return results
}
