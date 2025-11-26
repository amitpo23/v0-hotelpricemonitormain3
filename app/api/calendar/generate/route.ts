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

      // Generate daily prices for next 60 days
      const today = new Date()
      for (let i = 0; i < 60; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split("T")[0]

        // Get day of week and determine demand level
        const dayOfWeek = date.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6

        // Simulate seasonal demand
        const month = date.getMonth()
        const isHighSeason = month >= 5 && month <= 8 // June-August
        const isPeakDay = (isWeekend && isHighSeason) || Math.random() < 0.1

        // Base prices
        const basePrice = hotel.base_price || 150
        const seasonMultiplier = isHighSeason ? 1.3 : 1.0
        const weekendMultiplier = isWeekend ? 1.2 : 1.0
        const peakMultiplier = isPeakDay ? 1.4 : 1.0

        // Our price (current)
        const ourPrice = Math.round(basePrice * seasonMultiplier * weekendMultiplier * (0.9 + Math.random() * 0.2))

        // Competitor prices (simulated)
        const competitorBase = basePrice * seasonMultiplier * weekendMultiplier * peakMultiplier
        const minCompetitor = Math.round(competitorBase * (0.85 + Math.random() * 0.1))
        const maxCompetitor = Math.round(competitorBase * (1.1 + Math.random() * 0.15))
        const avgCompetitor = Math.round((minCompetitor + maxCompetitor) / 2)

        // Calculate recommended price
        let recommendedPrice = ourPrice
        let priceRecommendation = "Price is competitive"
        let autopilotAction = "No action needed"

        if (ourPrice < avgCompetitor * 0.9) {
          // We're too cheap
          recommendedPrice = Math.round(avgCompetitor * 0.95)
          priceRecommendation = `Increase price - you're ${Math.round((1 - ourPrice / avgCompetitor) * 100)}% below market average`
          autopilotAction = `Autopilot would increase to $${recommendedPrice}`
        } else if (ourPrice > avgCompetitor * 1.15) {
          // We're too expensive
          recommendedPrice = Math.round(avgCompetitor * 1.05)
          priceRecommendation = `Decrease price - you're ${Math.round((ourPrice / avgCompetitor - 1) * 100)}% above market average`
          autopilotAction = `Autopilot would decrease to $${recommendedPrice}`
        } else if (isPeakDay && ourPrice < maxCompetitor * 0.95) {
          // Peak day opportunity
          recommendedPrice = Math.round(maxCompetitor * 0.9)
          priceRecommendation = "Peak demand day - opportunity to increase price"
          autopilotAction = `Autopilot would capitalize on demand: $${recommendedPrice}`
        }

        // Demand level
        let demandLevel = "medium"
        if (isPeakDay) demandLevel = "peak"
        else if (isHighSeason && isWeekend) demandLevel = "high"
        else if (!isHighSeason && !isWeekend) demandLevel = "low"

        // Occupancy forecast
        const occupancyForecast = isPeakDay ? 95 : isWeekend ? 80 : isHighSeason ? 70 : 55

        // Upsert daily price
        const { error } = await supabase.from("daily_prices").upsert(
          {
            hotel_id: hotelId,
            date: dateStr,
            our_price: ourPrice,
            recommended_price: recommendedPrice,
            min_competitor_price: minCompetitor,
            max_competitor_price: maxCompetitor,
            avg_competitor_price: avgCompetitor,
            demand_level: demandLevel,
            occupancy_forecast: occupancyForecast,
            price_recommendation: priceRecommendation,
            autopilot_action: autopilotAction,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "hotel_id,date",
          },
        )

        if (!error) {
          results.push({ hotelId, date: dateStr, success: true })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${results.length} daily prices`,
      results,
    })
  } catch (error) {
    console.error("Calendar generation error:", error)
    return NextResponse.json({ error: "Failed to generate calendar" }, { status: 500 })
  }
}
