import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  predictPrice,
  calculateSeasonalityFactor,
  isHolidayOrEvent,
  calculateDemandScore,
  type PredictionInput,
  type PredictionOutput,
} from "@/lib/prediction-algorithms"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { hotelId, startDate, endDate, roomTypeId } = body

    // Get hotel data
    const { data: hotel } = await supabase.from("hotels").select("*").eq("id", hotelId).single()

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    // Get current prices
    const { data: dailyPrices } = await supabase
      .from("daily_prices")
      .select("*")
      .eq("hotel_id", hotelId)
      .gte("date", startDate)
      .lte("date", endDate)

    // Get competitor prices
    const { data: competitorPrices } = await supabase
      .from("competitor_daily_prices")
      .select("*, hotel_competitors(competitor_hotel_name)")
      .eq("hotel_id", hotelId)
      .gte("date", startDate)
      .lte("date", endDate)

    // Get bookings for occupancy
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("hotel_id", hotelId)
      .gte("check_in", startDate)
      .lte("check_in", endDate)

    // Get room types for capacity
    const { data: roomTypes } = await supabase.from("room_types").select("*").eq("hotel_id", hotelId)

    const totalRooms = roomTypes?.reduce((sum, rt) => sum + (rt.total_rooms || 10), 0) || 50

    // Get price history for trend analysis
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: priceHistory } = await supabase
      .from("competitor_price_history")
      .select("*")
      .eq("hotel_id", hotelId)
      .gte("recorded_at", thirtyDaysAgo.toISOString())
      .order("recorded_at", { ascending: true })

    // Calculate price trend
    let priceHistoryTrend = 0
    if (priceHistory && priceHistory.length >= 2) {
      const recentChanges = priceHistory.slice(-10)
      const avgChange = recentChanges.reduce((sum, h) => sum + (h.change_percent || 0), 0) / recentChanges.length
      priceHistoryTrend = Math.max(-1, Math.min(1, avgChange / 10))
    }

    // Generate predictions for each day
    const predictions: PredictionOutput[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      const dayOfWeek = d.getDay()
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 // Friday, Saturday
      const daysUntilDate = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      // Get current price for this date
      const dailyPrice = dailyPrices?.find((p) => p.date === dateStr)
      const currentPrice = dailyPrice?.price || hotel.base_price || 150

      // Get competitor prices for this date
      const dayCompetitorPrices = competitorPrices?.filter((p) => p.date === dateStr) || []
      const bookingPrices = dayCompetitorPrices.filter((p) => p.source === "Booking.com")
      const expediaPrices = dayCompetitorPrices.filter((p) => p.source === "Expedia")

      const competitorBookingPrice =
        bookingPrices.length > 0
          ? bookingPrices.reduce((sum, p) => sum + p.price, 0) / bookingPrices.length
          : currentPrice * 0.95

      const competitorExpediaPrice =
        expediaPrices.length > 0
          ? expediaPrices.reduce((sum, p) => sum + p.price, 0) / expediaPrices.length
          : currentPrice * 0.95

      const competitorAvgPrice =
        dayCompetitorPrices.length > 0
          ? dayCompetitorPrices.reduce((sum, p) => sum + p.price, 0) / dayCompetitorPrices.length
          : currentPrice * 0.95

      // Calculate occupancy for this date
      const dayBookings = bookings?.filter((b) => b.check_in === dateStr).length || 0
      const currentOccupancy = Math.min(100, (dayBookings / totalRooms) * 100)

      // Historical occupancy (average of similar days)
      const historicalOccupancy = 65 // Default, should be calculated from historical data

      // Holiday/Event check
      const { isHoliday, eventFactor } = isHolidayOrEvent(d)

      // Seasonality
      const seasonalityFactor = calculateSeasonalityFactor(d.getMonth() + 1)

      // Demand score
      const demandScore = calculateDemandScore(
        currentOccupancy,
        dayBookings / 7, // Weekly booking velocity
        0.5, // Default search volume
        dayCompetitorPrices.filter((p) => p.availability).length / Math.max(1, dayCompetitorPrices.length),
      )

      const input: PredictionInput = {
        date: dateStr,
        dayOfWeek,
        isWeekend,
        isHoliday,
        daysUntilDate: Math.max(0, daysUntilDate),
        currentOccupancy,
        historicalOccupancy,
        currentPrice,
        competitorAvgPrice,
        competitorBookingPrice,
        competitorExpediaPrice,
        demandScore,
        seasonalityFactor,
        eventFactor,
        priceHistoryTrend,
      }

      const prediction = predictPrice(input)
      predictions.push(prediction)
    }

    // Calculate summary statistics
    const avgPredictedPrice = predictions.reduce((sum, p) => sum + p.predictedPrice, 0) / predictions.length
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidenceScore, 0) / predictions.length
    const increaseRecommendations = predictions.filter((p) => p.recommendation === "increase").length
    const decreaseRecommendations = predictions.filter((p) => p.recommendation === "decrease").length

    return NextResponse.json({
      success: true,
      hotelId,
      dateRange: { start: startDate, end: endDate },
      predictions,
      summary: {
        totalDays: predictions.length,
        avgPredictedPrice: Math.round(avgPredictedPrice),
        avgConfidence: Math.round(avgConfidence),
        increaseRecommendations,
        decreaseRecommendations,
        maintainRecommendations: predictions.length - increaseRecommendations - decreaseRecommendations,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Advanced prediction error:", error)
    return NextResponse.json(
      { error: "Failed to generate predictions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
