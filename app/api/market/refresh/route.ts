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

    // Generate simulated market data for each hotel location
    const locations = [...new Set(hotels.map((h) => h.location).filter(Boolean))]

    for (const location of locations) {
      // Check if we already have data for today
      const { data: existing } = await supabase
        .from("regional_market_data")
        .select("id")
        .eq("city", location)
        .eq("date", today)
        .single()

      if (!existing) {
        // Generate regional market data
        const baseOccupancy = 60 + Math.random() * 30
        const basePrice = 100 + Math.random() * 150
        const demandLevels = ["low", "medium", "high", "peak"]
        const demandLevel = demandLevels[Math.floor(Math.random() * demandLevels.length)]

        await supabase.from("regional_market_data").insert({
          region: "Default Region",
          city: location,
          date: today,
          avg_hotel_price: basePrice,
          avg_occupancy_rate: baseOccupancy,
          total_hotels_tracked: Math.floor(10 + Math.random() * 40),
          demand_level: demandLevel,
          weather_impact: Math.random() > 0.5 ? "Sunny" : "Cloudy",
          events: Math.random() > 0.7 ? [{ name: "Local Conference", date: today, impact: "positive" }] : null,
        })
      }
    }

    // Generate competitor data for each hotel
    for (const hotel of hotels) {
      const competitors = ["Booking.com", "Expedia", "Hotels.com", "Agoda", "Trivago"]

      const basePrice = Number(hotel.base_price) || 150

      for (const competitor of competitors) {
        // Random price variation around hotel's base price
        const variance = (Math.random() - 0.5) * 0.4 // -20% to +20%
        const competitorPrice = basePrice * (1 + variance)

        await supabase.from("competitor_data").insert({
          hotel_id: hotel.id,
          competitor_name: competitor,
          competitor_url: `https://${competitor.toLowerCase().replace(/\./g, "")}.com`,
          price: competitorPrice,
          availability: Math.random() > 0.1,
          rating: 3.5 + Math.random() * 1.5,
          review_count: Math.floor(100 + Math.random() * 900),
          room_type: "Standard Room",
        })
      }
    }

    // Generate demand factors
    const factorTypes = ["event", "holiday", "season", "weather", "economic"]
    const factorNames = [
      "Summer Season Peak",
      "Local Festival",
      "Business Conference",
      "Holiday Weekend",
      "Good Weather Forecast",
    ]

    for (let i = 0; i < 3; i++) {
      const factorType = factorTypes[Math.floor(Math.random() * factorTypes.length)]
      const factorName = factorNames[Math.floor(Math.random() * factorNames.length)]
      const impactScore = (Math.random() - 0.3) * 0.6 // Mostly positive impact

      await supabase.from("demand_factors").insert({
        region: "Default Region",
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        factor_type: factorType,
        factor_name: factorName,
        impact_score: impactScore,
        description: `${factorName} expected to ${impactScore > 0 ? "increase" : "decrease"} demand`,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Market data refreshed successfully",
    })
  } catch (error) {
    console.error("Error refreshing market data:", error)
    return NextResponse.json({ error: "Failed to refresh market data" }, { status: 500 })
  }
}
