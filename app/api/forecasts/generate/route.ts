import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { hotelId, year } = await request.json()

    // Get hotel details
    const { data: hotel } = await supabase.from("hotels").select("*").eq("id", hotelId).single()

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    // Get budgets for comparison
    const { data: budgets } = await supabase
      .from("revenue_budgets")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("year", year)

    // Get competitors
    const { data: competitors } = await supabase
      .from("hotel_competitors")
      .select("id")
      .eq("hotel_id", hotelId)
      .eq("is_active", true)

    const competitorIds = competitors?.map((c) => c.id) || []

    // Get REAL competitor prices for the year
    const { data: competitorPrices } = await supabase
      .from("competitor_daily_prices")
      .select("price, date, room_type")
      .in("competitor_id", competitorIds)
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`)

    const totalRooms = hotel.total_rooms || 50
    const basePrice = hotel.base_price || 150
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    // Generate forecasts for each month based on REAL data
    const forecasts = []
    for (let month = 1; month <= 12; month++) {
      const days = daysInMonth[month - 1]

      // Get real competitor prices for this month
      const monthPrices =
        competitorPrices?.filter((p) => {
          const date = new Date(p.date)
          return date.getMonth() + 1 === month
        }) || []

      // Skip months with no real data
      if (monthPrices.length === 0) {
        continue
      }

      // Calculate real competitor average
      const competitorAvg = monthPrices.reduce((sum, p) => sum + p.price, 0) / monthPrices.length

      // Get budget for this month
      const budget = budgets?.find((b) => b.month === month)
      const budgetRevenue = budget?.target_revenue || 0
      const budgetOccupancy = budget?.target_occupancy || 0

      // Calculate predictions based on real market data
      // Use competitor pricing as indicator of market conditions
      const priceRatio = competitorAvg / basePrice
      const predictedOccupancy = Math.min(95, Math.max(40, 70 * priceRatio))
      const predictedADR = competitorAvg * 0.98 // Slightly below competitors
      const predictedRoomNights = Math.round(totalRooms * days * (predictedOccupancy / 100))
      const predictedRevenue = predictedRoomNights * predictedADR
      const predictedRevPAR = predictedRevenue / (totalRooms * days)

      // Calculate variance only if budget exists
      const variance = budgetRevenue > 0 ? ((predictedRevenue - budgetRevenue) / budgetRevenue) * 100 : 0
      const onTrack = budgetRevenue === 0 || predictedRevenue >= budgetRevenue * 0.95

      forecasts.push({
        hotel_id: hotelId,
        year,
        month,
        predicted_revenue: Math.round(predictedRevenue),
        predicted_occupancy: Math.round(predictedOccupancy),
        predicted_adr: Math.round(predictedADR),
        predicted_revpar: Math.round(predictedRevPAR),
        predicted_room_nights: predictedRoomNights,
        budget_revenue: budgetRevenue,
        budget_occupancy: budgetOccupancy,
        budget_variance_percent: Math.round(variance * 10) / 10,
        on_track_for_budget: onTrack,
        market_avg_occupancy: Math.round(predictedOccupancy),
        competitor_avg_price: Math.round(competitorAvg),
        factors: {
          data_points: monthPrices.length,
          events: getMonthEvents(month),
        },
        confidence_score: Math.min(0.95, 0.5 + (monthPrices.length / 100) * 0.5),
      })
    }

    if (forecasts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No competitor data available. Run the scraper first to collect real market prices.",
      })
    }

    // Upsert forecasts
    const { error } = await supabase.from("monthly_forecasts").upsert(forecasts, {
      onConflict: "hotel_id,year,month",
      ignoreDuplicates: false,
    })

    if (error) {
      console.error("Error saving forecasts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      forecasts: forecasts.length,
      message: `Generated ${forecasts.length} monthly forecasts from real competitor data`,
    })
  } catch (error) {
    console.error("Forecast generation error:", error)
    return NextResponse.json({ error: "Failed to generate forecasts" }, { status: 500 })
  }
}

function getMonthEvents(month: number): string[] {
  const events: Record<number, string[]> = {
    1: [],
    2: [],
    3: ["Purim", "Passover Prep"],
    4: ["Passover", "Independence Day"],
    5: ["Shavuot"],
    6: ["Pride Week", "Summer Start"],
    7: ["Summer Peak"],
    8: ["Summer Peak", "Beach Season"],
    9: ["Rosh Hashanah", "Yom Kippur"],
    10: ["Sukkot"],
    11: ["Marathon"],
    12: ["Hanukkah", "Christmas Tourism"],
  }
  return events[month] || []
}
