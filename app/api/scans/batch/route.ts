import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { scrapeCompetitorAllRooms } from "@/lib/scraper/real-scraper"

async function executeScanForConfig(supabase: any, config: any, hotelData: any) {
  try {
    console.log(`[Batch] Executing REAL scan for hotel: ${hotelData?.name || "unknown"}`)

    if (!hotelData) {
      return { success: false, error: "Hotel data missing" }
    }

    // Get competitors for this hotel
    const { data: competitors } = await supabase
      .from("hotel_competitors")
      .select("id, competitor_hotel_name, booking_url")
      .eq("hotel_id", hotelData.id)
      .eq("is_active", true)

    if (!competitors || competitors.length === 0) {
      return { success: false, error: "No active competitors" }
    }

    const scrapedPrices: any[] = []
    const dateStr = config.check_in_date || new Date().toISOString().split("T")[0]
    let realScrapeCount = 0

    for (const competitor of competitors) {
      const result = await scrapeCompetitorAllRooms(
        competitor.id,
        competitor.competitor_hotel_name,
        dateStr,
        competitor.booking_url,
      )

      if (result?.success && result.rooms && result.rooms.length > 0) {
        realScrapeCount++
        for (const room of result.rooms) {
          scrapedPrices.push({
            source: result.source || "Booking.com",
            price: room.price,
            currency: "ILS",
            availability: room.available !== false,
            room_type: room.roomType || "Standard Room",
            competitor_id: competitor.id,
          })
        }
      }
    }

    if (scrapedPrices.length === 0) {
      return { success: false, error: "No prices scraped" }
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
      console.log(`[Batch] Scan record error: ${scanError.message}`)
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
      console.log(`[Batch] Results error: ${resultsError.message}`)
    }

    // Calculate statistics
    const avgPrice = scrapedPrices.reduce((sum, r) => sum + r.price, 0) / scrapedPrices.length
    const minPrice = Math.min(...scrapedPrices.map((r) => r.price))
    const maxPrice = Math.max(...scrapedPrices.map((r) => r.price))

    return {
      success: true,
      scan_id: scan.id,
      results_count: scrapedPrices.length,
      real_scrapes: realScrapeCount,
      summary: {
        min_price: minPrice,
        max_price: maxPrice,
        avg_price: avgPrice,
      },
    }
  } catch (error: any) {
    console.log(`[Batch] Scan execution error: ${error.message}`)
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

    console.log(`[Batch] Found ${activeConfigs?.length || 0} active configs, error: ${configError?.message || "none"}`)

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
    console.error("[Batch] Batch scan error:", error)
    return NextResponse.json(
      {
        error: "Failed to execute batch scan",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
