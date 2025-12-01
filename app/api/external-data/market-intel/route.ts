import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Aggregated market intelligence from all sources
export async function GET(request: Request) {
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const hotelId = searchParams.get("hotelId")

  // Fetch internal data
  const [{ data: scanResults }, { data: competitors }, { data: bookings }, { data: dailyPrices }] = await Promise.all([
    supabase.from("scan_results").select("*").order("scraped_at", { ascending: false }).limit(500),
    supabase.from("hotel_competitors").select("*, competitor_room_types(*)").eq("is_active", true),
    supabase
      .from("bookings")
      .select("*")
      .eq("status", "confirmed")
      .gte("check_in_date", new Date().toISOString().split("T")[0]),
    supabase.from("daily_prices").select("*").gte("date", new Date().toISOString().split("T")[0]),
  ])

  // Process scan results by date
  const pricesByDate: Record<string, { prices: number[]; sources: string[]; competitors: string[] }> = {}

  scanResults?.forEach((scan: any) => {
    const checkIn = scan.metadata?.check_in || scan.check_in_date
    if (!checkIn) return

    const dateStr = new Date(checkIn).toISOString().split("T")[0]
    if (!pricesByDate[dateStr]) {
      pricesByDate[dateStr] = { prices: [], sources: [], competitors: [] }
    }

    if (scan.price) {
      pricesByDate[dateStr].prices.push(Number(scan.price))
      if (scan.source && !pricesByDate[dateStr].sources.includes(scan.source)) {
        pricesByDate[dateStr].sources.push(scan.source)
      }
      if (scan.competitor_name && !pricesByDate[dateStr].competitors.includes(scan.competitor_name)) {
        pricesByDate[dateStr].competitors.push(scan.competitor_name)
      }
    }
  })

  // Calculate market statistics
  const marketStats = Object.entries(pricesByDate)
    .map(([date, data]) => {
      const prices = data.prices
      const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
      const min = prices.length > 0 ? Math.min(...prices) : 0
      const max = prices.length > 0 ? Math.max(...prices) : 0

      return {
        date,
        avgPrice: Math.round(avg),
        minPrice: min,
        maxPrice: max,
        priceRange: max - min,
        dataPoints: prices.length,
        sources: data.sources,
        competitors: data.competitors,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  // Booking velocity (how fast bookings are coming in)
  const last7DaysBookings =
    bookings?.filter((b: any) => {
      const createdAt = new Date(b.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return createdAt >= weekAgo
    }).length || 0

  const last30DaysBookings =
    bookings?.filter((b: any) => {
      const createdAt = new Date(b.created_at)
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      return createdAt >= monthAgo
    }).length || 0

  // Competitor analysis
  const competitorAnalysis =
    competitors?.map((comp: any) => {
      const compScans = scanResults?.filter((s: any) => s.competitor_name === comp.competitor_hotel_name) || []

      const prices = compScans.map((s: any) => Number(s.price)).filter((p: number) => p > 0)
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null

      return {
        id: comp.id,
        name: comp.competitor_hotel_name,
        starRating: comp.star_rating,
        avgPrice: avgPrice ? Math.round(avgPrice) : null,
        priceDataPoints: prices.length,
        roomTypes: comp.competitor_room_types?.length || 0,
        lastScanned: compScans[0]?.scraped_at || null,
      }
    }) || []

  // Calculate demand indicators
  const totalFutureBookings = bookings?.length || 0
  const avgLeadTime =
    bookings?.reduce((sum: number, b: any) => {
      const checkIn = new Date(b.check_in_date)
      const created = new Date(b.created_at)
      return sum + (checkIn.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    }, 0) / Math.max(totalFutureBookings, 1)

  return NextResponse.json({
    success: true,
    marketStats,
    bookingVelocity: {
      last7Days: last7DaysBookings,
      last30Days: last30DaysBookings,
      avgPerDay7: (last7DaysBookings / 7).toFixed(1),
      avgPerDay30: (last30DaysBookings / 30).toFixed(1),
      trend: last7DaysBookings / 7 > last30DaysBookings / 30 ? "increasing" : "stable",
    },
    competitorAnalysis,
    demandIndicators: {
      totalFutureBookings,
      avgLeadTimeDays: Math.round(avgLeadTime),
      dataQuality: {
        scanResults: scanResults?.length || 0,
        competitors: competitors?.length || 0,
        datesWithData: Object.keys(pricesByDate).length,
      },
    },
    timestamp: new Date().toISOString(),
  })
}
