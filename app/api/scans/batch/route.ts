import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Simulated scraping sources
const BOOKING_SOURCES = [
  { name: "Booking.com", baseVariation: 0.95 },
  { name: "Expedia", baseVariation: 1.02 },
  { name: "Hotels.com", baseVariation: 0.98 },
  { name: "Agoda", baseVariation: 0.92 },
  { name: "Trip.com", baseVariation: 1.05 },
]

async function executeScanForConfig(supabase: any, config: any, hotelData: any) {
  try {
    console.log(`[v0] Executing scan for hotel: ${hotelData?.name || "unknown"}`)

    if (!hotelData) {
      return { success: false, error: "Hotel data missing" }
    }

    // Calculate date-based demand multiplier
    const checkInDate = new Date(config.check_in_date || new Date())
    const dayOfWeek = checkInDate.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
    const demandMultiplier = isWeekend ? 1.15 : 1.0

    // Seasonal multiplier
    const month = checkInDate.getMonth()
    const seasonalMultiplier = [6, 7, 8, 12].includes(month) ? 1.2 : 1.0

    const basePrice = Number(hotelData.base_price) || 150
    const scrapedPrices = []

    for (const source of BOOKING_SOURCES) {
      const randomVariation = 0.9 + Math.random() * 0.2
      const price = basePrice * source.baseVariation * demandMultiplier * seasonalMultiplier * randomVariation

      scrapedPrices.push({
        source: source.name,
        price: Math.round(price * 100) / 100,
        currency: "USD",
        availability: Math.random() > 0.1,
        room_type: config.room_type || "Standard Room",
      })
    }

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        config_id: config.id || null,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (scanError) {
      console.log(`[v0] Scan record error: ${scanError.message}`)
      return { success: false, error: scanError.message }
    }

    // Save scan results
    const scanResults = scrapedPrices.map((result) => ({
      scan_id: scan.id,
      hotel_id: hotelData.id,
      source: result.source,
      price: result.price,
      currency: result.currency,
      availability: result.availability,
      room_type: result.room_type,
      scraped_at: new Date().toISOString(),
    }))

    const { error: resultsError } = await supabase.from("scan_results").insert(scanResults)

    if (resultsError) {
      console.log(`[v0] Results error: ${resultsError.message}`)
    }

    // Calculate statistics
    const avgPrice = scrapedPrices.reduce((sum, r) => sum + r.price, 0) / scrapedPrices.length
    const minPrice = Math.min(...scrapedPrices.map((r) => r.price))
    const maxPrice = Math.max(...scrapedPrices.map((r) => r.price))

    return {
      success: true,
      scan_id: scan.id,
      results_count: scrapedPrices.length,
      summary: {
        min_price: minPrice,
        max_price: maxPrice,
        avg_price: avgPrice,
      },
    }
  } catch (error: any) {
    console.log(`[v0] Scan execution error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Execute scans for all active configurations
export async function POST() {
  const supabase = await createClient()

  try {
    // Get all active scan configs
    const { data: activeConfigs, error: configError } = await supabase
      .from("scan_configs")
      .select(`*, hotels (*)`)
      .eq("is_active", true)

    console.log(`[v0] Found ${activeConfigs?.length || 0} active configs, error: ${configError?.message || "none"}`)

    if (!activeConfigs || activeConfigs.length === 0) {
      return NextResponse.json({
        message: "No active scan configurations found",
        scans_executed: 0,
      })
    }

    const results = []

    for (const config of activeConfigs) {
      const result = await executeScanForConfig(supabase, config, config.hotels)
      results.push({
        config_id: config.id,
        hotel_name: config.hotels?.name,
        ...result,
      })
    }

    return NextResponse.json({
      message: `Batch scan completed`,
      scans_executed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    })
  } catch (error: any) {
    console.error("[v0] Batch scan error:", error)
    return NextResponse.json(
      {
        error: "Failed to execute batch scan",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
