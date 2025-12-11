import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { scrapeCompetitorAllRooms } from "@/lib/scraper/real-scraper"

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

    console.log(`[Scan] Starting REAL scan for hotel: ${hotelData.name}`)

    const { data: competitors } = await supabase
      .from("hotel_competitors")
      .select("id, competitor_hotel_name, booking_url, display_color")
      .eq("hotel_id", hotelData.id)
      .eq("is_active", true)

    if (!competitors || competitors.length === 0) {
      console.log("[Scan] No active competitors found")
      await supabase
        .from("scans")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          results_count: 0,
        })
        .eq("id", scan.id)

      return NextResponse.json({
        success: true,
        scan_id: scan.id,
        results_count: 0,
        message: "No active competitors to scan",
      })
    }

    const competitorPrices: any[] = []
    const startDate = new Date()
    let realScrapeCount = 0

    const daysToScan = 7

    for (let dayOffset = 0; dayOffset < daysToScan; dayOffset++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + dayOffset)
      const dateStr = date.toISOString().split("T")[0]

      for (const competitor of competitors) {
        console.log(`[Scan] Scraping ${competitor.competitor_hotel_name} for ${dateStr}`)

        const scrapedResult = await scrapeCompetitorAllRooms(
          competitor.id,
          competitor.competitor_hotel_name,
          dateStr,
          competitor.booking_url,
        )

        if (scrapedResult?.success && scrapedResult.rooms && scrapedResult.rooms.length > 0) {
          realScrapeCount++

          for (const room of scrapedResult.rooms) {
            competitorPrices.push({
              hotel_id: hotelData.id,
              competitor_id: competitor.id,
              date: dateStr,
              price: room.price,
              source: scrapedResult.source || "Booking.com",
              room_type: room.roomType || "Standard Room",
              availability: room.available !== false,
              scraped_at: new Date().toISOString(),
            })
          }
        } else {
          console.log(`[Scan] No results for ${competitor.competitor_hotel_name} on ${dateStr}`)
        }
      }
    }

    console.log(`[Scan] Completed ${realScrapeCount} real scrapes, got ${competitorPrices.length} prices`)

    // Save to database only if we have real data
    if (competitorPrices.length > 0) {
      for (let i = 0; i < competitorPrices.length; i += 100) {
        const batch = competitorPrices.slice(i, i + 100)
        const { error: upsertError } = await supabase.from("competitor_daily_prices").upsert(batch, {
          onConflict: "competitor_id,date,source,room_type",
          ignoreDuplicates: false,
        })

        if (upsertError) {
          console.error("[Scan] Error upserting competitor prices:", upsertError)
        } else {
          console.log(`[Scan] Saved ${batch.length} real prices (batch ${Math.floor(i / 100) + 1})`)
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
      competitorPrices.length > 0 ? competitorPrices.reduce((sum, r) => sum + r.price, 0) / competitorPrices.length : 0

    return NextResponse.json({
      success: true,
      scan_id: scan.id,
      results_count: competitorPrices.length,
      real_scrapes: realScrapeCount,
      summary: {
        min_price: competitorPrices.length > 0 ? Math.min(...competitorPrices.map((r) => r.price)) : 0,
        max_price: competitorPrices.length > 0 ? Math.max(...competitorPrices.map((r) => r.price)) : 0,
        avg_price: avgPrice,
        competitors_scanned: competitors?.length || 0,
        days_scanned: daysToScan,
      },
    })
  } catch (error) {
    console.error("[Scan] Scan execution error:", error)
    return NextResponse.json({ error: "Failed to execute scan" }, { status: 500 })
  }
}
