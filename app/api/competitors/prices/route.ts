import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get("hotelId")
    const date = searchParams.get("date")

    if (!hotelId) {
      return NextResponse.json({ error: "Hotel ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get hotel's configured competitors
    const { data: competitors } = await supabase
      .from("hotel_competitors")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("is_active", true)

    // Get competitor prices for the specific date
    let prices: any[] = []

    if (competitors && competitors.length > 0 && date) {
      const { data: competitorPrices } = await supabase
        .from("competitor_daily_prices")
        .select("*")
        .eq("hotel_id", hotelId)
        .eq("date", date)

      prices = competitorPrices || []
    }

    // If no real competitors, return OTA sources info
    if (!competitors || competitors.length === 0) {
      const otaSources = [
        { name: "Booking.com", description: "Price estimate from Booking.com variance model" },
        { name: "Expedia", description: "Price estimate from Expedia variance model" },
        { name: "Hotels.com", description: "Price estimate from Hotels.com variance model" },
        { name: "Agoda", description: "Price estimate from Agoda variance model" },
        { name: "Trip.com", description: "Price estimate from Trip.com variance model" },
      ]

      return NextResponse.json({
        competitors: [],
        prices: [],
        source: "ota_estimates",
        otaSources,
        message: "No real competitors configured. Using OTA price estimates.",
      })
    }

    return NextResponse.json({
      competitors,
      prices,
      source: "real_competitors",
      message: `Tracking ${competitors.length} competitor hotels`,
    })
  } catch (error) {
    console.error("Error fetching competitor prices:", error)
    return NextResponse.json({ error: "Failed to fetch competitor prices" }, { status: 500 })
  }
}
