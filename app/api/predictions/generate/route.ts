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
  googleTrends: number
}

interface ConfidenceFactors {
  dataQuality: number
  scanRecency: number
  historicalData: number
  bookingData: number
  competitorData: number
  marketConsistency: number
  externalDataQuality: number
}

async function fetchExternalData(baseUrl: string) {
  const currentYear = new Date().getFullYear()

  try {
    // Fetch holidays from Hebcal
    const holidaysPromise = fetch(`${baseUrl}/api/external-data/holidays?year=${currentYear}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)

    // Fetch Google Trends data
    const trendsPromise = fetch(`${baseUrl}/api/external-data/trends?keyword=hotels+israel`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)

    // Fetch market intelligence
    const marketIntelPromise = fetch(`${baseUrl}/api/external-data/market-intel`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)

    const [holidays, trends, marketIntel] = await Promise.all([holidaysPromise, trendsPromise, marketIntelPromise])

    return { holidays, trends, marketIntel }
  } catch (error) {
    console.error("Error fetching external data:", error)
    return { holidays: null, trends: null, marketIntel: null }
  }
}

function buildHolidayMap(holidays: any): Record<string, { name: string; impact: number; type: string }[]> {
  const map: Record<string, { name: string; impact: number; type: string }[]> = {}

  if (!holidays?.holidays) return map

  holidays.holidays.forEach((h: any) => {
    if (!h.date) return
    const dateStr = h.date.split("T")[0]
    const mmdd = dateStr.slice(5) // Get MM-DD

    if (!map[mmdd]) {
      map[mmdd] = []
    }

    map[mmdd].push({
      name: h.title,
      impact: h.tourismImpact?.score || 1.0,
      type: h.tourismImpact?.type || "regular",
    })
  })

  // Add fixed events (Pride, New Year, etc.)
  const fixedEvents: Record<string, { name: string; impact: number; type: string }[]> = {
    "01-01": [{ name: "New Year", impact: 1.1, type: "international" }],
    "02-14": [{ name: "Valentine's Day", impact: 1.05, type: "international" }],
    "06-01": [{ name: "Pride Week Start", impact: 1.3, type: "event" }],
    "06-08": [{ name: "Pride Parade", impact: 1.4, type: "event" }],
    "12-25": [{ name: "Christmas", impact: 1.25, type: "international" }],
    "12-31": [{ name: "New Year's Eve", impact: 1.35, type: "international" }],
  }

  Object.entries(fixedEvents).forEach(([date, events]) => {
    if (!map[date]) {
      map[date] = events
    } else {
      map[date] = [...map[date], ...events]
    }
  })

  return map
}

function calculateConfidence(factors: ConfidenceFactors): number {
  const weights = {
    dataQuality: 0.2,
    scanRecency: 0.18,
    historicalData: 0.12,
    bookingData: 0.15,
    competitorData: 0.15,
    marketConsistency: 0.1,
    externalDataQuality: 0.1, // Added external data weight
  }

  let confidence =
    factors.dataQuality * weights.dataQuality +
    factors.scanRecency * weights.scanRecency +
    factors.historicalData * weights.historicalData +
    factors.bookingData * weights.bookingData +
    factors.competitorData * weights.competitorData +
    factors.marketConsistency * weights.marketConsistency +
    factors.externalDataQuality * weights.externalDataQuality

  confidence = Math.max(0.45, Math.min(0.96, confidence))
  return confidence
}

function getDemandLevel(score: number, occupancyRate: number, trendsScore: number): string {
  const adjustedScore = score * (trendsScore / 100)

  if (adjustedScore > 1.4 || occupancyRate > 75) return "very_high"
  if (adjustedScore > 1.2 || occupancyRate > 55) return "high"
  if (adjustedScore > 0.95 || occupancyRate > 35) return "medium"
  return "low"
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    hotels,
    daysAhead = 30,
    selectedMonths = [],
    selectedYear = new Date().getFullYear(),
    analysisParams = {
      includeCompetitors: true,
      includeSeasonality: true,
      includeEvents: true,
      includeOccupancy: true,
      includeBudget: true,
      includeFutureBookings: true,
      includeMarketTrends: true,
    },
  } = await request.json()

  if (!hotels || hotels.length === 0) {
    return NextResponse.json({ error: "No hotels provided" }, { status: 400 })
  }

  const today = new Date()
  let startDate: Date
  let endDate: Date

  if (selectedMonths.length > 0) {
    // Find the earliest and latest selected month
    const minMonth = Math.min(...selectedMonths)
    const maxMonth = Math.max(...selectedMonths)

    // Start from the first day of the earliest selected month
    startDate = new Date(selectedYear, minMonth - 1, 1)

    // If start date is in the past, use today
    if (startDate < today) {
      startDate = today
    }

    // End at the last day of the latest selected month
    endDate = new Date(selectedYear, maxMonth, 0) // Day 0 of next month = last day of current month

    // Ensure we cover at least daysAhead if months span is smaller
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff < daysAhead) {
      endDate = new Date(startDate.getTime() + daysAhead * 24 * 60 * 60 * 1000)
    }
  } else {
    // No specific months selected - use daysAhead from today
    startDate = today
    endDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  }

  const predictionDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  console.log("[v0] Predictions date range:", {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    predictionDays,
    selectedMonths,
    selectedYear,
  })

  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  const hotelIds = hotels.map((h: any) => h.id)

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"

  const [
    externalData,
    { data: bookings },
    { data: budgets },
    { data: revenueTracking },
    { data: recentResults },
    { data: dailyPrices },
    { data: scans },
    { data: competitors },
    { data: competitorPrices },
  ] = await Promise.all([
    fetchExternalData(baseUrl),
    supabase
      .from("bookings")
      .select("*")
      .in("hotel_id", hotelIds)
      .gte("check_in_date", today.toISOString().split("T")[0])
      .eq("status", "confirmed"),
    supabase.from("revenue_budgets").select("*").in("hotel_id", hotelIds).gte("year", currentYear),
    supabase
      .from("revenue_tracking")
      .select("*")
      .in("hotel_id", hotelIds)
      .gte("date", new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0]),
    supabase.from("scan_results").select("*").order("scraped_at", { ascending: false }).limit(500),
    supabase.from("daily_prices").select("*").in("hotel_id", hotelIds).gte("date", today.toISOString().split("T")[0]),
    supabase.from("scans").select("*").order("created_at", { ascending: false }).limit(50),
    supabase
      .from("hotel_competitors")
      .select("*, competitor_room_types(*)")
      .in("hotel_id", hotelIds)
      .eq("is_active", true),
    supabase
      .from("competitor_daily_prices")
      .select("*")
      .gte("date", today.toISOString().split("T")[0])
      .lte("date", new Date(today.getTime() + predictionDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
  ])

  const holidayMap = buildHolidayMap(externalData.holidays)
  const trendsScore = externalData.trends?.data?.interestScore || 75
  const trendsSource = externalData.trends?.data?.source || "default"
  const marketIntel = externalData.marketIntel
  const bookingVelocity = marketIntel?.bookingVelocity?.trend || "stable"

  const lastScanDate = scans?.[0]?.created_at ? new Date(scans[0].created_at) : null
  const hoursSinceLastScan = lastScanDate ? (today.getTime() - lastScanDate.getTime()) / (1000 * 60 * 60) : 999

  const competitorPricesByDate: Record<string, { booking: number[]; expedia: number[] }> = {}
  competitorPrices?.forEach((cp: any) => {
    const dateStr = cp.date
    if (!competitorPricesByDate[dateStr]) {
      competitorPricesByDate[dateStr] = { booking: [], expedia: [] }
    }
    const price = Number(cp.price)
    if (price > 0) {
      if (cp.source?.toLowerCase().includes("booking")) {
        competitorPricesByDate[dateStr].booking.push(price)
      } else if (cp.source?.toLowerCase().includes("expedia")) {
        competitorPricesByDate[dateStr].expedia.push(price)
      }
    }
  })

  const marketDataByHotel: Record<string, { avg: number; min: number; max: number; count: number; prices: number[] }> =
    {}

  recentResults?.forEach((r: any) => {
    const price = Number(r.price)
    if (!price || price <= 0) return

    const hotelId = r.hotel_id
    if (!marketDataByHotel[hotelId]) {
      marketDataByHotel[hotelId] = { avg: price, min: price, max: price, count: 1, prices: [price] }
    } else {
      const data = marketDataByHotel[hotelId]
      data.prices.push(price)
      data.count++
      data.avg = data.prices.reduce((a, b) => a + b, 0) / data.prices.length
      data.min = Math.min(data.min, price)
      data.max = Math.max(data.max, price)
    }
  })

  competitorPrices?.forEach((cp: any) => {
    const price = Number(cp.price)
    if (!price || price <= 0) return

    const hotelId = cp.hotel_id
    if (!marketDataByHotel[hotelId]) {
      marketDataByHotel[hotelId] = { avg: price, min: price, max: price, count: 1, prices: [price] }
    } else {
      const data = marketDataByHotel[hotelId]
      data.prices.push(price)
      data.count++
      data.avg = data.prices.reduce((a, b) => a + b, 0) / data.prices.length
      data.min = Math.min(data.min, price)
      data.max = Math.max(data.max, price)
    }
  })

  const getMarketConsistency = (hotelId: string): number => {
    const data = marketDataByHotel[hotelId]
    if (!data || data.count < 3) return 0.5
    const variance = data.prices.reduce((sum, p) => sum + Math.pow(p - data.avg, 2), 0) / data.count
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = stdDev / data.avg
    return Math.max(0.3, Math.min(1.0, 1 - coefficientOfVariation))
  }

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

  const budgetByHotelMonth: Record<string, Record<string, any>> = {}
  budgets?.forEach((b: any) => {
    const key = `${b.hotel_id}-${b.year}-${b.month}`
    if (!budgetByHotelMonth[b.hotel_id]) {
      budgetByHotelMonth[b.hotel_id] = {}
    }
    budgetByHotelMonth[b.hotel_id][`${b.year}-${b.month}`] = b
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
  const recommendations: any[] = []

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

    const hotelRecommendations: string[] = []

    for (let i = 0; i < predictionDays; i++) {
      const predDate = new Date(startDate)
      predDate.setDate(predDate.getDate() + i)
      const dateStr = predDate.toISOString().split("T")[0]
      const monthDay = `${String(predDate.getMonth() + 1).padStart(2, "0")}-${String(predDate.getDate()).padStart(2, "0")}`
      const predMonth = predDate.getMonth() + 1
      const predYear = predDate.getFullYear()

      if (selectedMonths.length > 0 && !selectedMonths.includes(predMonth)) {
        continue
      }

      if (predYear !== selectedYear) {
        continue
      }

      const budgetKey = `${predYear}-${predMonth}`
      const budget = budgetByHotelMonth[hotel.id]?.[budgetKey]
      const targetRevenue = budget?.target_revenue || 0
      const actualRevenue = actualRevenueByHotel[hotel.id] || 0
      const bookedRevenue = bookingsRevenueByHotel[hotel.id] || 0
      const totalExpectedRevenue = actualRevenue + bookedRevenue
      const budgetGap = targetRevenue - totalExpectedRevenue
      const daysInMonth = new Date(predYear, predMonth, 0).getDate()
      const dayOfMonth = predDate.getDate()
      const daysRemaining = daysInMonth - dayOfMonth + 1
      const dailyRevenueNeeded = daysRemaining > 0 ? budgetGap / daysRemaining : 0

      const budgetPressure =
        analysisParams.includeBudget && targetRevenue > 0
          ? Math.max(0.92, Math.min(1.18, 1 + (budgetGap / targetRevenue) * 0.25))
          : 1.0

      const velocityFactor = analysisParams.includeMarketTrends
        ? bookingVelocity === "increasing"
          ? 1.05
          : bookingVelocity === "decreasing"
            ? 0.95
            : 1.0
        : 1.0

      const dayOfWeek = predDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
      const month = predDate.getMonth()

      const seasonData = seasonalityFactors[month]
      const seasonality = analysisParams.includeSeasonality ? seasonData.factor : 1.0
      const weekendFactor = isWeekend ? 1.12 : 1.0

      const leadTimeFactor = i < 3 ? 1.15 : i < 7 ? 1.08 : i < 14 ? 1.03 : i < 30 ? 1.0 : i < 60 ? 0.98 : 0.95

      const bookedRooms = analysisParams.includeFutureBookings ? bookingsByHotelDate[hotel.id]?.[dateStr] || 0 : 0
      const occupancyRate = (bookedRooms / totalRooms) * 100
      let occupancyFactor = 1.0
      if (analysisParams.includeOccupancy) {
        if (occupancyRate > 85) occupancyFactor = 1.3
        else if (occupancyRate > 70) occupancyFactor = 1.2
        else if (occupancyRate > 55) occupancyFactor = 1.1
        else if (occupancyRate > 40) occupancyFactor = 1.02
        else if (occupancyRate < 20) occupancyFactor = 0.92
        else if (occupancyRate < 10) occupancyFactor = 0.85
      }

      const compPricesForDate = competitorPricesByDate[dateStr]
      const bookingAvg =
        analysisParams.includeCompetitors && compPricesForDate?.booking.length
          ? compPricesForDate.booking.reduce((a, b) => a + b, 0) / compPricesForDate.booking.length
          : null
      const expediaAvg =
        analysisParams.includeCompetitors && compPricesForDate?.expedia.length
          ? compPricesForDate.expedia.reduce((a, b) => a + b, 0) / compPricesForDate.expedia.length
          : null

      const calendarData = dailyPricesByHotelDate[hotel.id]?.[dateStr]
      const competitorAvg = analysisParams.includeCompetitors
        ? bookingAvg || expediaAvg || calendarData?.avg_competitor_price
          ? Number(calendarData?.avg_competitor_price)
          : marketData?.avg
        : null
      const competitorFactor = competitorAvg ? Math.max(0.88, Math.min(1.12, competitorAvg / basePrice)) : 1.0

      const events = analysisParams.includeEvents ? holidayMap[monthDay] || [] : []
      const eventFactor = events.length > 0 ? events.reduce((max, e) => Math.max(max, e.impact), 1.0) : 1.0

      const trendsFactor = analysisParams.includeMarketTrends ? trendsScore / 100 : 0.75

      const rawPrice =
        basePrice *
        seasonality *
        weekendFactor *
        occupancyFactor *
        budgetPressure *
        competitorFactor *
        leadTimeFactor *
        eventFactor *
        velocityFactor *
        (0.9 + trendsFactor * 0.2)

      const marketNoise = 0.98 + Math.random() * 0.04
      const predictedPrice = Math.round(rawPrice * marketNoise)

      const demandScore = seasonality * weekendFactor * occupancyFactor * eventFactor
      const demand = getDemandLevel(demandScore, occupancyRate, trendsScore)

      const confidenceFactors: ConfidenceFactors = {
        dataQuality: marketData ? Math.min(1.0, marketData.count / 20) : 0.3,
        scanRecency:
          hoursSinceLastScan < 6 ? 1.0 : hoursSinceLastScan < 24 ? 0.85 : hoursSinceLastScan < 72 ? 0.65 : 0.4,
        historicalData: calendarData ? 0.9 : 0.4,
        bookingData: bookedRooms > 0 ? Math.min(1.0, 0.5 + (occupancyRate / 100) * 0.5) : 0.35,
        competitorData:
          bookingAvg || expediaAvg
            ? 0.95
            : hotelCompetitors.length > 0
              ? Math.min(1.0, 0.5 + hotelCompetitors.length * 0.1)
              : 0.3,
        marketConsistency: getMarketConsistency(hotel.id),
        externalDataQuality: externalData.holidays ? 0.9 : 0.5,
      }

      const confidence = calculateConfidence(confidenceFactors)

      const priceVsBase = ((predictedPrice - basePrice) / basePrice) * 100
      const priceVsCompetitor = competitorAvg ? ((predictedPrice - competitorAvg) / competitorAvg) * 100 : 0

      let recommendation = null
      let recommendationType = null

      if (priceVsBase > 20 && demand === "very_high") {
        recommendation = `העלה מחיר ל-${dateStr} - ביקוש גבוה מאוד`
        recommendationType = "price_increase"
      } else if (priceVsBase < -10 && occupancyRate < 30) {
        recommendation = `שקול מבצע ל-${dateStr} - תפוסה נמוכה`
        recommendationType = "promotion"
      } else if (competitorAvg && priceVsCompetitor > 15) {
        recommendation = `המחיר שלך גבוה מ-15% מהמתחרים ב-${dateStr}`
        recommendationType = "competitor_alert"
      } else if (competitorAvg && priceVsCompetitor < -15) {
        recommendation = `יש מקום להעלות מחיר ב-${dateStr} - מתחת למתחרים`
        recommendationType = "opportunity"
      }

      predictions.push({
        hotel_id: hotel.id,
        prediction_date: dateStr,
        predicted_price: predictedPrice,
        predicted_demand: demand,
        confidence_score: confidence,
        base_price: basePrice,
        recommendation,
        recommendation_type: recommendationType,
        factors: {
          seasonality: seasonData.label,
          seasonality_factor: seasonality.toFixed(2),
          day_of_week: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek],
          is_weekend: isWeekend,
          competitor_avg: competitorAvg ? Math.round(competitorAvg) : null,
          booking_avg: bookingAvg ? Math.round(bookingAvg) : null,
          expedia_avg: expediaAvg ? Math.round(expediaAvg) : null,
          events: events.map((e) => e.name).concat(isWeekend ? ["Weekend"] : []),
          event_types: events.map((e) => e.type),
          occupancy_rate: Math.round(occupancyRate),
          booked_rooms: bookedRooms,
          total_rooms: totalRooms,
          budget_gap: Math.round(budgetGap),
          budget_pressure: budgetPressure.toFixed(2),
          lead_time_days: i,
          lead_time_factor: leadTimeFactor.toFixed(2),
          google_trends_score: trendsScore,
          google_trends_source: trendsSource,
          booking_velocity: bookingVelocity,
          velocity_factor: velocityFactor.toFixed(2),
          price_vs_base: priceVsBase.toFixed(1),
          price_vs_competitor: priceVsCompetitor.toFixed(1),
          analysis_params_used: analysisParams,
          confidence_breakdown: {
            data_quality: (confidenceFactors.dataQuality * 100).toFixed(0) + "%",
            scan_recency: (confidenceFactors.scanRecency * 100).toFixed(0) + "%",
            historical_data: (confidenceFactors.historicalData * 100).toFixed(0) + "%",
            booking_data: (confidenceFactors.bookingData * 100).toFixed(0) + "%",
            competitor_data: (confidenceFactors.competitorData * 100).toFixed(0) + "%",
            market_consistency: (confidenceFactors.marketConsistency * 100).toFixed(0) + "%",
            external_data: (confidenceFactors.externalDataQuality * 100).toFixed(0) + "%",
          },
        },
      })

      if (recommendation) {
        recommendations.push({
          hotel_id: hotel.id,
          hotel_name: hotel.name,
          date: dateStr,
          type: recommendationType,
          message: recommendation,
          predicted_price: predictedPrice,
          confidence,
        })
      }
    }
  }

  await supabase
    .from("price_predictions")
    .delete()
    .in("hotel_id", hotelIds)
    .gte("prediction_date", today.toISOString().split("T")[0])

  const { error } = await supabase.from("price_predictions").insert(predictions)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const avgConfidence =
    predictions.length > 0 ? predictions.reduce((sum, p) => sum + p.confidence_score, 0) / predictions.length : 0
  const avgPrice =
    predictions.length > 0 ? predictions.reduce((sum, p) => sum + p.predicted_price, 0) / predictions.length : 0
  const demandDistribution = predictions.reduce(
    (acc, p) => {
      acc[p.predicted_demand] = (acc[p.predicted_demand] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return NextResponse.json({
    success: true,
    count: predictions.length,
    days_ahead: predictionDays,
    selected_months: selectedMonths,
    selected_year: selectedYear,
    message: `Generated ${predictions.length} predictions for ${hotels.length} hotels`,
    algorithm_version: "3.2",
    statistics: {
      avg_confidence: (avgConfidence * 100).toFixed(1) + "%",
      avg_price: Math.round(avgPrice),
      price_range: {
        min: Math.min(...predictions.map((p) => p.predicted_price)),
        max: Math.max(...predictions.map((p) => p.predicted_price)),
      },
      demand_distribution: demandDistribution,
    },
    recommendations: recommendations.slice(0, 20), // Top 20 recommendations
    recommendations_count: recommendations.length,
    analysis_params: analysisParams,
    data_sources: {
      internal: {
        scan_results: recentResults?.length || 0,
        bookings: bookings?.length || 0,
        competitors: competitors?.length || 0,
        competitor_prices: competitorPrices?.length || 0,
      },
      external: {
        holidays: externalData.holidays?.holidays?.length || 0,
        google_trends: trendsSource,
        trends_score: trendsScore,
        market_intel: marketIntel ? "available" : "unavailable",
        booking_velocity: bookingVelocity,
      },
    },
    data_quality: {
      hours_since_last_scan: Math.round(hoursSinceLastScan),
      total_scan_results: recentResults?.length || 0,
      total_bookings: bookings?.length || 0,
    },
  })
}
