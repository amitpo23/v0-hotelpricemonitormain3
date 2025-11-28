import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SEASONALITY = {
  1: { occupancy: 0.55, multiplier: 0.85 },
  2: { occupancy: 0.6, multiplier: 0.9 },
  3: { occupancy: 0.7, multiplier: 1.05 },
  4: { occupancy: 0.75, multiplier: 1.15 },
  5: { occupancy: 0.72, multiplier: 1.1 },
  6: { occupancy: 0.8, multiplier: 1.25 },
  7: { occupancy: 0.85, multiplier: 1.35 },
  8: { occupancy: 0.88, multiplier: 1.4 },
  9: { occupancy: 0.75, multiplier: 1.15 },
  10: { occupancy: 0.7, multiplier: 1.05 },
  11: { occupancy: 0.6, multiplier: 0.9 },
  12: { occupancy: 0.65, multiplier: 0.95 },
}

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

    // Get competitor prices
    const { data: competitorPrices } = await supabase
      .from("competitor_prices")
      .select("*, competitors(name)")
      .eq("competitors.hotel_id", hotelId)
      .gte("scan_date", `${year}-01-01`)
      .lte("scan_date", `${year}-12-31`)

    const totalRooms = hotel.total_rooms || 50
    const basePrice = hotel.base_price || 150
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    // Generate forecasts for each month
    const forecasts = []
    for (let month = 1; month <= 12; month++) {
      const season = SEASONALITY[month as keyof typeof SEASONALITY]
      const days = daysInMonth[month - 1]

      const budget = budgets?.find((b) => b.month === month)
      const budgetRevenue = budget?.target_revenue || totalRooms * basePrice * days * 0.7

      const predictedOccupancy = season.occupancy * 100
      const predictedADR = basePrice * season.multiplier
      const predictedRoomNights = Math.round(totalRooms * days * season.occupancy)
      const predictedRevenue = predictedRoomNights * predictedADR
      const predictedRevPAR = predictedRevenue / (totalRooms * days)

      const variance = ((predictedRevenue - budgetRevenue) / budgetRevenue) * 100
      const onTrack = predictedRevenue >= budgetRevenue * 0.95

      // Calculate competitor average
      const monthPrices = competitorPrices?.filter((p) => {
        const date = new Date(p.scan_date)
        return date.getMonth() + 1 === month
      })
      const competitorAvg = monthPrices?.length
        ? monthPrices.reduce((sum, p) => sum + p.price, 0) / monthPrices.length
        : basePrice * season.multiplier * 0.95

      forecasts.push({
        hotel_id: hotelId,
        year,
        month,
        predicted_revenue: predictedRevenue,
        predicted_occupancy: predictedOccupancy,
        predicted_adr: predictedADR,
        predicted_revpar: predictedRevPAR,
        predicted_room_nights: predictedRoomNights,
        budget_revenue: budgetRevenue,
        budget_occupancy: budget?.target_occupancy || 70,
        budget_variance_percent: variance,
        on_track_for_budget: onTrack,
        market_avg_occupancy: season.occupancy * 100 - 5 + Math.random() * 10,
        competitor_avg_price: competitorAvg,
        factors: {
          seasonality: season.multiplier > 1 ? "high" : "low",
          market_trend: "stable",
          events: getMonthEvents(month),
        },
        confidence_score: 0.75 + Math.random() * 0.15,
      })
    }

    // Upsert forecasts
    const { error } = await supabase.from("monthly_forecasts").upsert(forecasts, {
      onConflict: "hotel_id,year,month,room_type_id",
      ignoreDuplicates: false,
    })

    if (error) {
      console.error("Error saving forecasts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log the update
    await supabase.from("forecast_updates").insert({
      hotel_id: hotelId,
      forecast_date: new Date().toISOString().split("T")[0],
      update_type: "manual",
      new_prediction: { year, months: 12 },
      change_reason: "Manual forecast generation",
    })

    return NextResponse.json({ success: true, forecasts: forecasts.length })
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
