import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Apify Webhook Handler
 * Receives data from Apify scraping tasks
 */
export async function POST(request: Request) {
  try {
    console.log("[v0] Apify webhook received")

    const body = await request.json()
    const { defaultDatasetId, actorRunId, status } = body

    console.log("[v0] Apify webhook data:", { defaultDatasetId, actorRunId, status })

    // Skip non-successful runs
    if (status && status !== "SUCCEEDED") {
      return NextResponse.json({ message: "Skipping non-successful run", status }, { status: 200 })
    }

    if (!defaultDatasetId) {
      return NextResponse.json({ error: "Missing defaultDatasetId" }, { status: 400 })
    }

    // Get Apify API token from environment
    const apifyToken = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN

    if (!apifyToken) {
      console.error("[v0] Missing APIFY_API_TOKEN environment variable")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Fetch dataset from Apify
    const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${apifyToken}`
    console.log("[v0] Fetching Apify dataset...")

    const datasetResponse = await fetch(datasetUrl)

    if (!datasetResponse.ok) {
      console.error("[v0] Failed to fetch Apify dataset:", datasetResponse.status)
      return NextResponse.json({ error: "Failed to fetch Apify data" }, { status: 500 })
    }

    const scrapedData = await datasetResponse.json()
    console.log("[v0] Apify data received:", scrapedData.length, "items")

    if (!Array.isArray(scrapedData) || scrapedData.length === 0) {
      return NextResponse.json({ message: "No data to process" }, { status: 200 })
    }

    const supabase = await createClient()

    // Process scraped data and save to database
    const competitorPrices: Array<{
      hotel_id: string
      competitor_id: string
      date: string
      price: number
      source: string
      room_type: string
    }> = []

    for (const item of scrapedData) {
      // Adapt this based on your Apify scraper output format
      if (item.price && item.date && item.competitorId && item.hotelId) {
        competitorPrices.push({
          hotel_id: item.hotelId,
          competitor_id: item.competitorId,
          date: item.date,
          price: Number.parseFloat(item.price),
          source: "Apify/Booking.com",
          room_type: item.roomType || "Standard",
        })
      }
    }

    console.log("[v0] Prepared", competitorPrices.length, "competitor prices for database")

    // Save to database in batches
    if (competitorPrices.length > 0) {
      const batchSize = 100
      let savedCount = 0

      for (let i = 0; i < competitorPrices.length; i += batchSize) {
        const batch = competitorPrices.slice(i, i + batchSize)

        const { error } = await supabase.from("competitor_daily_prices").upsert(
          batch.map((r) => ({
            hotel_id: r.hotel_id,
            competitor_id: r.competitor_id,
            date: r.date,
            price: r.price,
            source: r.source,
            room_type: r.room_type,
            scraped_at: new Date().toISOString(),
          })),
          { onConflict: "competitor_id,date,source" },
        )

        if (error) {
          console.error("[v0] Database error:", error)
        } else {
          savedCount += batch.length
        }
      }

      console.log("[v0] Saved", savedCount, "competitor prices to database")
    }

    return NextResponse.json({
      success: true,
      message: "Apify data processed successfully",
      itemsProcessed: scrapedData.length,
      itemsSaved: competitorPrices.length,
    })
  } catch (error) {
    console.error("[v0] Apify webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "/api/webhooks/apify" })
}
