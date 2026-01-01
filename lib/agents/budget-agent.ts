/**
 * Budget Agent
 * Analyzes budget targets, actual revenue, and provides pricing recommendations
 * to meet financial goals
 */

import { createClient } from '@/lib/supabase/server'

interface BudgetAgentResult {
  hotelId: string
  period: string // YYYY-MM
  targetRevenue: number
  actualRevenue: number
  bookedRevenue: number
  totalExpectedRevenue: number
  budgetGap: number // Positive = need more revenue, Negative = exceeded target
  budgetGapPercent: number
  daysInMonth: number
  daysElapsed: number
  daysRemaining: number
  dailyRevenueNeeded: number // To close the gap
  dailyRevenueActual: number // What we're actually getting
  performanceStatus: 'excellent' | 'good' | 'warning' | 'critical'
  recommendation: string
  pricingPressure: number // 1.0 = normal, >1.0 = increase prices, <1.0 = reduce prices
  confidence: number
}

interface MonthlyBudget {
  hotel_id: string
  year: number
  month: number
  target_revenue: number
  target_occupancy?: number
  notes?: string
}

/**
 * Get budget data from database
 */
async function getBudgetFromDB(
  hotelId: string,
  year: number,
  month: number
): Promise<MonthlyBudget | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('budget_targets')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('year', year)
      .eq('month', month)
      .single()

    if (error || !data) {
      console.log(`[BudgetAgent] No budget found for ${hotelId} ${year}-${month}`)
      return null
    }

    return {
      hotel_id: data.hotel_id,
      year: data.year,
      month: data.month,
      target_revenue: Number(data.target_revenue) || 0,
      target_occupancy: data.target_occupancy,
      notes: data.notes,
    }
  } catch (error) {
    console.error('[BudgetAgent] Error fetching budget:', error)
    return null
  }
}

/**
 * Get actual revenue from revenue_tracking table
 */
async function getActualRevenue(
  hotelId: string,
  year: number,
  month: number
): Promise<number> {
  try {
    const supabase = await createClient()
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0] // Last day of month

    const { data, error } = await supabase
      .from('revenue_tracking')
      .select('revenue')
      .eq('hotel_id', hotelId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error || !data) {
      return 0
    }

    const total = data.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0)
    return total
  } catch (error) {
    console.error('[BudgetAgent] Error fetching actual revenue:', error)
    return 0
  }
}

/**
 * Get booked future revenue from bookings table
 */
async function getBookedRevenue(
  hotelId: string,
  year: number,
  month: number
): Promise<number> {
  try {
    const supabase = await createClient()
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('bookings')
      .select('check_in_date, check_out_date, total_price')
      .eq('hotel_id', hotelId)
      .eq('status', 'confirmed')
      .or(`check_in_date.gte.${startDate},check_in_date.lte.${endDate}`)

    if (error || !data) {
      return 0
    }

    let total = 0
    
    // Calculate revenue for nights within the target month
    data.forEach(booking => {
      const checkIn = new Date(booking.check_in_date)
      const checkOut = new Date(booking.check_out_date)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)
      
      const effectiveStart = checkIn > monthStart ? checkIn : monthStart
      const effectiveEnd = checkOut < monthEnd ? checkOut : monthEnd
      
      const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      const nightsInMonth = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
      
      if (nightsInMonth > 0 && totalNights > 0) {
        const revenueForMonth = (Number(booking.total_price) / totalNights) * nightsInMonth
        total += revenueForMonth
      }
    })

    return total
  } catch (error) {
    console.error('[BudgetAgent] Error fetching booked revenue:', error)
    return 0
  }
}

/**
 * Calculate performance status
 */
function calculatePerformanceStatus(
  budgetGapPercent: number,
  daysRemaining: number
): 'excellent' | 'good' | 'warning' | 'critical' {
  if (budgetGapPercent <= -5) return 'excellent' // Exceeded target by 5%+
  if (budgetGapPercent <= 0) return 'good' // Met or slightly over target
  
  if (daysRemaining > 10) {
    if (budgetGapPercent <= 10) return 'good'
    if (budgetGapPercent <= 20) return 'warning'
    return 'critical'
  } else {
    // Less time remaining = more critical
    if (budgetGapPercent <= 5) return 'warning'
    return 'critical'
  }
}

/**
 * Generate pricing recommendation
 */
function generateRecommendation(
  budgetGap: number,
  budgetGapPercent: number,
  dailyRevenueNeeded: number,
  daysRemaining: number,
  performanceStatus: string
): string {
  if (budgetGapPercent <= 0) {
    return `🎉 יעד התקציב הושג! אפשר להתמקד באופטימיזציה ובהגדלת רווח`
  }

  if (performanceStatus === 'critical') {
    return `🚨 קריטי: חסרים ₪${Math.round(budgetGap).toLocaleString()} ליעד. דרוש ₪${Math.round(dailyRevenueNeeded).toLocaleString()}/יום. המלצה: העלה מחירים ב-15-20% והפעל מבצעים לביקוש מיידי`
  }

  if (performanceStatus === 'warning') {
    return `⚠️ פער תקציב: ₪${Math.round(budgetGap).toLocaleString()}. נדרש ₪${Math.round(dailyRevenueNeeded).toLocaleString()}/יום (${daysRemaining} ימים). המלצה: העלה מחירים ב-10-15%`
  }

  return `✅ במסלול טוב. חסרים ₪${Math.round(budgetGap).toLocaleString()} ליעד, אבל יש ${daysRemaining} ימים. שמור על מחירים נוכחיים`
}

