import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get("hotelId")
    const days = Number.parseInt(searchParams.get("days") || "30")

    if (!hotelId) {
      return NextResponse.json({ error: "Hotel ID required" }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split("T")[0]

    // Get price history
    const { data: priceHistory } = await supabase
      .from("competitor_price_history")
      .select("*")
      .eq("hotel_id", hotelId)
      .gte("recorded_at", startDate.toISOString())
      .order("recorded_at", { ascending: true })

    // Get competitor daily prices
    const { data: competitorPrices } = await supabase
      .from("competitor_daily_prices")
      .select("*, hotel_competitors(competitor_hotel_name, display_color)")
      .eq("hotel_id", hotelId)
      .gte("date", startDateStr)
      .order("date", { ascending: true })

    // Get bookings
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("hotel_id", hotelId)
      .gte("created_at", startDate.toISOString())

    // Calculate trends
    const priceChanges =
      priceHistory?.reduce(
        (acc, h) => {
          const key = h.competitor_id
          if (!acc[key]) {
            acc[key] = { increases: 0, decreases: 0, totalChange: 0 }
          }
          if (h.price_change > 0) acc[key].increases++
          else if (h.price_change < 0) acc[key].decreases++
          acc[key].totalChange += h.price_change || 0
          return acc
        },
        {} as Record<string, { increases: number; decreases: number; totalChange: number }>,
      ) || {}

    // Calculate daily averages by source
    const dailyAverages: Record<string, { booking: number; expedia: number; date: string }> = {}
    competitorPrices?.forEach((p) => {
      if (!dailyAverages[p.date]) {
        dailyAverages[p.date] = { booking: 0, expedia: 0, date: p.date }
      }
      if (p.source === "Booking.com") {
        dailyAverages[p.date].booking = (dailyAverages[p.date].booking + p.price) / 2 || p.price
      } else if (p.source === "Expedia") {
        dailyAverages[p.date].expedia = (dailyAverages[p.date].expedia + p.price) / 2 || p.price
      }
    })

    // Booking velocity
    const bookingsByDay: Record<string, number> = {}
    bookings?.forEach((b) => {
      const day = new Date(b.created_at).toISOString().split("T")[0]
      bookingsByDay[day] = (bookingsByDay[day] || 0) + 1
    })

    const avgBookingsPerDay =
      Object.values(bookingsByDay).length > 0
        ? Object.values(bookingsByDay).reduce((a, b) => a + b, 0) / Object.keys(bookingsByDay).length
        : 0

    // Market position
    const allPrices = competitorPrices?.map((p) => p.price) || []
    const avgMarketPrice = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0

    return NextResponse.json({
      success: true,
      trends: {
        priceChanges,
        dailyAverages: Object.values(dailyAverages).sort((a, b) => a.date.localeCompare(b.date)),
        bookingVelocity: {
          avgPerDay: Math.round(avgBookingsPerDay * 10) / 10,
          total: bookings?.length || 0,
          byDay: bookingsByDay,
        },
        marketPosition: {
          avgMarketPrice: Math.round(avgMarketPrice),
          totalCompetitorDataPoints: competitorPrices?.length || 0,
          priceHistoryEvents: priceHistory?.length || 0,
        },
      },
      period: {
        start: startDateStr,
        end: new Date().toISOString().split("T")[0],
        days,
      },
    })
  } catch (error) {
    console.error("Trends error:", error)
    return NextResponse.json({ error: "Failed to calculate trends" }, { status: 500 })
  }
}
