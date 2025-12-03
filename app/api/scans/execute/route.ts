import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Simulated scraping sources - in production, these would be real scrapers
const BOOKING_SOURCES = [
  { name: "Booking.com", baseVariation: 0.95 },
  { name: "Expedia", baseVariation: 1.02 },
  { name: "Hotels.com", baseVariation: 0.98 },
  { name: "Agoda", baseVariation: 0.92 },
  { name: "Trip.com", baseVariation: 1.05 },
  { name: "Direct Website", baseVariation: 1.0 },
]

// Scrape competitor prices from various sources
async function scrapeCompetitorPrices(
  hotelName: string,
  basePrice: number,
  checkIn: string,
  checkOut: string,
  roomType: string,
) {
  const results = []

  // Calculate date-based demand multiplier
  const checkInDate = new Date(checkIn)
  const dayOfWeek = checkInDate.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
  const demandMultiplier = isWeekend ? 1.15 : 1.0

  // Seasonal multiplier
  const month = checkInDate.getMonth()
  const seasonalMultiplier = [6, 7, 8, 12].includes(month) ? 1.2 : 1.0

  for (const source of BOOKING_SOURCES) {
    // Simulate price variation with realistic factors
    const randomVariation = 0.9 + Math.random() * 0.2 // ±10%
    const price = basePrice * source.baseVariation * demandMultiplier * seasonalMultiplier * randomVariation

    results.push({
      source: source.name,
      price: Math.round(price * 100) / 100,
      currency: "USD",
      availability: Math.random() > 0.1, // 90% availability
      room_type: roomType || "Standard Room",
      metadata: {
        check_in: checkIn,
        check_out: checkOut,
        demand_multiplier: demandMultiplier,
        seasonal_multiplier: seasonalMultiplier,
        scraped_url: `https://${source.name.toLowerCase().replace(/[^a-z]/g, "")}.com/hotel/${hotelName.toLowerCase().replace(/\s+/g, "-")}`,
      },
    })
  }

  return results
}

// Fetch external market data (simulated API call)
async function fetchMarketData(city: string, date: string) {
  // In production, this would call real APIs like:
  // - STR (Smith Travel Research)
  // - OTA Insight
  // - RateGain

  const baseOccupancy = 65 + Math.random() * 25 // 65-90%
  const avgPrice = 100 + Math.random() * 150 // $100-$250

  return {
    city,
    date,
    avg_occupancy_rate: Math.round(baseOccupancy * 10) / 10,
    avg_hotel_price: Math.round(avgPrice * 100) / 100,
    demand_level: baseOccupancy > 80 ? "high" : baseOccupancy > 60 ? "medium" : "low",
    total_hotels_tracked: Math.floor(50 + Math.random() * 100),
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { config_id, hotel_id } = body

    // Get scan config details
    let configData: any = null
    let hotelData: any = null

    if (config_id) {
      const { data: config } = await supabase.from("scan_configs").select(`*, hotels (*)`).eq("id", config_id).single()

      configData = config
      hotelData = config?.hotels
    } else if (hotel_id) {
      const { data: hotel } = await supabase.from("hotels").select("*").eq("id", hotel_id).single()

      hotelData = hotel
      // Create default config for manual scan
      configData = {
        check_in_date: new Date().toISOString().split("T")[0],
        check_out_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        room_type: "Standard Room",
        guests: 2,
      }
    }

    if (!hotelData) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        config_id: config_id || null,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (scanError) {
      return NextResponse.json({ error: scanError.message }, { status: 500 })
    }

    console.log(`[v0] Starting scan for hotel: ${hotelData.name}`)

    const { data: competitors } = await supabase
      .from("hotel_competitors")
      .select("id, competitor_hotel_name, display_color")
      .eq("hotel_id", hotelData.id)
      .eq("is_active", true)

    const competitorPrices: any[] = []
    const startDate = new Date()
    const basePrice = Number(hotelData.base_price) || 150

    for (let dayOffset = 0; dayOffset < 180; dayOffset++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + dayOffset)
      const dateStr = date.toISOString().split("T")[0]

      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
      const month = date.getMonth()
      const isSeason = [6, 7, 8, 12].includes(month)

      // Generate prices for each competitor
      if (competitors) {
        for (const competitor of competitors) {
          for (const source of BOOKING_SOURCES) {
            const randomFactor = 0.85 + Math.random() * 0.3
            const weekendFactor = isWeekend ? 1.15 : 1.0
            const seasonFactor = isSeason ? 1.2 : 1.0
            const price = basePrice * randomFactor * weekendFactor * seasonFactor * source.baseVariation

            competitorPrices.push({
              hotel_id: hotelData.id,
              competitor_id: competitor.id,
              date: dateStr,
              price: Math.round(price * 100) / 100,
              source: source.name,
              room_type: "Standard Room",
              availability: Math.random() > 0.1,
              scraped_at: new Date().toISOString(),
            })
          }
        }
      }
    }

    const { data: oldPrices } = await supabase
      .from("competitor_daily_prices")
      .select("competitor_id, date, price")
      .eq("hotel_id", hotelData.id)

    const oldPriceMap = new Map()
    oldPrices?.forEach((p) => {
      oldPriceMap.set(`${p.competitor_id}-${p.date}`, p.price)
    })

    const priceChanges: any[] = []
    for (const cp of competitorPrices) {
      const key = `${cp.competitor_id}-${cp.date}`
      const oldPrice = oldPriceMap.get(key)
      if (oldPrice && oldPrice !== cp.price) {
        priceChanges.push({
          hotel_id: cp.hotel_id,
          competitor_id: cp.competitor_id,
          date: cp.date,
          old_price: oldPrice,
          new_price: cp.price,
          price_change: cp.price - oldPrice,
          change_percent: ((cp.price - oldPrice) / oldPrice) * 100,
          source: cp.source,
          room_type: cp.room_type,
        })
      }
    }

    if (priceChanges.length > 0) {
      await supabase.from("competitor_price_history").insert(priceChanges)
      console.log(`[v0] Saved ${priceChanges.length} price changes to history`)
    }

    if (competitorPrices.length > 0) {
      for (let i = 0; i < competitorPrices.length; i += 500) {
        const batch = competitorPrices.slice(i, i + 500)
        const { error: upsertError } = await supabase.from("competitor_daily_prices").upsert(batch, {
          onConflict: "competitor_id,date,source",
          ignoreDuplicates: false,
        })

        if (upsertError) {
          console.error("[v0] Error upserting competitor prices:", upsertError)
        } else {
          console.log(`[v0] Upserted ${batch.length} competitor prices (batch ${Math.floor(i / 500) + 1})`)
        }
      }
    }

    // Update scan status
    await supabase
      .from("scans")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        results_count: competitorPrices.length,
      })
      .eq("id", scan.id)

    const avgPrice =
      competitorPrices.length > 0
        ? competitorPrices.reduce((sum, r) => sum + r.price, 0) / competitorPrices.length
        : basePrice

    return NextResponse.json({
      success: true,
      scan_id: scan.id,
      results_count: competitorPrices.length,
      price_changes: priceChanges.length,
      summary: {
        min_price: Math.min(...competitorPrices.map((r) => r.price)),
        max_price: Math.max(...competitorPrices.map((r) => r.price)),
        avg_price: avgPrice,
        recommended_price: avgPrice * 0.98,
        your_price: basePrice,
        competitors_scanned: competitors?.length || 0,
        days_scanned: 180,
      },
    })
  } catch (error) {
    console.error("[v0] Scan execution error:", error)
    return NextResponse.json({ error: "Failed to execute scan" }, { status: 500 })
  }
}
