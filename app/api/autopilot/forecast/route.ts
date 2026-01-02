import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface AutopilotForecast {
  hotelId: string
  hotelName: string
  period: string
  currentRevenue: number
  forecastedRevenue: number
  revenueIncrease: number
  percentIncrease: number
  recommendedActions: Array<{
    date: string
    currentPrice: number
    recommendedPrice: number
    reasoning: string
    expectedRevenue: number
    confidence: number
  }>
  summary: {
    totalDays: number
    daysAnalyzed: number
    avgPriceIncrease: number
    highDemandDays: number
    lowDemandDays: number
    competitorComparison: string
  }
  historicalAnalysis: {
    similarPeriodLastYear: number
    yoyGrowth: number
    seasonalTrend: string
  }
  riskAssessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
    recommendation: string
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (!hotelId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get hotel info
    const { data: hotel } = await supabase
      .from('hotels')
      .select('id, name, base_price, total_rooms')
      .eq('id', hotelId)
      .single()

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
    }

    // Get current prices and bookings for the period
    const { data: predictions } = await supabase
      .from('price_predictions')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('prediction_date', startDate)
      .lte('prediction_date', endDate)
      .order('prediction_date')

    // Get competitor prices
    const { data: competitorPrices } = await supabase
      .from('competitor_daily_prices')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    // Get historical data from last year
    const lastYearStart = new Date(startDate)
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
    const lastYearEnd = new Date(endDate)
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)

    const { data: historicalData } = await supabase
      .from('daily_prices')
      .select('date, price, occupancy_rate')
      .eq('hotel_id', hotelId)
      .gte('date', lastYearStart.toISOString().split('T')[0])
      .lte('date', lastYearEnd.toISOString().split('T')[0])

    // Get bookings for the period
    const { data: bookings } = await supabase
      .from('bookings')
      .select('check_in_date, total_price, status')
      .eq('hotel_id', hotelId)
      .gte('check_in_date', startDate)
      .lte('check_in_date', endDate)

    // Calculate current revenue (using same occupancy calculation as forecast for fair comparison)
    let currentRevenue = 0
    const currentPriceMap = new Map<string, number>()
    
    predictions?.forEach(pred => {
      // Get historical occupancy for this date from last year
      const lastYearDate = new Date(pred.prediction_date)
      lastYearDate.setFullYear(lastYearDate.getFullYear() - 1)
      const lastYearStr = lastYearDate.toISOString().split('T')[0]
      const historical = historicalData?.find(h => h.date === lastYearStr)
      const historicalOccupancy = historical?.occupancy_rate || 65
      
      // Use historical occupancy for current revenue calculation (same as forecast)
      const revenue = pred.predicted_price * hotel.total_rooms * (historicalOccupancy / 100)
      currentRevenue += revenue
      currentPriceMap.set(pred.prediction_date, pred.predicted_price)
    })

    // Calculate competitor average prices by date
    const competitorAvgByDate = new Map<string, number>()
    const competitorsByDate = new Map<string, any[]>()
    
    competitorPrices?.forEach(cp => {
      if (!competitorsByDate.has(cp.date)) {
        competitorsByDate.set(cp.date, [])
      }
      competitorsByDate.get(cp.date)!.push(cp)
    })

    competitorsByDate.forEach((prices, date) => {
      const avg = prices.reduce((sum, p) => sum + Number(p.price), 0) / prices.length
      competitorAvgByDate.set(date, avg)
    })

    // Build recommendations using Multi-Agent analysis
    const recommendedActions = []
    let forecastedRevenue = 0
    let highDemandDays = 0
    let lowDemandDays = 0
    let totalPriceChange = 0
    let daysAnalyzed = 0

    for (const pred of predictions || []) {
      const date = pred.prediction_date
      const currentPrice = pred.predicted_price
      const competitorAvg = competitorAvgByDate.get(date) || currentPrice
      
      // Get historical data for same date last year
      const lastYearDate = new Date(date)
      lastYearDate.setFullYear(lastYearDate.getFullYear() - 1)
      const lastYearStr = lastYearDate.toISOString().split('T')[0]
      const historical = historicalData?.find(h => h.date === lastYearStr)
      const historicalPrice = historical?.price || hotel.base_price
      const historicalOccupancy = historical?.occupancy_rate || 65

      // Determine demand level
      const isWeekend = new Date(date).getDay() % 6 === 0
      const hasBookings = bookings?.some(b => b.check_in_date === date)
      
      let demandMultiplier = 1.0
      let reasoning = []

      // Historical comparison
      if (historicalOccupancy > 75) {
        demandMultiplier *= 1.15
        reasoning.push(`תפוסה גבוהה אשתקד (${historicalOccupancy}%)`)
        highDemandDays++
      } else if (historicalOccupancy < 50) {
        demandMultiplier *= 0.92
        reasoning.push(`תפוסה נמוכה אשתקד (${historicalOccupancy}%)`)
        lowDemandDays++
      }

      // Weekend premium
      if (isWeekend) {
        demandMultiplier *= 1.12
        reasoning.push('סוף שבוע - פרמיה')
      }

      // Competitor comparison
      if (currentPrice < competitorAvg * 0.85) {
        demandMultiplier *= 1.08
        reasoning.push(`מחיר נמוך ממתחרים (₪${Math.round(competitorAvg)})`)
      } else if (currentPrice > competitorAvg * 1.15) {
        demandMultiplier *= 0.95
        reasoning.push(`מחיר גבוה ממתחרים (₪${Math.round(competitorAvg)})`)
      }

      // Early bookings
      if (hasBookings) {
        demandMultiplier *= 1.05
        reasoning.push('יש הזמנות מוקדמות')
      }

      // Calculate recommended price
      const recommendedPrice = Math.round(currentPrice * demandMultiplier / 5) * 5 // Round to nearest 5
      const priceChange = recommendedPrice - currentPrice
      totalPriceChange += Math.abs(priceChange)
      daysAnalyzed++

      // Calculate expected revenue with recommended price
      const expectedOccupancy = Math.min(95, historicalOccupancy * demandMultiplier)
      const expectedRevenue = recommendedPrice * hotel.total_rooms * (expectedOccupancy / 100)
      forecastedRevenue += expectedRevenue

      // Confidence based on data quality
      let confidence = 0.7
      if (historical) confidence += 0.15
      if (competitorAvgByDate.has(date)) confidence += 0.1
      if (hasBookings) confidence += 0.05

      recommendedActions.push({
        date,
        currentPrice,
        recommendedPrice,
        reasoning: reasoning.join(' • '),
        expectedRevenue: Math.round(expectedRevenue),
        confidence: Math.round(confidence * 100)
      })
    }

    // Calculate metrics
    const revenueIncrease = forecastedRevenue - currentRevenue
    const percentIncrease = currentRevenue > 0 ? (revenueIncrease / currentRevenue) * 100 : 0
    const avgPriceIncrease = daysAnalyzed > 0 ? totalPriceChange / daysAnalyzed : 0

    // Historical analysis
    const lastYearRevenue = historicalData?.reduce((sum, h) => 
      sum + (h.price * hotel.total_rooms * (h.occupancy_rate / 100)), 0) || 0
    const yoyGrowth = lastYearRevenue > 0 ? ((forecastedRevenue - lastYearRevenue) / lastYearRevenue) * 100 : 0
    
    let seasonalTrend = 'stable'
    if (yoyGrowth > 15) seasonalTrend = 'strong_growth'
    else if (yoyGrowth > 5) seasonalTrend = 'moderate_growth'
    else if (yoyGrowth < -15) seasonalTrend = 'decline'
    else if (yoyGrowth < -5) seasonalTrend = 'moderate_decline'

    // Risk assessment
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    const riskFactors: string[] = []

    if (avgPriceIncrease > 50) {
      riskLevel = 'high'
      riskFactors.push('שינוי מחיר גדול מאוד')
    } else if (avgPriceIncrease > 30) {
      riskLevel = 'medium'
      riskFactors.push('שינוי מחיר משמעותי')
    }

    if (highDemandDays / daysAnalyzed > 0.6) {
      riskFactors.push('תקופת ביקוש גבוה - הזדמנות')
    } else if (lowDemandDays / daysAnalyzed > 0.5) {
      riskLevel = riskLevel === 'low' ? 'medium' : 'high'
      riskFactors.push('תקופת ביקוש נמוך - סיכון')
    }

    const competitorComparison = competitorAvgByDate.size > 0 
      ? 'תחרותי - מחירים מותאמים לשוק'
      : 'חסר נתוני מתחרים'

    const riskRecommendation = riskLevel === 'high'
      ? 'המלצה: יישום הדרגתי של שינויי המחיר, ניטור צמוד'
      : riskLevel === 'medium'
      ? 'המלצה: יישום זהיר, בדיקת תגובת שוק'
      : 'המלצה: בטוח ליישום מלא'

    const forecast: AutopilotForecast = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      period: `${startDate} - ${endDate}`,
      currentRevenue: Math.round(currentRevenue),
      forecastedRevenue: Math.round(forecastedRevenue),
      revenueIncrease: Math.round(revenueIncrease),
      percentIncrease: Math.round(percentIncrease * 10) / 10,
      recommendedActions,
      summary: {
        totalDays: predictions?.length || 0,
        daysAnalyzed,
        avgPriceIncrease: Math.round(avgPriceIncrease),
        highDemandDays,
        lowDemandDays,
        competitorComparison
      },
      historicalAnalysis: {
        similarPeriodLastYear: Math.round(lastYearRevenue),
        yoyGrowth: Math.round(yoyGrowth * 10) / 10,
        seasonalTrend
      },
      riskAssessment: {
        level: riskLevel,
        factors: riskFactors,
        recommendation: riskRecommendation
      }
    }

    return NextResponse.json(forecast)

  } catch (error) {
    console.error('[Autopilot Forecast API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
