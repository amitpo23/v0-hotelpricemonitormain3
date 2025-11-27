import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .in("hotel_id", hotelIds)
    .gte("check_in_date", today.toISOString().split("T")[0])
    .eq("status", "confirmed")

  const { data: budgets } = await supabase
    .from("revenue_budgets")
    .select("*")
    .in("hotel_id", hotelIds)
    .eq("year", currentYear)
    .eq("month", currentMonth)

  const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0]
  const { data: revenueTracking } = await supabase
    .from("revenue_tracking")
    .select("*")
    .in("hotel_id", hotelIds)
    .gte("date", monthStart)

  // Get recent scan results to inform predictions
  const { data: recentResults } = await supabase
    .from("scan_results")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(100)

  const { data: dailyPrices } = await supabase
    .from("daily_prices")
    .select("*")
    .in("hotel_id", hotelIds)
    .gte("date", today.toISOString().split("T")[0])

  // Calculate market averages
  const marketAvgByHotel: Record<string, number> = {}
  recentResults?.forEach((r: any) => {
    if (!marketAvgByHotel[r.hotel_id]) {
      marketAvgByHotel[r.hotel_id] = Number(r.price)
    } else {
      marketAvgByHotel[r.hotel_id] = (marketAvgByHotel[r.hotel_id] + Number(r.price)) / 2
    }
  })

  const bookingsByHotelDate: Record<string, Record<string, number>> = {}
  const bookingsRevenueByHotel: Record<string, number> = {}

  bookings?.forEach((b: any) => {
    if (!bookingsByHotelDate[b.hotel_id]) {
      bookingsByHotelDate[b.hotel_id] = {}
      bookingsRevenueByHotel[b.hotel_id] = 0
    }

    // Count nights booked
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

  const predictions: any[] = []

  for (const hotel of hotels) {
    const basePrice = hotel.base_price || marketAvgByHotel[hotel.id] || 150
    const totalRooms = hotel.total_rooms || 50

    const budget = budgetByHotel[hotel.id]
    const targetRevenue = budget?.target_revenue || 0
    const actualRevenue = actualRevenueByHotel[hotel.id] || 0
    const bookedRevenue = bookingsRevenueByHotel[hotel.id] || 0
    const totalExpectedRevenue = actualRevenue + bookedRevenue
    const budgetGap = targetRevenue - totalExpectedRevenue
    const daysRemaining = new Date(currentYear, currentMonth, 0).getDate() - today.getDate()
    const dailyRevenueNeeded = daysRemaining > 0 ? budgetGap / daysRemaining : 0

    // Budget pressure factor: if behind budget, recommend higher prices
    const budgetPressure = targetRevenue > 0 ? Math.max(0.9, Math.min(1.2, 1 + (budgetGap / targetRevenue) * 0.3)) : 1.0

    // Generate predictions for the next 30 days
    for (let i = 0; i < 30; i++) {
      const predDate = new Date(today)
      predDate.setDate(predDate.getDate() + i)
      const dateStr = predDate.toISOString().split("T")[0]

      const dayOfWeek = predDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
      const month = predDate.getMonth()

      // Seasonality factor
      const seasonalityFactors: Record<number, number> = {
        0: 0.85,
        1: 0.8,
        2: 0.9,
        3: 1.0,
        4: 1.05,
        5: 1.15,
        6: 1.25,
        7: 1.3,
        8: 1.1,
        9: 0.95,
        10: 0.9,
        11: 1.2,
      }
      const seasonality = seasonalityFactors[month] || 1.0

      // Weekend premium
      const weekendFactor = isWeekend ? 1.15 : 1.0

      const bookedRooms = bookingsByHotelDate[hotel.id]?.[dateStr] || 0
      const occupancyRate = (bookedRooms / totalRooms) * 100

      // High occupancy = raise prices, low occupancy = lower prices
      let occupancyFactor = 1.0
      if (occupancyRate > 80) occupancyFactor = 1.25
      else if (occupancyRate > 60) occupancyFactor = 1.15
      else if (occupancyRate > 40) occupancyFactor = 1.05
      else if (occupancyRate < 20) occupancyFactor = 0.9
      else if (occupancyRate < 10) occupancyFactor = 0.85

      const calendarData = dailyPricesByHotelDate[hotel.id]?.[dateStr]
      const competitorAvg = calendarData?.avg_competitor_price
        ? Number(calendarData.avg_competitor_price)
        : marketAvgByHotel[hotel.id]

      // Competitor alignment factor
      const competitorFactor = competitorAvg ? Math.max(0.85, Math.min(1.15, competitorAvg / basePrice)) : 1.0

      // Random market variation (smaller)
      const variation = 0.98 + Math.random() * 0.04

      const predictedPrice = Math.round(
        basePrice * seasonality * weekendFactor * occupancyFactor * budgetPressure * competitorFactor * variation,
      )

      const demandScore = seasonality * weekendFactor * occupancyFactor
      let demand: string
      if (demandScore > 1.4 || occupancyRate > 70) demand = "very_high"
      else if (demandScore > 1.2 || occupancyRate > 50) demand = "high"
      else if (demandScore > 0.95 || occupancyRate > 30) demand = "medium"
      else demand = "low"

      let confidence = 0.65
      if (recentResults && recentResults.length > 10) confidence += 0.1
      if (calendarData) confidence += 0.1
      if (bookedRooms > 0) confidence += 0.1
      confidence = Math.min(0.95, confidence)

      predictions.push({
        hotel_id: hotel.id,
        prediction_date: dateStr,
        predicted_price: predictedPrice,
        predicted_demand: demand,
        confidence_score: confidence,
        factors: {
          seasonality: month >= 5 && month <= 8 ? "high" : month >= 11 || month <= 1 ? "holiday" : "normal",
          day_of_week: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek],
          competitor_avg: competitorAvg ? Math.round(competitorAvg) : null,
          events: isWeekend ? ["Weekend"] : [],
          occupancy_rate: Math.round(occupancyRate),
          booked_rooms: bookedRooms,
          budget_gap: Math.round(budgetGap),
          budget_pressure: budgetPressure.toFixed(2),
          daily_revenue_needed: Math.round(dailyRevenueNeeded),
        },
      })
    }
  }

  // Delete old predictions for these hotels
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
    summary: hotels.map((h: any) => ({
      hotel_id: h.id,
      name: h.name,
      budget_target: budgetByHotel[h.id]?.target_revenue || 0,
      actual_revenue: actualRevenueByHotel[h.id] || 0,
      booked_revenue: bookingsRevenueByHotel[h.id] || 0,
      total_bookings: bookings?.filter((b: any) => b.hotel_id === h.id).length || 0,
    })),
  })
}
