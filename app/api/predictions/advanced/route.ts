import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import {
  detectTrend,
  analyzeBookingPace,
  optimizePrice,
  forecastPrice,
  mlPrediction,
  detectSeasonality,
  calculateEMA,
  type PricePoint,
} from "@/lib/advanced-predictions"

/**
 * Advanced Predictions API v2.0
 * Uses ML-like algorithms, trend analysis, and price optimization
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { hotels, daysAhead = 90, useOptimization = true } = await request.json()

    if (!hotels || hotels.length === 0) {
      return NextResponse.json({ error: "No hotels provided" }, { status: 400 })
    }

    const predictionDays = Math.min(180, Math.max(30, daysAhead))
    const today = new Date()
    const hotelIds = hotels.map((h: any) => h.id)

    console.log(`[Advanced Predictions] Generating predictions for ${hotelIds.length} hotels, ${predictionDays} days ahead`)

    // Fetch all required data
    const [
      { data: historicalPrices },
      { data: bookings },
      { data: competitorPrices },
      { data: dailyPrices },
      { data: revenueTracking },
    ] = await Promise.all([
      // Historical prices from past 90 days
      supabase
        .from("daily_prices")
        .select("*")
        .in("hotel_id", hotelIds)
        .gte("date", new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("date", { ascending: true }),

      // Current and future bookings
      supabase
        .from("bookings")
        .select("*")
        .in("hotel_id", hotelIds)
        .gte("check_in_date", today.toISOString().split("T")[0])
        .eq("status", "confirmed"),

      // Competitor prices
      supabase
        .from("competitor_daily_prices")
        .select("*")
        .in("hotel_id", hotelIds)
        .gte("date", today.toISOString().split("T")[0])
        .lte("date", new Date(today.getTime() + predictionDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),

      // Current daily prices
      supabase.from("daily_prices").select("*").in("hotel_id", hotelIds),

      // Revenue tracking
      supabase
        .from("revenue_tracking")
        .select("*")
        .in("hotel_id", hotelIds)
        .gte("date", new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
    ])

    // Organize data by hotel
    const hotelHistoricalPrices: Record<string, PricePoint[]> = {}
    const hotelBookings: Record<string, any[]> = {}
    const hotelCompetitorPrices: Record<string, Record<string, number[]>> = {}
    const hotelRevenue: Record<string, any[]> = {}

    historicalPrices?.forEach((hp: any) => {
      if (!hotelHistoricalPrices[hp.hotel_id]) hotelHistoricalPrices[hp.hotel_id] = []
      hotelHistoricalPrices[hp.hotel_id].push({
        date: hp.date,
        price: hp.our_price || hp.recommended_price,
        occupancy: 0, // We'll calculate this from bookings
        demand: hp.demand_level,
      })
    })

    bookings?.forEach((b: any) => {
      if (!hotelBookings[b.hotel_id]) hotelBookings[b.hotel_id] = []
      hotelBookings[b.hotel_id].push(b)
    })

    competitorPrices?.forEach((cp: any) => {
      if (!hotelCompetitorPrices[cp.hotel_id]) hotelCompetitorPrices[cp.hotel_id] = {}
      if (!hotelCompetitorPrices[cp.hotel_id][cp.date]) hotelCompetitorPrices[cp.hotel_id][cp.date] = []
      if (cp.price > 0) hotelCompetitorPrices[cp.hotel_id][cp.date].push(cp.price)
    })

    revenueTracking?.forEach((rt: any) => {
      if (!hotelRevenue[rt.hotel_id]) hotelRevenue[rt.hotel_id] = []
      hotelRevenue[rt.hotel_id].push(rt)
    })

    const predictions: any[] = []
    const insights: any[] = []

    for (const hotel of hotels) {
      const basePrice = hotel.base_price || 150
      const totalRooms = hotel.total_rooms || 50

      const historicalData = hotelHistoricalPrices[hotel.id] || []
      const hotelBookingData = hotelBookings[hotel.id] || []
      const competitorData = hotelCompetitorPrices[hotel.id] || {}

      // Analyze historical price trend
      const historicalPricesArray = historicalData.map((p) => p.price).filter((p) => p > 0)
      const priceTrend = historicalPricesArray.length > 7 ? detectTrend(historicalPricesArray) : null

      // Detect seasonality
      const seasonality = historicalData.length >= 30 ? detectSeasonality(historicalData) : null

      // Calculate booking pace
      const bookingsByDate: Record<string, number> = {}
      hotelBookingData.forEach((b) => {
        const checkIn = new Date(b.check_in_date)
        const checkOut = new Date(b.check_out_date)
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

        for (let i = 0; i < nights; i++) {
          const date = new Date(checkIn)
          date.setDate(date.getDate() + i)
          const dateStr = date.toISOString().split("T")[0]
          bookingsByDate[dateStr] = (bookingsByDate[dateStr] || 0) + (b.room_count || 1)
        }
      })

      // Store insights for this hotel
      insights.push({
        hotel_id: hotel.id,
        hotel_name: hotel.name,
        price_trend: priceTrend
          ? {
              direction: priceTrend.direction,
              strength: Math.round(priceTrend.strength * 100),
              confidence: Math.round(priceTrend.confidence * 100),
            }
          : null,
        seasonality: seasonality
          ? {
              pattern: seasonality.period === 7 ? "weekly" : seasonality.period === 30 ? "monthly" : "custom",
              strength: Math.round(seasonality.amplitude * 100),
            }
          : null,
        historical_data_points: historicalData.length,
      })

      // Generate predictions for each day
      for (let i = 0; i < predictionDays; i++) {
        const predDate = new Date(today)
        predDate.setDate(predDate.getDate() + i)
        const dateStr = predDate.toISOString().split("T")[0]

        // Get competitor average for this date
        const competitorPricesForDate = competitorData[dateStr] || []
        const competitorAvg =
          competitorPricesForDate.length > 0
            ? competitorPricesForDate.reduce((a, b) => a + b, 0) / competitorPricesForDate.length
            : basePrice

        // Get bookings for this date
        const bookedRooms = bookingsByDate[dateStr] || 0
        const occupancyRate = (bookedRooms / totalRooms) * 100

        // Calculate historical average for same day of week and month
        const dayOfWeek = predDate.getDay()
        const month = predDate.getMonth()

        const similarDays = historicalData.filter((p) => {
          const pDate = new Date(p.date)
          return pDate.getDay() === dayOfWeek && pDate.getMonth() === month
        })

        const historicalAvg =
          similarDays.length > 0 ? similarDays.reduce((sum, p) => sum + p.price, 0) / similarDays.length : basePrice

        // Seasonality factor
        const monthSeasonality = [0.85, 0.8, 0.9, 1.0, 1.05, 1.15, 1.25, 1.3, 1.1, 0.95, 0.9, 1.2]
        const seasonalityFactor = monthSeasonality[month]

        // Weekend factor
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
        const weekendFactor = isWeekend ? 1.12 : 1.0

        // Event impact (simplified - in real system would fetch from holidays API)
        const eventImpact = 1.0

        // Use ML-like prediction
        const mlPrice = mlPrediction(basePrice, {
          historicalAvg,
          competitorAvg,
          occupancy: occupancyRate,
          leadTime: i,
          seasonalityFactor,
          trendVelocity: priceTrend?.velocity || 0,
          eventImpact,
        })

        // Use forecasting based on time series
        const { forecasted: tsPrice, confidence: tsConfidence } = forecastPrice(historicalData, i, basePrice)

        // Combine both methods (weighted average)
        const combinedPrice = Math.round(mlPrice * 0.6 + tsPrice * 0.4)

        let finalPrice = combinedPrice
        let optimizationReasoning = ""

        // Apply price optimization if enabled
        if (useOptimization && i < 30) {
          // Only optimize near-term
          const optimization = optimizePrice(combinedPrice, occupancyRate, totalRooms, -1.2, 75)
          finalPrice = optimization.optimalPrice
          optimizationReasoning = optimization.reasoning
        }

        // Determine demand level
        const demandScore = occupancyRate / 100 + (finalPrice / basePrice - 1) * 0.5
        const demand =
          demandScore > 0.8 || occupancyRate > 75
            ? "very_high"
            : demandScore > 0.6 || occupancyRate > 55
              ? "high"
              : demandScore > 0.4 || occupancyRate > 35
                ? "medium"
                : "low"

        // Confidence calculation
        const dataQuality = Math.min(1.0, historicalData.length / 60)
        const bookingDataQuality = bookedRooms > 0 ? 0.8 : 0.3
        const competitorDataQuality = competitorPricesForDate.length > 0 ? 0.9 : 0.5
        const trendConfidence = priceTrend?.confidence || 0.5

        const confidence =
          (dataQuality * 0.3 +
            bookingDataQuality * 0.25 +
            competitorDataQuality * 0.25 +
            trendConfidence * 0.2 +
            tsConfidence * 0.1) *
          (i < 30 ? 1.0 : 0.8) // Decay confidence for far future

        predictions.push({
          hotel_id: hotel.id,
          prediction_date: dateStr,
          predicted_price: finalPrice,
          predicted_demand: demand,
          confidence_score: Math.round(confidence * 100) / 100,
          algorithm_version: "v2.0-advanced",
          factors: {
            ml_price: mlPrice,
            time_series_price: tsPrice,
            combined_price: combinedPrice,
            competitor_avg: Math.round(competitorAvg),
            occupancy_rate: Math.round(occupancyRate * 10) / 10,
            lead_time_days: i,
            trend_direction: priceTrend?.direction,
            optimization_applied: useOptimization && i < 30,
            optimization_reasoning: optimizationReasoning || null,
          },
        })
      }
    }

    // Store predictions in database
    if (predictions.length > 0) {
      console.log(`[Advanced Predictions] Storing ${predictions.length} predictions`)

      // Delete old predictions for these hotels
      await supabase
        .from("price_predictions")
        .delete()
        .in("hotel_id", hotelIds)
        .gte("prediction_date", today.toISOString().split("T")[0])

      // Insert new predictions in batches
      for (let i = 0; i < predictions.length; i += 500) {
        const batch = predictions.slice(i, i + 500)
        const { error } = await supabase.from("price_predictions").insert(batch)

        if (error) {
          console.error(`[Advanced Predictions] Error inserting batch ${i}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      predictions_generated: predictions.length,
      hotels_processed: hotels.length,
      days_ahead: predictionDays,
      algorithm: "v2.0-advanced-ml",
      insights,
      summary: {
        avg_confidence: predictions.length > 0 ? predictions.reduce((sum, p) => sum + p.confidence_score, 0) / predictions.length : 0,
        hotels_with_trend_data: insights.filter((i) => i.price_trend).length,
        hotels_with_seasonality: insights.filter((i) => i.seasonality).length,
      },
    })
  } catch (error) {
    console.error("[Advanced Predictions] Error:", error)
    return NextResponse.json({ error: "Failed to generate advanced predictions", details: String(error) }, { status: 500 })
  }
}
