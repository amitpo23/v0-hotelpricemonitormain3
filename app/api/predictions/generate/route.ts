import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { 
  orchestrateComprehensiveData, 
  extractDateImpactFactors, 
  getRecommendedOptions,
  checkExternalDataAvailability 
} from "@/lib/agents/orchestrator-v2"
import { getPredictionLogger } from "@/lib/logging/prediction-logger"
import { savePredictionLog } from "@/lib/logging/prediction-logger-db"

// Route segment config - set max duration to 50 seconds
export const maxDuration = 50

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

/**
 * Enhanced confidence calculation - date-specific
 * Takes into account time distance, event certainty, historical data availability
 */
function calculateConfidence(factors: ConfidenceFactors, daysUntilDate: number, hasEvents: boolean, hasHistoricalData: boolean): number {
  const weights = {
    dataQuality: 0.2,
    scanRecency: 0.18,
    historicalData: 0.12,
    bookingData: 0.15,
    competitorData: 0.15,
    marketConsistency: 0.1,
    externalDataQuality: 0.1,
  }

  // Base confidence from factors
  let confidence =
    factors.dataQuality * weights.dataQuality +
    factors.scanRecency * weights.scanRecency +
    factors.historicalData * weights.historicalData +
    factors.bookingData * weights.bookingData +
    factors.competitorData * weights.competitorData +
    factors.marketConsistency * weights.marketConsistency +
    factors.externalDataQuality * weights.externalDataQuality

  // Date-specific adjustments
  
  // 1. Time distance penalty - further dates are less certain
  const timeDistanceFactor = Math.max(0.7, 1 - (daysUntilDate / 365) * 0.3)
  confidence *= timeDistanceFactor

  // 2. Event certainty bonus - known events increase confidence
  if (hasEvents) {
    confidence *= 1.08 // 8% boost for known events
  }

  // 3. Historical data bonus - having last year's data increases confidence
  if (hasHistoricalData) {
    confidence *= 1.12 // 12% boost for historical comparison
  }

  // 4. Near-term booking data bonus
  if (daysUntilDate <= 14 && factors.bookingData > 0.7) {
    confidence *= 1.15 // 15% boost for near-term with good booking data
  }

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

async function getDynamicBasePrice(hotelId: string, supabase: any): Promise<number> {
  try {
    // Calculate date 180 days ago
    const date180DaysAgo = new Date()
    date180DaysAgo.setDate(date180DaysAgo.getDate() - 180)
    const date180Str = date180DaysAgo.toISOString().split('T')[0]

    // Query avg nightly_rate from bookings (last 180 days, status confirmed/completed)
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('nightly_rate')
      .eq('hotel_id', hotelId)
      .in('status', ['confirmed', 'completed'])
      .gte('check_in_date', date180Str)
      .not('nightly_rate', 'is', null)

    if (bookingsData && bookingsData.length > 0) {
      const avgBookingRate = bookingsData.reduce((sum: number, b: any) => sum + (b.nightly_rate || 0), 0) / bookingsData.length
      if (avgBookingRate > 300) {
        return Math.round(avgBookingRate)
      }
    }

    // Calculate date 60 days ago
    const date60DaysAgo = new Date()
    date60DaysAgo.setDate(date60DaysAgo.getDate() - 60)
    const date60Str = date60DaysAgo.toISOString().split('T')[0]

    // Query avg price from competitor_daily_prices (last 60 days, price > 100)
    const { data: competitorData } = await supabase
      .from('competitor_daily_prices')
      .select('price')
      .eq('hotel_id', hotelId)
      .gte('scan_date', date60Str)
      .gt('price', 100)
      .not('price', 'is', null)

    if (competitorData && competitorData.length > 0) {
      const avgCompetitorPrice = competitorData.reduce((sum: number, c: any) => sum + (c.price || 0), 0) / competitorData.length
      if (avgCompetitorPrice > 300) {
        return Math.round(avgCompetitorPrice)
      }
    }

    // Fallback
    return 550
  } catch (error) {
    console.error('Error calculating dynamic base price:', error)
    return 550 // Return fallback on error
  }
}

export async function POST(request: Request) {
  // Generate unique session ID for tracking
  const sessionId = `gen-${Date.now()}-${Math.random().toString(36).substring(7)}`
  
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Get debug mode from query params
    const url = new URL(request.url)
    const debugMode = url.searchParams.get('debug') === 'true'

    const selectedMonths: number[] = body.months || body.selectedMonths || []
    const selectedYear: number = body.year || body.selectedYear || new Date().getFullYear()
    const hotelIds: string[] = body.hotelIds || (body.hotels ? body.hotels.map((h: any) => h.id) : [])
    const daysAhead: number = body.daysAhead || 90
    
    // Initialize generation log
    await supabase.from('prediction_generation_logs').insert({
      session_id: sessionId,
      status: 'running',
      selected_year: selectedYear,
      selected_months: selectedMonths,
      hotel_ids: hotelIds,
      logs: [{
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Starting prediction generation for ${selectedMonths.length} months in ${selectedYear}`,
        data: { selectedMonths, selectedYear, hotelCount: hotelIds.length }
      }]
    })
    
    const analysisParams = body.analysisParams || {
      includeCompetitors: true,
      includeSeasonality: true,
      includeEvents: true,
      includeOccupancy: true,
      includeBudget: true,
      includeFutureBookings: true,
      includeMarketTrends: true,
    }

    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    let startDate: Date
    let predictionDays: number

    console.log(
      `[v0] Input: selectedYear=${selectedYear}, selectedMonths=${JSON.stringify(selectedMonths)}, currentYear=${currentYear}, currentMonth=${currentMonth}`,
    )

    if (selectedMonths.length > 0) {
      const earliestMonth = Math.min(...selectedMonths)
      const latestMonth = Math.max(...selectedMonths)

      // Always start from first day of earliest selected month in selected year
      startDate = new Date(selectedYear, earliestMonth - 1, 1)

      // End date is last day of latest selected month
      const endDate = new Date(selectedYear, latestMonth, 0)
      predictionDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

      // Ensure reasonable range
      predictionDays = Math.max(28, Math.min(400, predictionDays))

      console.log(`[v0] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}, days=${predictionDays}`)
    } else {
      // No specific months - use daysAhead from today
      startDate = new Date(today)
      predictionDays = daysAhead
    }

    console.log(
      `[v0] Predictions: startDate=${startDate.toISOString()}, predictionDays=${predictionDays}, selectedYear=${selectedYear}, selectedMonths=${JSON.stringify(selectedMonths)}, hotelIds=${JSON.stringify(hotelIds)}`,
    )

    let finalHotelIds = hotelIds
    if (finalHotelIds.length === 0) {
      const { data: allHotels } = await supabase.from("hotels").select("id")
      finalHotelIds = allHotels?.map((h) => h.id) || []
    }

    if (finalHotelIds.length === 0) {
      return NextResponse.json({ error: "No hotels found" }, { status: 400 })
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"

    console.log('[v0] 📊 Fetching data from Supabase and external sources...')
    
    // Add log entry
    await supabase.rpc('add_generation_log_entry', {
      p_session_id: sessionId,
      p_log_entry: {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Fetching data from Supabase and external sources...',
        data: { hotelIds: finalHotelIds, dateRange: `${startDate.toISOString()} - ${predictionDays} days` }
      }
    })
    
    // Wrap Promise.all with timeout to prevent hanging
    const dataFetchPromise = Promise.all([
      fetchExternalData(baseUrl),
      supabase
        .from("bookings")
        .select("*")
        .in("hotel_id", finalHotelIds)
        .gte("check_in_date", today.toISOString().split("T")[0])
        .eq("status", "confirmed"),
      supabase.from("revenue_budgets").select("*").in("hotel_id", finalHotelIds).gte("year", currentYear),
      supabase
        .from("revenue_tracking")
        .select("*")
        .in("hotel_id", finalHotelIds)
        .gte("date", new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0]),
      supabase.from("scan_results").select("*").order("scraped_at", { ascending: false }).limit(500),
      supabase
        .from("daily_prices")
        .select("*")
        .in("hotel_id", finalHotelIds)
        .gte("date", today.toISOString().split("T")[0]),
      supabase.from("scans").select("*").order("created_at", { ascending: false }).limit(50),
      supabase
        .from("hotel_competitors")
        .select("*, competitor_room_types(*)")
        .in("hotel_id", finalHotelIds)
        .eq("is_active", true),
      supabase
        .from("competitor_daily_prices")
        .select("*")
        .gte("date", today.toISOString().split("T")[0])
        .lte("date", new Date(today.getTime() + predictionDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
    ])
    
    const dataFetchTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Data fetch timeout after 20s')), 20000)
    )
    
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
    ] = await Promise.race([dataFetchPromise, dataFetchTimeout]) as any
    
    console.log('[v0] ✅ Data fetched successfully')

    // Initialize prediction logger (enable with query param ?debug=true)
    const predictionLogger = getPredictionLogger(debugMode)
    if (debugMode) {
      console.log('[v0] 🔍 Debug mode enabled - detailed logging active')
    }

    const holidayMap = buildHolidayMap(externalData.holidays)
    const trendsScore = externalData.trends?.data?.interestScore || 75
    const trendsSource = externalData.trends?.data?.source || "default"
    const marketIntel = externalData.marketIntel
    const bookingVelocity = marketIntel?.bookingVelocity?.trend || "stable"

    // NEW: Orchestrate enhanced external data using multi-agent system
    console.log('[v0] 🤖 Activating Multi-Agent System...')
    const dataAvailability = await checkExternalDataAvailability()
    console.log(`[v0] External data sources: Tavily=${dataAvailability.tavily}, DB=${dataAvailability.database}`)
    
    // Collect all prediction dates
    const allPredictionDates: Date[] = []
      console.log('[DEBUG] 🔍 Environment Check:')
  console.log('[DEBUG] - TAVILY_API_KEY exists:', !!process.env.TAVILY_API_KEY)
  console.log('[DEBUG] - TAVILY_API_KEY length:', process.env.TAVILY_API_KEY?.length || 0)
  console.log('[DEBUG] - TAVILY_API_KEY first 10 chars:', process.env.TAVILY_API_KEY?.substring(0, 10) || 'N/A')
  console.log('[DEBUG] - dataAvailability.tavily:', dataAvailability.tavily)
  console.log('[DEBUG] - dataAvailability.overall:', dataAvailability.overall)
    for (let i = 0; i < predictionDays; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      allPredictionDates.push(date)
    }

    // Get recommended orchestrator options
    const orchestratorOptions = getRecommendedOptions(
      allPredictionDates.length,
      Math.ceil((allPredictionDates[0]?.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    )

    console.log(`[v0] Orchestrator options:`, orchestratorOptions)

    // Run orchestrator for the first hotel to gather general market data
    // (Events and statistics are same for all hotels in same location)
    let enhancedExternalData: any = null
    if (dataAvailability.overall && finalHotelIds.length > 0) {
      try {
        const { data: firstHotel } = await supabase
          .from('hotels')
          .select('id, name, base_price')
          .eq('id', finalHotelIds[0])
          .single()

        if (firstHotel) {
          // Add timeout wrapper to prevent hanging (30 seconds max)
          const orchestratorPromise = orchestrateComprehensiveData(
            firstHotel.id,
            firstHotel.name || 'Hotel',
            'Tel Aviv', // TODO: Get from hotel data
            allPredictionDates,
            firstHotel.base_price || 180,
            orchestratorOptions
          )
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Orchestrator timeout after 30s')), 30000)
          )
          
          enhancedExternalData = await Promise.race([orchestratorPromise, timeoutPromise])
          
          console.log(`[v0] 🎉 Enhanced Multi-Agent System completed:`)
          console.log(`[v0]   - Events: ${enhancedExternalData.events.size} dates, confidence ${(enhancedExternalData.eventsConfidence * 100).toFixed(0)}%`)
          console.log(`[v0]   - Historical: ${enhancedExternalData.historical.size} dates, confidence ${(enhancedExternalData.historicalConfidence * 100).toFixed(0)}%`)
          console.log(`[v0]   - Holidays: ${enhancedExternalData.holidays.size} dates, confidence ${(enhancedExternalData.holidaysConfidence * 100).toFixed(0)}%`)
          console.log(`[v0]   - Trends: ${enhancedExternalData.trends.size} dates, confidence ${(enhancedExternalData.trendsConfidence * 100).toFixed(0)}%`)
          console.log(`[v0]   - Competitors: ${enhancedExternalData.competitors.size} dates, confidence ${(enhancedExternalData.competitorsConfidence * 100).toFixed(0)}%`)
          console.log(`[v0]   - Budget: ${enhancedExternalData.budget ? 'Available' : 'N/A'}, confidence ${(enhancedExternalData.budgetConfidence * 100).toFixed(0)}%`)
          console.log(`[v0]   - Velocity: ${enhancedExternalData.velocity ? enhancedExternalData.velocity.trend : 'N/A'}, confidence ${(enhancedExternalData.velocityConfidence * 100).toFixed(0)}%`)
          console.log(`[v0]   - Statistics: confidence ${(enhancedExternalData.statisticsConfidence * 100).toFixed(0)}%`)
          console.log(`[v0]   - Overall Confidence: ${(enhancedExternalData.overallConfidence * 100).toFixed(0)}%`)
          console.log(`[v0]   - Data Quality: ${enhancedExternalData.dataQuality}`)
          console.log(`[v0]   - Data Sources: ${enhancedExternalData.dataSources.join(', ')}`)
          console.log(`[v0]   - Timestamp: ${enhancedExternalData.timestamp}`)
          
          // Log to prediction logger
          predictionLogger.logMultiAgent(
            firstHotel.id,
            firstHotel.name || 'Hotel',
            {
              eventsFound: enhancedExternalData.events.size,
              eventsConfidence: enhancedExternalData.eventsConfidence,
              historicalData: enhancedExternalData.historical.size,
              historicalConfidence: enhancedExternalData.historicalConfidence,
              holidaysData: enhancedExternalData.holidays.size,
              holidaysConfidence: enhancedExternalData.holidaysConfidence,
              trendsData: enhancedExternalData.trends.size,
              trendsConfidence: enhancedExternalData.trendsConfidence,
              competitorsData: enhancedExternalData.competitors.size,
              competitorsConfidence: enhancedExternalData.competitorsConfidence,
              budgetData: enhancedExternalData.budget ? 'Available' : 'N/A',
              budgetConfidence: enhancedExternalData.budgetConfidence,
              velocityData: enhancedExternalData.velocity ? enhancedExternalData.velocity.trend : 'N/A',
              velocityConfidence: enhancedExternalData.velocityConfidence,
              statisticsConfidence: enhancedExternalData.statisticsConfidence,
              overallConfidence: enhancedExternalData.overallConfidence,
              dataQuality: enhancedExternalData.dataQuality,
              dataSources: enhancedExternalData.dataSources,
              executionTime: Date.now() - new Date(enhancedExternalData.timestamp).getTime()
            }
          )
          
          // Log market pricing floor if available
          if (enhancedExternalData.statistics?.tourism?.avgNightlyRate) {
            console.log(`[v0]   - Market Avg Price: ₪${enhancedExternalData.statistics.tourism.avgNightlyRate} (Tel Aviv)`)
          }
          
          // Log budget insights if available
          if (enhancedExternalData.budget) {
            console.log(`[v0]   - Budget Gap: ₪${Math.round(enhancedExternalData.budget.budgetGap)}, Pressure: ${enhancedExternalData.budget.pricingPressure.toFixed(2)}x`)
          }
          
          // Log velocity insights if available
          if (enhancedExternalData.velocity) {
            console.log(`[v0]   - Booking Velocity: ${enhancedExternalData.velocity.trend} (${enhancedExternalData.velocity.bookingsLast7Days} bookings/7d), Impact: ${enhancedExternalData.velocity.pricingImpact.toFixed(2)}x`)
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[v0] Enhanced Multi-Agent System failed:', errorMsg)
        if (errorMsg.includes('timeout')) {
          console.error('[v0] ⏱️  Orchestrator timed out after 30 seconds - continuing without external data')
        }
        enhancedExternalData = null
      }
    } else {
      console.log('[v0] ⚠️  Multi-Agent System skipped - external data sources unavailable')
    }

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

    const marketDataByHotel: Record<
      string,
      { avg: number; min: number; max: number; count: number; prices: number[] }
    > = {}

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

    for (const hotelId of finalHotelIds) {
      // Fetch hotel details from Supabase
      const { data: hotelData } = await supabase.from("hotels").select("*").eq("id", hotelId).single()
      const hotel = hotelData || { id: hotelId, base_price: 150, total_rooms: 34 }

      // Add log entry for hotel processing
      await supabase.rpc('add_generation_log_entry', {
        p_session_id: sessionId,
        p_log_entry: {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Processing hotel: ${hotel.name || hotelId}`,
          data: { hotelId, hotelName: hotel.name, basePrice: hotel.base_price, rooms: hotel.total_rooms }
        }
      })

      const basePrice = hotel.base_price || await getDynamicBasePrice(hotel.id, supabase) || 550
      const totalRooms = hotel.total_rooms || 34 // Default to 34 rooms for Scarlet Hotel
      const hotelCompetitors = competitorsByHotel[hotel.id] || []
      const marketData = marketDataByHotel[hotel.id]

      // Log data collection for this hotel
      predictionLogger.logDataCollection(
        hotel.id,
        hotel.name || 'Unknown Hotel',
        {
          scanResults: recentResults?.length || 0,
          bookings: bookings?.filter((b: any) => b.hotel_id === hotel.id).length || 0,
          competitorPrices: competitorPrices?.filter((cp: any) => cp.hotel_id === hotel.id).length || 0,
          basePrice: basePrice,
          totalRooms: totalRooms
        }
      )

      const hotelRecommendations: string[] = []

      for (let i = 0; i < predictionDays; i++) {
        const predDate = new Date(startDate)
        predDate.setDate(predDate.getDate() + i)
        const dateStr = predDate.toISOString().split("T")[0]
        const monthDay = `${String(predDate.getMonth() + 1).padStart(2, "0")}-${String(predDate.getDate()).padStart(2, "0")}`
        const predMonth = predDate.getMonth() + 1
        const predYear = predDate.getFullYear()

        if (selectedMonths.length > 0) {
          // Only include dates in selected months AND selected year
          if (!selectedMonths.includes(predMonth) || predYear !== selectedYear) {
            continue
          }
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

        // Budget pressure: can increase up to 1.18x, but never decrease below 0.95x
        // This ensures we don't undercut the market even when budget pressure is negative
        const budgetPressure =
          analysisParams.includeBudget && targetRevenue > 0
            ? Math.max(0.95, Math.min(1.18, 1 + (budgetGap / targetRevenue) * 0.25))
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
        let eventFactor = events.length > 0 ? events.reduce((max, e) => Math.max(max, e.impact), 1.0) : 1.0

        // Enhanced: Apply multi-agent event impact
        if (enhancedExternalData) {
          const dateImpact = extractDateImpactFactors(dateStr, enhancedExternalData)
          if (dateImpact.eventImpact > eventFactor) {
            console.log(`[v0] ${dateStr}: Upgrading event factor from ${eventFactor.toFixed(2)} to ${dateImpact.eventImpact.toFixed(2)}`)
            eventFactor = dateImpact.eventImpact
          }
        }

        // Log factor calculation for first 3 dates or when debug enabled
        if ((i < 3 || debugMode) && predictionLogger) {
          predictionLogger.logFactorCalculation(
            hotel.id,
            hotel.name || 'Unknown Hotel',
            dateStr,
            {
              basePrice,
              seasonality,
              seasonalityLabel: seasonData.label,
              weekendFactor,
              isWeekend,
              leadTimeFactor,
              leadTimeDays: i,
              occupancyFactor,
              occupancyRate,
              eventFactor,
              events: events.map(e => e.name),
              competitorFactor,
              competitorAvg,
              budgetPressure,
              budgetGap,
              velocityFactor,
              bookingVelocity
            }
          )
        }

        // ===== CALCULATE PREDICTED PRICE USING ORCHESTRATOR DATA =====
        const demandScore = seasonality * weekendFactor * occupancyFactor * eventFactor
        
        // Calculate raw price with all factors
        let rawPrice = basePrice * seasonality * weekendFactor * leadTimeFactor * occupancyFactor * eventFactor * competitorFactor * budgetPressure * velocityFactor
        
        // Debug log for first few dates
        if (i < 5 || debugMode) {
          console.log(`[v0] 🎯 ${dateStr} Price Debug:`, {
            basePrice,
            seasonality: seasonality.toFixed(2),
            weekendFactor: weekendFactor.toFixed(2),
            leadTimeFactor: leadTimeFactor.toFixed(2),
            occupancyFactor: occupancyFactor.toFixed(2),
            eventFactor: eventFactor.toFixed(2),
            competitorFactor: competitorFactor.toFixed(2),
            budgetPressure: budgetPressure.toFixed(2),
            velocityFactor: velocityFactor.toFixed(2),
            rawPrice: Math.round(rawPrice)
          })
        }
        
        const adjustments: string[] = []
        
        // Apply enhanced historical trends if available from orchestrator
        if (enhancedExternalData) {
          const dateImpact = extractDateImpactFactors(dateStr, enhancedExternalData)
          if (dateImpact.historicalTrend === 'increasing') {
            rawPrice *= 1.08
            adjustments.push('Historical trend: +8% (increasing)')
          } else if (dateImpact.historicalTrend === 'decreasing') {
            rawPrice *= 0.94
            adjustments.push('Historical trend: -6% (decreasing)')
          }
        }
        
        // Calculate market-based price floors (use HIGHEST - most restrictive)
        const ABSOLUTE_MINIMUM = 300 // Hard floor - never go below ₪300
        const competitorFloor = competitorAvg || (basePrice * 0.80) // Lower fallback when no competitor data
        const govStatsFloor = enhancedExternalData?.statistics?.tourism?.avgNightlyRate 
          ? enhancedExternalData.statistics.tourism.avgNightlyRate * 0.85 
          : competitorFloor * 0.85
        const currentPriceFloor = basePrice * 0.75 // Don't drop below 75% of base
        
        const marketMinimums = [ABSOLUTE_MINIMUM, competitorFloor, govStatsFloor, currentPriceFloor]
        const minPrice = Math.max(...marketMinimums) // Take HIGHEST (most restrictive)
        
        // Debug log for floor application
        if (i < 5 || debugMode) {
          console.log(`[v0] 💰 ${dateStr} Floor Debug:`, {
            rawPrice: Math.round(rawPrice),
            floors: {
              absolute: ABSOLUTE_MINIMUM,
              competitor: Math.round(competitorFloor),
              govStats: Math.round(govStatsFloor),
              current: Math.round(currentPriceFloor)
            },
            minPrice: Math.round(minPrice),
            floorWillApply: rawPrice < minPrice
          })
        }
        
        // Check if floor is applied
        const floorApplied = rawPrice < minPrice
        if (floorApplied) {
          adjustments.push(`Price floor applied: ₪${Math.round(rawPrice)} → ₪${Math.round(minPrice)}`)
        }
        
        // Enforce price floor
        let predictedPrice = Math.max(minPrice, rawPrice)
        
        // Round to nearest 5 for cleaner pricing
        const preRoundPrice = predictedPrice
        predictedPrice = Math.round(predictedPrice / 5) * 5
        if (preRoundPrice !== predictedPrice) {
          adjustments.push(`Rounded to nearest 5: ₪${Math.round(preRoundPrice)} → ₪${predictedPrice}`)
        }
        
        // Log price calculation for first 3 dates or when debug enabled
        if ((i < 3 || debugMode) && predictionLogger) {
          predictionLogger.logPriceCalculation(
            hotel.id,
            hotel.name || 'Unknown Hotel',
            dateStr,
            {
              rawPrice,
              marketFloors: {
                absolute: ABSOLUTE_MINIMUM,
                competitor: competitorFloor,
                govStats: govStatsFloor,
                current: currentPriceFloor,
                applied: minPrice
              },
              finalPrice: predictedPrice,
              adjustments
            }
          )
        }
        
        const demand = getDemandLevel(demandScore, occupancyRate, trendsScore)
        
        console.log(`[v0] 🎯 ${dateStr}: Price: ₪${predictedPrice} (floor: ₪${Math.round(minPrice)}, raw: ₪${Math.round(rawPrice)}), Demand: ${demand}`)

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
          externalDataQuality: enhancedExternalData 
            ? Math.min(0.95, enhancedExternalData.overallConfidence) 
            : (externalData?.holidays ? 0.5 : 0.3), // Fallback to basic external data
        }

        // Calculate days until this date for time-based confidence adjustment
        const daysUntilDate = Math.ceil((predDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        // Enhanced event detection using multi-agent data
        let hasEvents = events.length > 0
        let hasHistoricalData = !!calendarData
        
        if (enhancedExternalData) {
          const dateImpact = extractDateImpactFactors(dateStr, enhancedExternalData)
          hasEvents = hasEvents || dateImpact.hasEvents
          hasHistoricalData = hasHistoricalData || dateImpact.hasHistoricalData
        }
        
        // Calculate confidence using enhanced data
        const baseConfidence = 
          confidenceFactors.dataQuality * 0.2 +
          confidenceFactors.scanRecency * 0.18 +
          confidenceFactors.historicalData * 0.12 +
          confidenceFactors.bookingData * 0.15 +
          confidenceFactors.competitorData * 0.15 +
          confidenceFactors.marketConsistency * 0.1 +
          confidenceFactors.externalDataQuality * 0.1
        
        const timeDistanceFactor = Math.max(0.7, 1 - (daysUntilDate / 365) * 0.3)
        const eventBonus = hasEvents
        const historicalBonus = hasHistoricalData
        const nearTermBonus = daysUntilDate <= 14 && confidenceFactors.bookingData > 0.7
        
        const confidence = calculateConfidence(confidenceFactors, daysUntilDate, hasEvents, hasHistoricalData)
        
        // Log confidence calculation for first 3 dates or when debug enabled
        if ((i < 3 || debugMode) && predictionLogger) {
          predictionLogger.logConfidenceCalculation(
            hotel.id,
            hotel.name || 'Unknown Hotel',
            dateStr,
            {
              factors: confidenceFactors,
              adjustments: {
                timeDistance: timeDistanceFactor,
                eventBonus,
                historicalBonus,
                nearTermBonus
              },
              baseConfidence,
              finalConfidence: confidence,
              daysUntilDate
            }
          )
        }
        
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

        // Log final result for first 3 dates or when debug enabled
        if ((i < 3 || debugMode) && predictionLogger) {
          predictionLogger.logFinalResult(
            hotel.id,
            hotel.name || 'Unknown Hotel',
            dateStr,
            {
              predictedPrice,
              confidence,
              demand,
              recommendation,
              recommendationType,
              basePrice,
              priceVsBase,
              priceVsCompetitor
            }
          )
        }

        // Save detailed log to database (only for first 5 dates or when debug enabled)
        if (i < 5 || debugMode) {
          await savePredictionLog({
            hotelId: hotel.id,
            hotelName: hotel.name || 'Unknown Hotel',
            predictionDate: dateStr,
            algorithmVersion: '3.2',
            
            // Multi-Agent data
            multiAgentData: enhancedExternalData ? {
              eventsFound: enhancedExternalData.events.size,
              eventsConfidence: enhancedExternalData.eventsConfidence,
              eventsList: Array.from(enhancedExternalData.events.values()).slice(0, 10).map((e: any) => ({
                name: e.name || 'Unknown',
                date: e.date || dateStr,
                impact: e.impact || 1.0
              })),
              historicalData: enhancedExternalData.historical.size,
              historicalConfidence: enhancedExternalData.historicalConfidence,
              historicalTrend: extractDateImpactFactors(dateStr, enhancedExternalData).historicalTrend,
              statisticsConfidence: enhancedExternalData.statisticsConfidence,
              marketAvgPrice: enhancedExternalData.statistics?.tourism?.avgNightlyRate,
              overallConfidence: enhancedExternalData.overallConfidence,
              dataQuality: enhancedExternalData.dataQuality
            } : undefined,
            
            // Input data
            inputData: {
              basePrice,
              totalRooms,
              bookedRooms,
              scanResults: recentResults?.length || 0,
              bookings: bookings?.filter((b: any) => b.hotel_id === hotel.id).length || 0,
              competitorPrices: competitorPrices?.filter((cp: any) => cp.hotel_id === hotel.id).length || 0,
              competitorAvg: competitorAvg || undefined,
              lastScanHoursAgo: hoursSinceLastScan
            },
            
            // Factors
            factors: {
              seasonality: {
                value: seasonality,
                label: seasonData.label,
                impact: seasonality > 1.15 ? 'high' : seasonality < 0.9 ? 'high' : 'medium',
                reasoning: `${seasonData.label} - עונת ${seasonality > 1 ? 'שיא' : seasonality < 1 ? 'שפל' : 'רגיל'}`,
                calculation: `${(seasonality * 100 - 100).toFixed(0)}%`
              },
              weekendPremium: {
                value: weekendFactor,
                isWeekend,
                impact: 'medium',
                reasoning: isWeekend ? 'סוף שבוע - ביקוש גבוה יותר' : 'אמצע שבוע'
              },
              leadTime: {
                value: leadTimeFactor,
                days: i,
                impact: leadTimeFactor > 1.1 ? 'high' : leadTimeFactor < 0.97 ? 'medium' : 'low',
                reasoning: `${i} ימים לפני הגעה - ${i < 7 ? 'הזמנה דחופה' : i < 30 ? 'טווח קצר' : 'טווח ארוך'}`
              },
              occupancy: {
                value: occupancyFactor,
                rate: occupancyRate,
                impact: occupancyRate > 70 ? 'high' : occupancyRate < 20 ? 'high' : 'medium',
                reasoning: `תפוסה ${occupancyRate.toFixed(0)}% - ${occupancyRate > 70 ? 'לחץ גבוה' : occupancyRate < 30 ? 'תפוסה נמוכה' : 'תפוסה בינונית'}`
              },
              events: {
                value: eventFactor,
                eventsList: events.map(e => e.name),
                impact: eventFactor > 1.2 ? 'high' : eventFactor > 1.0 ? 'medium' : 'low',
                reasoning: events.length > 0 ? `אירועים: ${events.map(e => e.name).join(', ')}` : 'אין אירועים'
              },
              competitor: {
                value: competitorFactor,
                avgPrice: competitorAvg,
                impact: Math.abs(competitorFactor - 1) > 0.1 ? 'high' : 'medium',
                reasoning: competitorAvg ? `מחיר מתחרים ממוצע: ₪${competitorAvg.toFixed(0)}` : 'אין נתוני מתחרים'
              },
              budget: {
                value: budgetPressure,
                gap: budgetGap,
                impact: Math.abs(budgetPressure - 1) > 0.1 ? 'high' : 'medium',
                reasoning: `פער תקציב: ₪${budgetGap.toFixed(0)} - ${budgetGap > 0 ? 'צריך להעלות הכנסות' : 'מעל יעד'}`
              },
              velocity: {
                value: velocityFactor,
                trend: bookingVelocity,
                impact: 'medium',
                reasoning: `מגמת שוק: ${bookingVelocity === 'increasing' ? 'עולה' : bookingVelocity === 'decreasing' ? 'יורדת' : 'יציבה'}`
              }
            },
            
            // Price calculation
            priceCalculation: {
              rawPrice,
              priceBeforeFloors: rawPrice,
              floors: {
                absolute: 300,
                competitor: competitorAvg || basePrice,
                govStats: enhancedExternalData?.statistics?.tourism?.avgNightlyRate ? enhancedExternalData.statistics.tourism.avgNightlyRate * 0.85 : (competitorAvg || basePrice) * 0.85,
                currentPrice: basePrice * 0.75,
                applied: minPrice
              },
              adjustments,
              floorApplied: rawPrice < minPrice,
              finalPrice: predictedPrice,
              roundingApplied: preRoundPrice !== predictedPrice
            },
            
            // Confidence calculation
            confidenceCalculation: {
              factors: confidenceFactors,
              weights: {
                dataQuality: 0.2,
                scanRecency: 0.18,
                historicalData: 0.12,
                bookingData: 0.15,
                competitorData: 0.15,
                marketConsistency: 0.1,
                externalDataQuality: 0.1
              },
              baseConfidence,
              adjustments: {
                timeDistance: timeDistanceFactor,
                eventBonus,
                historicalBonus,
                nearTermBonus
              },
              finalConfidence: confidence,
              daysUntilDate
            },
            
            // Final result
            result: {
              predictedPrice,
              basePrice,
              confidence,
              demand,
              priceVsBase,
              priceVsCompetitor,
              recommendation,
              recommendationType
            }
          })
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

    // First, let's just insert with upsert to handle duplicates
    const { error } = await supabase.from("price_predictions").upsert(predictions, {
      onConflict: "hotel_id,prediction_date",
      ignoreDuplicates: false,
    })

    if (error) {
      console.log("[v0] Supabase insert error:", error)
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

    const priceRange =
      predictions.length > 0
        ? {
            min: Math.min(...predictions.map((p) => p.predicted_price)),
            max: Math.max(...predictions.map((p) => p.predicted_price)),
          }
        : { min: 0, max: 0 }

    // Print logger summary if debug mode
    if (debugMode && predictionLogger) {
      predictionLogger.printSummary()
      console.log('[v0] 💾 Full logs available via predictionLogger.getLogs()')
    }

    // Complete generation log
    await supabase.rpc('complete_generation_session', {
      p_session_id: sessionId,
      p_status: 'completed',
      p_predictions_created: predictions.length,
      p_predictions_updated: 0,
      p_errors_count: 0
    })

    // Add final log entry
    await supabase.rpc('add_generation_log_entry', {
      p_session_id: sessionId,
      p_log_entry: {
        timestamp: new Date().toISOString(),
        level: 'success',
        message: `✅ Successfully generated ${predictions.length} predictions`,
        data: {
          predictionsCount: predictions.length,
          avgConfidence: (avgConfidence * 100).toFixed(1) + '%',
          avgPrice: Math.round(avgPrice)
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId, // Return session ID for tracking
      count: predictions.length,
      days_ahead: predictionDays,
      selected_months: selectedMonths,
      selected_year: selectedYear,
      message:
        predictions.length > 0
          ? `Generated ${predictions.length} predictions for ${finalHotelIds.length} hotels`
          : `No predictions generated - check selected months/year`,
      algorithm_version: "3.2",
      statistics: {
        avg_confidence: (avgConfidence * 100).toFixed(1) + "%",
        avg_price: Math.round(avgPrice),
        price_range: priceRange,
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
  } catch (error) {
    console.error("[v0] Error generating predictions:", error)
    
    // Log error to database
    try {
      const supabase = await createClient()
      await supabase.rpc('complete_generation_session', {
        p_session_id: sessionId,
        p_status: 'failed',
        p_predictions_created: 0,
        p_predictions_updated: 0,
        p_errors_count: 1,
        p_error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      
      await supabase.rpc('add_generation_log_entry', {
        p_session_id: sessionId,
        p_log_entry: {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: { error: String(error) }
        }
      })
    } catch (logError) {
      console.error("[v0] Failed to log error:", logError)
    }
    
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        sessionId, // Return session ID even on error for debugging
      },
      { status: 500 },
    )
  }
}
