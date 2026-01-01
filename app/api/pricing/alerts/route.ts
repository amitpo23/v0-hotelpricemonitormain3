import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

interface PricingAlert {
  id: string
  date: string
  hotelId: string
  hotelName: string
  alertType: 'overpriced' | 'underpriced' | 'competitor_gap' | 'demand_mismatch' | 'anomaly'
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentPrice: number
  suggestedPrice: number
  priceDifference: number
  reasoning: string
  dataPoints: {
    competitorAvg?: number
    historicalAvg?: number
    demandLevel?: string
    occupancyRate?: number
    eventImpact?: string
  }
  recommendation: string
  potentialRevenueLoss: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minSeverity = searchParams.get('minSeverity') || 'low'
    
    if (!hotelId) {
      return NextResponse.json({ error: 'hotelId required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Default to next 30 days if not specified
    const start = startDate || new Date().toISOString().split('T')[0]
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Get hotel info
    const { data: hotel } = await supabase
      .from('hotels')
      .select('id, name, base_price, total_rooms')
      .eq('id', hotelId)
      .single()

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
    }

    // Get predictions for the period
    const { data: predictions } = await supabase
      .from('price_predictions')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('prediction_date', start)
      .lte('prediction_date', end)
      .order('prediction_date')

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({ alerts: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 } })
    }

    // Get competitor prices
    const { data: competitorPrices } = await supabase
      .from('competitor_daily_prices')
      .select('date, price, competitor_id')
      .gte('date', start)
      .lte('date', end)

