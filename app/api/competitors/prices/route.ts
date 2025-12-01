import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get("hotelId")
    const date = searchParams.get("date")
    const roomTypeId = searchParams.get("roomTypeId")

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

    let prices: any[] = []

    if (date) {
      // First try to get from scan_results using metadata.check_in
      const { data: scanResults } = await supabase
        .from("scan_results")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("scraped_at", { ascending: false })

      // Filter by date from metadata
      const filteredResults =
        scanResults?.filter((sr) => {
          if (sr.metadata?.check_in === date) return true
          return false
        }) || []

      // If no scan results, try competitor_daily_prices as fallback
      if (filteredResults.length === 0) {
        const competitorIds = competitors.map((c) => c.id)

        let query = supabase
          .from("competitor_daily_prices")
          .select("*")
          .eq("hotel_id", hotelId)
          .eq("date", date)
          .in("competitor_id", competitorIds)

        if (roomTypeId) {
          query = query.eq("room_type_id", roomTypeId)
        }

        const { data: competitorPrices } = await query

        const priceMap = new Map()
        for (const price of competitorPrices || []) {
          const existing = priceMap.get(price.competitor_id)
          if (!existing || new Date(price.scraped_at) > new Date(existing.scraped_at)) {
            priceMap.set(price.competitor_id, price)
          }
        }
        prices = Array.from(priceMap.values())
      } else {
        // Use scan results
        prices = filteredResults.map((sr) => ({
          id: sr.id,
          source: sr.source,
          price: Number.parseFloat(sr.price),
          currency: sr.currency,
          room_type: sr.room_type,
          scraped_at: sr.scraped_at,
          availability: sr.availability,
        }))
      }
    }

    return NextResponse.json({
      competitors,
      prices,
      source: prices.length > 0 ? "scan_results" : "no_data",
      message: `Tracking ${competitors.length} competitor hotels`,
    })
  } catch (error) {
    console.error("Error fetching competitor prices:", error)
    return NextResponse.json({ error: "Failed to fetch competitor prices" }, { status: 500 })
  }
}
