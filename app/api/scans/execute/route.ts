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

    // Execute scraping
    console.log(`[v0] Starting scan for hotel: ${hotelData.name}`)

    const scrapedPrices = await scrapeCompetitorPrices(
      hotelData.name,
      Number(hotelData.base_price) || 150,
      configData.check_in_date,
      configData.check_out_date,
      configData.room_type,
    )

    // Save scan results
    const scanResults = scrapedPrices.map((result) => ({
      scan_id: scan.id,
      hotel_id: hotelData.id,
      source: result.source,
      price: result.price,
      currency: result.currency,
      availability: result.availability,
      room_type: result.room_type,
      metadata: result.metadata,
      scraped_at: new Date().toISOString(),
    }))

    const { error: resultsError } = await supabase.from("scan_results").insert(scanResults)

    if (resultsError) {
      console.error("[v0] Error saving scan results:", resultsError)
    }

    // Save competitor data for tracking
    const competitorData = scrapedPrices.map((result) => ({
      hotel_id: hotelData.id,
      competitor_name: result.source,
      competitor_url: result.metadata.scraped_url,
      price: result.price,
      availability: result.availability,
      room_type: result.room_type,
      scraped_at: new Date().toISOString(),
      metadata: result.metadata,
    }))

    await supabase.from("competitor_data").insert(competitorData)

    // Fetch and save market data
    if (hotelData.location) {
      const marketData = await fetchMarketData(hotelData.location, configData.check_in_date)

      await supabase.from("regional_market_data").upsert(
        {
          region: hotelData.location,
          city: hotelData.location,
          date: configData.check_in_date,
          avg_hotel_price: marketData.avg_hotel_price,
          avg_occupancy_rate: marketData.avg_occupancy_rate,
          total_hotels_tracked: marketData.total_hotels_tracked,
          demand_level: marketData.demand_level,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "region,city,date",
        },
      )
    }

    // Calculate price recommendation
    const avgCompetitorPrice = scrapedPrices.reduce((sum, r) => sum + r.price, 0) / scrapedPrices.length
    const minPrice = Math.min(...scrapedPrices.map((r) => r.price))
    const maxPrice = Math.max(...scrapedPrices.map((r) => r.price))

    // Smart pricing recommendation
    let recommendedPrice = avgCompetitorPrice
    let reasoning = "Based on competitor average"

    if (Number(hotelData.base_price) > avgCompetitorPrice * 1.1) {
      recommendedPrice = avgCompetitorPrice * 1.05
      reasoning = "Competitors are pricing lower - recommend slight reduction to stay competitive"
    } else if (Number(hotelData.base_price) < avgCompetitorPrice * 0.9) {
      recommendedPrice = avgCompetitorPrice * 0.95
      reasoning = "Opportunity to increase price - competitors are charging more"
    }

    // Save price recommendation
    await supabase.from("price_recommendations").insert({
      hotel_id: hotelData.id,
      recommended_price: Math.round(recommendedPrice * 100) / 100,
      confidence_score: 0.85,
      reasoning,
      market_average: Math.round(avgCompetitorPrice * 100) / 100,
      created_at: new Date().toISOString(),
    })

    // Create alert if significant price difference detected
    const priceDiff = ((Number(hotelData.base_price) - avgCompetitorPrice) / avgCompetitorPrice) * 100

    if (Math.abs(priceDiff) > 15) {
      await supabase.from("pricing_alerts").insert({
        hotel_id: hotelData.id,
        alert_type: priceDiff > 0 ? "price_too_high" : "price_too_low",
        message:
          priceDiff > 0
            ? `Your price is ${priceDiff.toFixed(1)}% above market average ($${avgCompetitorPrice.toFixed(2)})`
            : `Your price is ${Math.abs(priceDiff).toFixed(1)}% below market average - opportunity to increase revenue`,
        severity: Math.abs(priceDiff) > 25 ? "high" : "medium",
        is_read: false,
        created_at: new Date().toISOString(),
      })
    }

    // Update scan status
    await supabase
      .from("scans")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", scan.id)

    return NextResponse.json({
      success: true,
      scan_id: scan.id,
      results_count: scrapedPrices.length,
      summary: {
        min_price: minPrice,
        max_price: maxPrice,
        avg_price: avgCompetitorPrice,
        recommended_price: recommendedPrice,
        your_price: hotelData.base_price,
        price_position: priceDiff > 0 ? "above_market" : priceDiff < 0 ? "below_market" : "at_market",
      },
    })
  } catch (error) {
    console.error("[v0] Scan execution error:", error)
    return NextResponse.json({ error: "Failed to execute scan" }, { status: 500 })
  }
}