    // Get historical prices (same dates last year)
    const lastYearStart = new Date(start)
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
    const lastYearEnd = new Date(end)
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)

    const { data: historicalPrices } = await supabase
      .from('daily_prices')
      .select('date, price, occupancy_rate')
      .eq('hotel_id', hotelId)
      .gte('date', lastYearStart.toISOString().split('T')[0])
      .lte('date', lastYearEnd.toISOString().split('T')[0])

    // Get bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('check_in_date, total_price, room_count')
      .eq('hotel_id', hotelId)
      .eq('status', 'confirmed')
      .gte('check_in_date', start)
      .lte('check_in_date', end)

    // Group competitor prices by date
    const competitorAvgByDate = new Map<string, number>()
    const competitorsByDate = new Map<string, number[]>()
    
    competitorPrices?.forEach(cp => {
      if (!competitorsByDate.has(cp.date)) {
        competitorsByDate.set(cp.date, [])
      }
      competitorsByDate.get(cp.date)!.push(Number(cp.price))
    })

    competitorsByDate.forEach((prices, date) => {
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length
      competitorAvgByDate.set(date, avg)
    })

    // Group historical prices by month-day
    const historicalByMonthDay = new Map<string, any[]>()
    historicalPrices?.forEach(hp => {
      const date = new Date(hp.date)
      const monthDay = `${date.getMonth() + 1}-${date.getDate()}`
      if (!historicalByMonthDay.has(monthDay)) {
        historicalByMonthDay.set(monthDay, [])
      }
      historicalByMonthDay.get(monthDay)!.push(hp)
    })

    // Group bookings by date
    const bookingsByDate = new Map<string, number>()
    bookings?.forEach(b => {
      const count = bookingsByDate.get(b.check_in_date) || 0
      bookingsByDate.set(b.check_in_date, count + (b.room_count || 1))
    })

    // Analyze each prediction
    const alerts: PricingAlert[] = []
    const pricesByDate = predictions.map(p => p.predicted_price)
    const avgPrice = pricesByDate.reduce((sum, p) => sum + p, 0) / pricesByDate.length
    const stdDev = Math.sqrt(
      pricesByDate.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / pricesByDate.length
    )

    for (const pred of predictions) {
      const date = pred.prediction_date
      const currentPrice = pred.predicted_price
      const competitorAvg = competitorAvgByDate.get(date)
      
      // Get historical data
      const dateObj = new Date(date)
      const monthDay = `${dateObj.getMonth() + 1}-${dateObj.getDate()}`
      const historicalData = historicalByMonthDay.get(monthDay) || []
      const historicalAvg = historicalData.length > 0
        ? historicalData.reduce((sum, h) => sum + h.price, 0) / historicalData.length
        : null
      const historicalOccupancy = historicalData.length > 0
        ? historicalData.reduce((sum, h) => sum + h.occupancy_rate, 0) / historicalData.length
        : null

      // Get bookings
      const bookedRooms = bookingsByDate.get(date) || 0
      const occupancyRate = (bookedRooms / hotel.total_rooms) * 100

      // Determine demand level
      const isWeekend = dateObj.getDay() % 6 === 0
      let demandLevel = 'medium'
      if (historicalOccupancy && historicalOccupancy > 75) demandLevel = 'high'
      else if (historicalOccupancy && historicalOccupancy < 50) demandLevel = 'low'
      else if (occupancyRate > 70) demandLevel = 'high'
      else if (occupancyRate < 40) demandLevel = 'low'

      // Check for alerts
      
      // 1. COMPETITOR GAP - Price significantly different from competitors
      if (competitorAvg) {
        const gap = ((currentPrice - competitorAvg) / competitorAvg) * 100
        
        if (gap > 20) {
          // Overpriced compared to competitors
          const suggestedPrice = Math.round(competitorAvg * 1.1 / 5) * 5
          const potentialLoss = (currentPrice - suggestedPrice) * (hotel.total_rooms * 0.5) // Assume 50% occupancy loss
          
          alerts.push({
            id: `${date}-competitor-high`,
            date,
            hotelId: hotel.id,
            hotelName: hotel.name,
            alertType: 'competitor_gap',
            severity: gap > 35 ? 'critical' : gap > 25 ? 'high' : 'medium',
            currentPrice,
            suggestedPrice,
            priceDifference: currentPrice - suggestedPrice,
            reasoning: `המחיר גבוה ב-${Math.round(gap)}% ממתחרים (₪${Math.round(competitorAvg)})`,
            dataPoints: {
              competitorAvg,
              demandLevel,
              occupancyRate: Math.round(occupancyRate)
            },
            recommendation: `הורד מחיר ל-₪${suggestedPrice} כדי להישאר תחרותי`,
            potentialRevenueLoss: Math.round(Math.abs(potentialLoss))
          })
        } else if (gap < -15 && demandLevel === 'high') {
          // Underpriced with high demand
          const suggestedPrice = Math.round(competitorAvg * 0.95 / 5) * 5
          const potentialLoss = (suggestedPrice - currentPrice) * (hotel.total_rooms * 0.8)
          
          alerts.push({
            id: `${date}-competitor-low`,
            date,
            hotelId: hotel.id,
            hotelName: hotel.name,
            alertType: 'underpriced',
            severity: gap < -25 ? 'high' : 'medium',
            currentPrice,
            suggestedPrice,
            priceDifference: suggestedPrice - currentPrice,
            reasoning: `המחיר נמוך ב-${Math.abs(Math.round(gap))}% ממתחרים בתקופת ביקוש גבוה`,
            dataPoints: {
              competitorAvg,
              demandLevel,
              occupancyRate: Math.round(occupancyRate)
            },
            recommendation: `העלה מחיר ל-₪${suggestedPrice} - יש ביקוש גבוה`,
            potentialRevenueLoss: Math.round(potentialLoss)
          })
        }
      }

      // 2. DEMAND MISMATCH - Price doesn't match demand
      if (demandLevel === 'high' && currentPrice < avgPrice * 0.9) {
        const suggestedPrice = Math.round(avgPrice * 1.1 / 5) * 5
        const potentialLoss = (suggestedPrice - currentPrice) * (hotel.total_rooms * 0.75)
        
        alerts.push({
          id: `${date}-demand-high`,
          date,
          hotelId: hotel.id,
          hotelName: hotel.name,
          alertType: 'demand_mismatch',
          severity: 'high',
          currentPrice,
          suggestedPrice,
          priceDifference: suggestedPrice - currentPrice,
          reasoning: `ביקוש גבוה (${Math.round(occupancyRate)}% תפוסה) אבל מחיר נמוך`,
          dataPoints: {
            demandLevel,
            occupancyRate: Math.round(occupancyRate),
            historicalAvg: historicalAvg ?? undefined
          },
          recommendation: `העלה מחיר ל-₪${suggestedPrice} - תפוסה ${Math.round(occupancyRate)}%`,
          potentialRevenueLoss: Math.round(potentialLoss)
        })
      } else if (demandLevel === 'low' && currentPrice > avgPrice * 1.1) {
        const suggestedPrice = Math.round(avgPrice * 0.9 / 5) * 5
        const potentialLoss = (currentPrice - suggestedPrice) * (hotel.total_rooms * 0.3)
        
        alerts.push({
          id: `${date}-demand-low`,
          date,
          hotelId: hotel.id,
          hotelName: hotel.name,
          alertType: 'demand_mismatch',
          severity: 'medium',
          currentPrice,
          suggestedPrice,
          priceDifference: currentPrice - suggestedPrice,
          reasoning: `ביקוש נמוך (${Math.round(occupancyRate)}% תפוסה) אבל מחיר גבוה`,
          dataPoints: {
            demandLevel,
            occupancyRate: Math.round(occupancyRate),
            historicalAvg: historicalAvg ?? undefined
          },
          recommendation: `הורד מחיר ל-₪${suggestedPrice} להגברת ביקוש`,
          potentialRevenueLoss: Math.round(Math.abs(potentialLoss))
        })
      }

      // 3. ANOMALY - Statistical outlier
      if (Math.abs(currentPrice - avgPrice) > stdDev * 2.5) {
        const suggestedPrice = Math.round(avgPrice / 5) * 5
        
        alerts.push({
          id: `${date}-anomaly`,
          date,
          hotelId: hotel.id,
          hotelName: hotel.name,
          alertType: 'anomaly',
          severity: 'medium',
          currentPrice,
          suggestedPrice,
          priceDifference: Math.abs(currentPrice - suggestedPrice),
          reasoning: `מחיר חריג סטטיסטית (${Math.abs(currentPrice - avgPrice) > 0 ? '+' : ''}₪${Math.round(currentPrice - avgPrice)} מהממוצע)`,
          dataPoints: {
            historicalAvg: historicalAvg ?? undefined,
            competitorAvg,
            demandLevel
          },
          recommendation: `בדוק אם המחיר ₪${currentPrice} נכון`,
          potentialRevenueLoss: 0
        })
      }

      // 4. HISTORICAL COMPARISON
      if (historicalAvg && Math.abs(currentPrice - historicalAvg) > historicalAvg * 0.3) {
        const isHigher = currentPrice > historicalAvg
        const suggestedPrice = Math.round(historicalAvg * (isHigher ? 1.15 : 1.05) / 5) * 5
        
        alerts.push({
          id: `${date}-historical`,
          date,
          hotelId: hotel.id,
          hotelName: hotel.name,
          alertType: isHigher ? 'overpriced' : 'underpriced',
          severity: 'low',
          currentPrice,
          suggestedPrice,
          priceDifference: Math.abs(currentPrice - suggestedPrice),
          reasoning: `מחיר ${isHigher ? 'גבוה' : 'נמוך'} ב-${Math.abs(Math.round(((currentPrice - historicalAvg) / historicalAvg) * 100))}% מאשתקד`,
          dataPoints: {
            historicalAvg: Math.round(historicalAvg),
            demandLevel
          },
          recommendation: `שקול להתאים ל-₪${suggestedPrice} (אשתקד: ₪${Math.round(historicalAvg)})`,
          potentialRevenueLoss: 0
        })
      }
    }

    // Filter by severity if requested
    const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 }
    const minLevel = severityLevels[minSeverity as keyof typeof severityLevels] || 0
    const filteredAlerts = alerts.filter(a => severityLevels[a.severity] >= minLevel)

    // Sort by severity and potential loss
    filteredAlerts.sort((a, b) => {
      const severityDiff = severityLevels[b.severity] - severityLevels[a.severity]
      if (severityDiff !== 0) return severityDiff
      return b.potentialRevenueLoss - a.potentialRevenueLoss
    })

    // Calculate summary
    const summary = {
      total: filteredAlerts.length,
      critical: filteredAlerts.filter(a => a.severity === 'critical').length,
      high: filteredAlerts.filter(a => a.severity === 'high').length,
      medium: filteredAlerts.filter(a => a.severity === 'medium').length,
      low: filteredAlerts.filter(a => a.severity === 'low').length,
      totalPotentialLoss: Math.round(filteredAlerts.reduce((sum, a) => sum + a.potentialRevenueLoss, 0))
    }

    return NextResponse.json({
      alerts: filteredAlerts,
      summary,
      period: { start, end },
      hotelName: hotel.name
    })

  } catch (error) {
    console.error('[Pricing Alerts API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
