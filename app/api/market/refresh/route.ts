import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()

  try {
    // Get all hotels
    const { data: hotels } = await supabase.from("hotels").select("*")

    if (!hotels || hotels.length === 0) {
      return NextResponse.json({ success: true, message: "No hotels to process" })
    }

    const today = new Date().toISOString().split("T")[0]

    // Aggregate REAL competitor data for each hotel
    for (const hotel of hotels) {
      // Get real competitor prices from scraper
      const { data: competitors } = await supabase
        .from("hotel_competitors")
        .select("id, competitor_hotel_name")
        .eq("hotel_id", hotel.id)
        .eq("is_active", true)

      if (!competitors || competitors.length === 0) continue

      const competitorIds = competitors.map((c) => c.id)

      // Get today's scraped prices
      const { data: todayPrices } = await supabase
        .from("competitor_daily_prices")
        .select("competitor_id, price, room_type, source, scraped_at")
        .in("competitor_id", competitorIds)
        .eq("date", today)
        .order("scraped_at", { ascending: false })

      if (!todayPrices || todayPrices.length === 0) continue

      // Update competitor_data with real scraped prices (no mock data)
      for (const competitor of competitors) {
        const competitorPrices = todayPrices.filter((p) => p.competitor_id === competitor.id)
        if (competitorPrices.length === 0) continue

        // Get the most recent price for each room type
        const roomTypePrices = new Map<string, number>()
        for (const price of competitorPrices) {
          const key = price.room_type || "Standard"
          if (!roomTypePrices.has(key)) {
            roomTypePrices.set(key, price.price)
          }
        }

        // Insert real competitor data
        for (const [roomType, price] of roomTypePrices) {
          await supabase.from("competitor_data").upsert(
            {
              hotel_id: hotel.id,
              competitor_name: competitor.competitor_hotel_name,
              price: price,
              room_type: roomType,
              availability: true,
              scraped_at: new Date().toISOString(),
            },
            {
              onConflict: "hotel_id,competitor_name,room_type",
            },
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Market data refreshed from real scraped data",
    })
  } catch (error) {
    console.error("Error refreshing market data:", error)
    return NextResponse.json({ error: "Failed to refresh market data" }, { status: 500 })
  }
}
