import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface PredictionFactors {
  seasonality: number
  weekendPremium: number
  occupancyPressure: number
  competitorAlignment: number
  budgetPressure: number
  leadTime: number
  historicalAccuracy: number
  eventImpact: number
  marketTrend: number
}

interface ConfidenceFactors {
  dataQuality: number // 0-1: How much real data we have
  scanRecency: number // 0-1: How recent are our scans
  historicalData: number // 0-1: Do we have historical prices
  bookingData: number // 0-1: Do we have booking info
  competitorData: number // 0-1: Do we have competitor prices
  marketConsistency: number // 0-1: How consistent is the market
}

function calculateConfidence(factors: ConfidenceFactors): number {
  // Weighted average of confidence factors
  const weights = {
    dataQuality: 0.25,
    scanRecency: 0.2,
    historicalData: 0.15,
    bookingData: 0.15,
    competitorData: 0.15,
    marketConsistency: 0.1,
  }

  let confidence =
    factors.dataQuality * weights.dataQuality +
    factors.scanRecency * weights.scanRecency +
    factors.historicalData * weights.historicalData +
    factors.bookingData * weights.bookingData +
    factors.competitorData * weights.competitorData +
    factors.marketConsistency * weights.marketConsistency

  // Base confidence floor of 45%, max 96%
  confidence = Math.max(0.45, Math.min(0.96, confidence))

  return confidence
}

function getDemandLevel(score: number, occupancyRate: number): string {
  if (score > 1.4 || occupancyRate > 75) return "very_high"
  if (score > 1.2 || occupancyRate > 55) return "high"
  if (score > 0.95 || occupancyRate > 35) return "medium"
  return "low"
}