/**
 * Calculate pricing pressure factor (how much to adjust prices)
 */
function calculatePricingPressure(
  budgetGapPercent: number,
  daysRemaining: number,
  performanceStatus: string
): number {
  // Base pressure from gap
  let pressure = 1.0 + (budgetGapPercent / 100) * 0.25
  
  // Adjust based on time remaining
  if (daysRemaining < 5 && budgetGapPercent > 10) {
    pressure *= 1.1 // More aggressive if running out of time
  }
  
  // Status-based limits
  if (performanceStatus === 'excellent') {
    pressure = Math.min(1.05, pressure) // Don't push too high
  } else if (performanceStatus === 'critical') {
    pressure = Math.max(1.15, pressure) // Push higher
  }
  
  // Never go below 0.95 (don't discount just because we're doing well)
  // Never go above 1.18 (don't price ourselves out of the market)
  return Math.max(0.95, Math.min(1.18, pressure))
}

/**
 * Main function: Analyze budget for a specific hotel and period
 */
export async function analyzeBudget(
  hotelId: string,
  targetDate: Date = new Date()
): Promise<BudgetAgentResult | null> {
  const year = targetDate.getFullYear()
  const month = targetDate.getMonth() + 1
  const period = `${year}-${String(month).padStart(2, '0')}`

  console.log(`[BudgetAgent] Analyzing budget for hotel ${hotelId}, period ${period}`)

  try {
    // Fetch all data in parallel
    const [budget, actualRevenue, bookedRevenue] = await Promise.all([
      getBudgetFromDB(hotelId, year, month),
      getActualRevenue(hotelId, year, month),
      getBookedRevenue(hotelId, year, month),
    ])

    if (!budget || budget.target_revenue === 0) {
      console.log('[BudgetAgent] No budget target set for this period')
      return null
    }

    const targetRevenue = budget.target_revenue
    const totalExpectedRevenue = actualRevenue + bookedRevenue
    const budgetGap = targetRevenue - totalExpectedRevenue
    const budgetGapPercent = (budgetGap / targetRevenue) * 100

    const daysInMonth = new Date(year, month, 0).getDate()
    const daysElapsed = targetDate.getDate()
    const daysRemaining = Math.max(0, daysInMonth - daysElapsed + 1)

    const dailyRevenueNeeded = daysRemaining > 0 ? budgetGap / daysRemaining : 0
    const dailyRevenueActual = daysElapsed > 0 ? actualRevenue / daysElapsed : 0

    const performanceStatus = calculatePerformanceStatus(budgetGapPercent, daysRemaining)
    const recommendation = generateRecommendation(budgetGap, budgetGapPercent, dailyRevenueNeeded, daysRemaining, performanceStatus)
    const pricingPressure = calculatePricingPressure(budgetGapPercent, daysRemaining, performanceStatus)

    const confidence = budget.target_revenue > 0 ? 0.95 : 0.3

    const result: BudgetAgentResult = {
      hotelId,
      period,
      targetRevenue,
      actualRevenue,
      bookedRevenue,
      totalExpectedRevenue,
      budgetGap,
      budgetGapPercent,
      daysInMonth,
      daysElapsed,
      daysRemaining,
      dailyRevenueNeeded,
      dailyRevenueActual,
      performanceStatus,
      recommendation,
      pricingPressure,
      confidence,
    }

    console.log(`[BudgetAgent] Result:`, {
      period,
      targetRevenue,
      totalExpectedRevenue,
      budgetGap: Math.round(budgetGap),
      budgetGapPercent: budgetGapPercent.toFixed(1) + '%',
      performanceStatus,
      pricingPressure: pricingPressure.toFixed(2),
    })

    return result

  } catch (error) {
    console.error('[BudgetAgent] Error analyzing budget:', error)
    return null
  }
}

/**
 * Batch version: Analyze budget for multiple hotels
 */
export async function analyzeBudgetBatch(
  hotelIds: string[],
  targetDate: Date = new Date()
): Promise<Map<string, BudgetAgentResult>> {
  console.log(`[BudgetAgent] Batch analyzing ${hotelIds.length} hotels`)

  const results = new Map<string, BudgetAgentResult>()

  // Process all hotels in parallel
  const promises = hotelIds.map(async (hotelId) => {
    const result = await analyzeBudget(hotelId, targetDate)
    if (result) {
      results.set(hotelId, result)
    }
  })

  await Promise.all(promises)

  console.log(`[BudgetAgent] Batch complete: ${results.size}/${hotelIds.length} hotels analyzed`)

  return results
}
