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

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({
        competitors: [],
        prices: [],
        source: "no_competitors",
        message: "No competitors configured. Please add competitors first.",
      })
    }

    // Get competitor prices for the specific date - ONE per competitor
    let prices: any[] = []

    if (date) {
      const competitorIds = competitors.map((c) => c.id)

      const { data: competitorPrices } = await supabase
        .from("competitor_daily_prices")
        .select("*")
        .eq("hotel_id", hotelId)
        .eq("date", date)
        .in("competitor_id", competitorIds)

      const priceMap = new Map()
      for (const price of competitorPrices || []) {
        const existing = priceMap.get(price.competitor_id)
        if (!existing || new Date(price.scraped_at) > new Date(existing.scraped_at)) {
          priceMap.set(price.competitor_id, price)
        }
      }
      prices = Array.from(priceMap.values())
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