// Tel Aviv special events and holidays
const SPECIAL_EVENTS: Record<string, { name: string; impact: number }[]> = {
  // Format: MM-DD
  "01-01": [{ name: "New Year", impact: 1.1 }],
  "02-14": [{ name: "Valentine's Day", impact: 1.05 }],
  "03-17": [{ name: "Purim", impact: 1.15 }],
  "04-15": [{ name: "Passover", impact: 1.25 }],
  "05-14": [{ name: "Independence Day", impact: 1.2 }],
  "06-01": [{ name: "Pride Week Start", impact: 1.3 }],
  "06-08": [{ name: "Pride Parade", impact: 1.4 }],
  "09-15": [{ name: "Rosh Hashanah", impact: 1.2 }],
  "09-25": [{ name: "Yom Kippur", impact: 0.85 }],
  "10-01": [{ name: "Sukkot", impact: 1.15 }],
  "12-25": [{ name: "Christmas", impact: 1.25 }],
  "12-31": [{ name: "New Year's Eve", impact: 1.35 }],
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { hotels } = await request.json()

  if (!hotels || hotels.length === 0) {
    return NextResponse.json({ error: "No hotels provided" }, { status: 400 })
  }

  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  const hotelIds = hotels.map((h: any) => h.id)

  // Parallel data fetching for better performance
  const [
    { data: bookings },
    { data: budgets },
    { data: revenueTracking },
    { data: recentResults },
    { data: dailyPrices },
    { data: scans },
    { data: competitors },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .in("hotel_id", hotelIds)
      .gte("check_in_date", today.toISOString().split("T")[0])
      .eq("status", "confirmed"),
    supabase
      .from("revenue_budgets")
      .select("*")
      .in("hotel_id", hotelIds)
      .eq("year", currentYear)
      .eq("month", currentMonth),
    supabase
      .from("revenue_tracking")
      .select("*")
      .in("hotel_id", hotelIds)
      .gte("date", new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0]),
    supabase.from("scan_results").select("*").order("scraped_at", { ascending: false }).limit(200),
    supabase.from("daily_prices").select("*").in("hotel_id", hotelIds).gte("date", today.toISOString().split("T")[0]),
    supabase.from("scans").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("competitors").select("*").in("hotel_id", hotelIds),
  ])

  // Calculate data quality metrics
  const lastScanDate = scans?.[0]?.created_at ? new Date(scans[0].created_at) : null
  const hoursSinceLastScan = lastScanDate ? (today.getTime() - lastScanDate.getTime()) / (1000 * 60 * 60) : 999

  // Market averages by hotel with variance calculation
  const marketDataByHotel: Record<string, { avg: number; min: number; max: number; count: number; prices: number[] }> =
    {}
  recentResults?.forEach((r: any) => {
    const price = Number(r.price)
    if (!marketDataByHotel[r.hotel_id]) {
      marketDataByHotel[r.hotel_id] = { avg: price, min: price, max: price, count: 1, prices: [price] }
    } else {
      const data = marketDataByHotel[r.hotel_id]
      data.prices.push(price)
      data.count++
      data.avg = data.prices.reduce((a, b) => a + b, 0) / data.prices.length
      data.min = Math.min(data.min, price)
      data.max = Math.max(data.max, price)
    }
  })

  // Calculate market consistency (low variance = high consistency)
  const getMarketConsistency = (hotelId: string): number => {
    const data = marketDataByHotel[hotelId]
    if (!data || data.count < 3) return 0.5
    const variance = data.prices.reduce((sum, p) => sum + Math.pow(p - data.avg, 2), 0) / data.count
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = stdDev / data.avg
    // Lower CV = more consistent = higher score
    return Math.max(0.3, Math.min(1.0, 1 - coefficientOfVariation))
  }

  // Bookings data structures
  const bookingsByHotelDate: Record<string, Record<string, number>> = {}
  const bookingsRevenueByHotel: Record<string, number> = {}

  bookings?.forEach((b: any) => {
    if (!bookingsByHotelDate[b.hotel_id]) {
      bookingsByHotelDate[b.hotel_id] = {}
      bookingsRevenueByHotel[b.hotel_id] = 0
    }

    const checkIn = new Date(b.check_in_date)
    const checkOut = new Date(b.check_out_date)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

    for (let i = 0; i < nights; i++) {
      const date = new Date(checkIn)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split("T")[0]
      bookingsByHotelDate[b.hotel_id][dateStr] = (bookingsByHotelDate[b.hotel_id][dateStr] || 0) + (b.room_count || 1)
    }

    bookingsRevenueByHotel[b.hotel_id] += Number(b.total_price || 0)
  })

  const budgetByHotel: Record<string, any> = {}
  budgets?.forEach((b: any) => {
    budgetByHotel[b.hotel_id] = b
  })

  const actualRevenueByHotel: Record<string, number> = {}
  revenueTracking?.forEach((r: any) => {
    actualRevenueByHotel[r.hotel_id] = (actualRevenueByHotel[r.hotel_id] || 0) + Number(r.revenue || 0)
  })

  const dailyPricesByHotelDate: Record<string, Record<string, any>> = {}
  dailyPrices?.forEach((dp: any) => {
    if (!dailyPricesByHotelDate[dp.hotel_id]) {
      dailyPricesByHotelDate[dp.hotel_id] = {}
    }
    dailyPricesByHotelDate[dp.hotel_id][dp.date] = dp
  })

  const competitorsByHotel: Record<string, any[]> = {}
  competitors?.forEach((c: any) => {
    if (!competitorsByHotel[c.hotel_id]) {
      competitorsByHotel[c.hotel_id] = []
    }
    competitorsByHotel[c.hotel_id].push(c)
  })

  const predictions: any[] = []

  // Seasonality factors for Tel Aviv
  const seasonalityFactors: Record<number, { factor: number; label: string }> = {
    0: { factor: 0.85, label: "winter_low" },
    1: { factor: 0.8, label: "winter_lowest" },
    2: { factor: 0.9, label: "spring_rising" },
    3: { factor: 1.0, label: "passover_high" },
    4: { factor: 1.05, label: "spring_peak" },
    5: { factor: 1.15, label: "summer_start" },
    6: { factor: 1.25, label: "summer_peak" },
    7: { factor: 1.3, label: "summer_highest" },
    8: { factor: 1.1, label: "holidays" },
    9: { factor: 0.95, label: "autumn" },
    10: { factor: 0.9, label: "low_season" },
    11: { factor: 1.2, label: "holiday_season" },
  }

  for (const hotel of hotels) {
    const basePrice = hotel.base_price || marketDataByHotel[hotel.id]?.avg || 150
    const totalRooms = hotel.total_rooms || 50
    const hotelCompetitors = competitorsByHotel[hotel.id] || []
    const marketData = marketDataByHotel[hotel.id]

    // Budget calculations
    const budget = budgetByHotel[hotel.id]
    const targetRevenue = budget?.target_revenue || 0
    const actualRevenue = actualRevenueByHotel[hotel.id] || 0
    const bookedRevenue = bookingsRevenueByHotel[hotel.id] || 0
    const totalExpectedRevenue = actualRevenue + bookedRevenue
    const budgetGap = targetRevenue - totalExpectedRevenue
    const daysRemaining = new Date(currentYear, currentMonth, 0).getDate() - today.getDate()
    const dailyRevenueNeeded = daysRemaining > 0 ? budgetGap / daysRemaining : 0

    // Budget pressure: if behind budget, increase prices slightly
    const budgetPressure =
      targetRevenue > 0 ? Math.max(0.92, Math.min(1.18, 1 + (budgetGap / targetRevenue) * 0.25)) : 1.0

    // Generate predictions for next 30 days
    for (let i = 0; i < 30; i++) {
      const predDate = new Date(today)
      predDate.setDate(predDate.getDate() + i)
      const dateStr = predDate.toISOString().split("T")[0]
      const monthDay = `${String(predDate.getMonth() + 1).padStart(2, "0")}-${String(predDate.getDate()).padStart(2, "0")}`

      const dayOfWeek = predDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
      const month = predDate.getMonth()

      // Get factors
      const seasonData = seasonalityFactors[month]
      const seasonality = seasonData.factor
      const weekendFactor = isWeekend ? 1.12 : 1.0

      // Lead time factor (booking closer to date = higher price)
      const leadTimeFactor = i < 3 ? 1.15 : i < 7 ? 1.08 : i < 14 ? 1.03 : 1.0

      // Occupancy factor
      const bookedRooms = bookingsByHotelDate[hotel.id]?.[dateStr] || 0
      const occupancyRate = (bookedRooms / totalRooms) * 100
      let occupancyFactor = 1.0
      if (occupancyRate > 85) occupancyFactor = 1.3
      else if (occupancyRate > 70) occupancyFactor = 1.2
      else if (occupancyRate > 55) occupancyFactor = 1.1
      else if (occupancyRate > 40) occupancyFactor = 1.02
      else if (occupancyRate < 20) occupancyFactor = 0.92
      else if (occupancyRate < 10) occupancyFactor = 0.85

      // Competitor alignment
      const calendarData = dailyPricesByHotelDate[hotel.id]?.[dateStr]
      const competitorAvg = calendarData?.avg_competitor_price
        ? Number(calendarData.avg_competitor_price)
        : marketData?.avg
      const competitorFactor = competitorAvg ? Math.max(0.88, Math.min(1.12, competitorAvg / basePrice)) : 1.0

      // Special events
      const events = SPECIAL_EVENTS[monthDay] || []
      const eventFactor = events.length > 0 ? events.reduce((max, e) => Math.max(max, e.impact), 1.0) : 1.0

      // Calculate predicted price
      const rawPrice =
        basePrice *
        seasonality *
        weekendFactor *
        occupancyFactor *
        budgetPressure *
        competitorFactor *
        leadTimeFactor *
        eventFactor

      // Small random market variation (±2%)
      const marketNoise = 0.98 + Math.random() * 0.04
      const predictedPrice = Math.round(rawPrice * marketNoise)

      // Calculate demand level
      const demandScore = seasonality * weekendFactor * occupancyFactor * eventFactor
      const demand = getDemandLevel(demandScore, occupancyRate)

      const confidenceFactors: ConfidenceFactors = {
        dataQuality: marketData ? Math.min(1.0, marketData.count / 20) : 0.3,
        scanRecency:
          hoursSinceLastScan < 6 ? 1.0 : hoursSinceLastScan < 24 ? 0.85 : hoursSinceLastScan < 72 ? 0.65 : 0.4,
        historicalData: calendarData ? 0.9 : 0.4,
        bookingData: bookedRooms > 0 ? Math.min(1.0, 0.5 + (occupancyRate / 100) * 0.5) : 0.35,
        competitorData: hotelCompetitors.length > 0 ? Math.min(1.0, 0.5 + hotelCompetitors.length * 0.1) : 0.3,
        marketConsistency: getMarketConsistency(hotel.id),
      }

      const confidence = calculateConfidence(confidenceFactors)

      predictions.push({
        hotel_id: hotel.id,
        prediction_date: dateStr,
        predicted_price: predictedPrice,
        predicted_demand: demand,
        confidence_score: confidence,
        base_price: basePrice, // Added current base price for comparison
        factors: {
          seasonality: seasonData.label,
          seasonality_factor: seasonality.toFixed(2),
          day_of_week: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek],
          is_weekend: isWeekend,
          competitor_avg: competitorAvg ? Math.round(competitorAvg) : null,
          events: events.map((e) => e.name).concat(isWeekend ? ["Weekend"] : []),
          occupancy_rate: Math.round(occupancyRate),
          booked_rooms: bookedRooms,
          total_rooms: totalRooms,
          budget_gap: Math.round(budgetGap),
          budget_pressure: budgetPressure.toFixed(2),
          lead_time_days: i,
          lead_time_factor: leadTimeFactor.toFixed(2),
          confidence_breakdown: {
            data_quality: (confidenceFactors.dataQuality * 100).toFixed(0) + "%",
            scan_recency: (confidenceFactors.scanRecency * 100).toFixed(0) + "%",
            historical_data: (confidenceFactors.historicalData * 100).toFixed(0) + "%",
            booking_data: (confidenceFactors.bookingData * 100).toFixed(0) + "%",
            competitor_data: (confidenceFactors.competitorData * 100).toFixed(0) + "%",
            market_consistency: (confidenceFactors.marketConsistency * 100).toFixed(0) + "%",
          },
        },
      })
    }
  }

  // Delete old predictions
  await supabase
    .from("price_predictions")
    .delete()
    .in("hotel_id", hotelIds)
    .gte("prediction_date", today.toISOString().split("T")[0])

  // Insert new predictions
  const { error } = await supabase.from("price_predictions").insert(predictions)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    count: predictions.length,
    message: `Generated ${predictions.length} predictions for ${hotels.length} hotels`,
    algorithm_version: "2.0",
    data_quality: {
      hours_since_last_scan: Math.round(hoursSinceLastScan),
      total_scan_results: recentResults?.length || 0,
      total_bookings: bookings?.length || 0,
    },
  })
}
