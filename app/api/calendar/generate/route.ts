import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { hotelIds } = await request.json()

    const results = []

    for (const hotelId of hotelIds) {
      // Get hotel info
      const { data: hotel } = await supabase.from("hotels").select("*").eq("id", hotelId).single()

      if (!hotel) continue

      // Get room types for this hotel
      const { data: roomTypes } = await supabase
        .from("hotel_room_types")
        .select("*")
        .eq("hotel_id", hotelId)
        .eq("is_active", true)

      // Get competitors for this hotel
      const { data: competitors } = await supabase
        .from("hotel_competitors")
        .select("id")
        .eq("hotel_id", hotelId)
        .eq("is_active", true)

      const competitorIds = competitors?.map((c) => c.id) || []

      // Generate daily prices for next 180 days based on REAL competitor data
      const today = new Date()
      for (let i = 0; i < 180; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split("T")[0]

        // Get REAL competitor prices for this date
        const { data: competitorPrices } = await supabase
          .from("competitor_daily_prices")
          .select("price, room_type, source")
          .in("competitor_id", competitorIds)
          .eq("date", dateStr)

        // Skip if no real competitor data for this date
        if (!competitorPrices || competitorPrices.length === 0) {
          continue
        }

        // Calculate real competitor stats
        const prices = competitorPrices.map((p) => p.price).filter((p) => p > 0)
        if (prices.length === 0) continue

        const minCompetitor = Math.min(...prices)
        const maxCompetitor = Math.max(...prices)
        const avgCompetitor = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)

        // Get day characteristics
        const dayOfWeek = date.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
        const month = date.getMonth()
        const isHighSeason = month >= 5 && month <= 8

        // Determine demand level based on actual competitor prices
        let demandLevel = "medium"
        const basePrice = hotel.base_price || avgCompetitor
        if (avgCompetitor > basePrice * 1.3) demandLevel = "peak"
        else if (avgCompetitor > basePrice * 1.15) demandLevel = "high"
        else if (avgCompetitor < basePrice * 0.85) demandLevel = "low"

        // For each room type, create a daily price entry
        const roomTypesToProcess = roomTypes?.length ? roomTypes : [{ id: null, base_price: hotel.base_price }]

        for (const roomType of roomTypesToProcess) {
          const ourPrice = roomType.base_price || hotel.base_price || avgCompetitor

          // Calculate recommended price based on real competitor data
          let recommendedPrice = ourPrice
          let priceRecommendation = "maintain"
          let autopilotAction = "maintain"

          if (ourPrice < avgCompetitor * 0.9) {
            recommendedPrice = Math.round(avgCompetitor * 0.95)
            priceRecommendation = `Increase - ${Math.round((1 - ourPrice / avgCompetitor) * 100)}% below market`
            autopilotAction = "increase"
          } else if (ourPrice > avgCompetitor * 1.15) {
            recommendedPrice = Math.round(avgCompetitor * 1.05)
            priceRecommendation = `Decrease - ${Math.round((ourPrice / avgCompetitor - 1) * 100)}% above market`
            autopilotAction = "decrease"
          }

          // Upsert daily price with real data
          const { error } = await supabase.from("daily_prices").upsert(
            {
              hotel_id: hotelId,
              room_type_id: roomType.id,
              date: dateStr,
              our_price: ourPrice,
              recommended_price: recommendedPrice,
              min_competitor_price: minCompetitor,
              max_competitor_price: maxCompetitor,
              avg_competitor_price: avgCompetitor,
              demand_level: demandLevel,
              price_recommendation: priceRecommendation,
              autopilot_action: autopilotAction,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "hotel_id,date,room_type_id",
            },
          )

          if (!error) {
            results.push({ hotelId, date: dateStr, roomTypeId: roomType.id, success: true })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${results.length} daily prices from real competitor data`,
      results,
    })
  } catch (error) {
    console.error("Calendar generation error:", error)
    return NextResponse.json({ error: "Failed to generate calendar" }, { status: 500 })
  }
}
