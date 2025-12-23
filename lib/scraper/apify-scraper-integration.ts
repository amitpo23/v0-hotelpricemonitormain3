import { ApifyClient } from "apify-client"

export interface Competitor {
  id: string
  competitor_hotel_name: string
  booking_url: string
}

export interface HotelData {
  id: string
  name: string
  booking_url?: string
}

export interface ScrapeResult {
  success: boolean
  scrapedCount: number
  error?: string
}

/**
 * Scrapes hotel and competitor prices using the new Apify Actor
 * Actor ID: 5Y3TFbOR1R7awejDB
 */
export async function scrapeWithNewApifyActor(
  hotelData: HotelData,
  competitors: Competitor[],
  checkIn: string,
  checkOut: string
): Promise<ScrapeResult> {
  try {
    const apiKey = process.env.APIFY_API_KEY

    if (!apiKey) {
      console.error("[ApifyIntegration] Missing APIFY_API_KEY")
      return {
        success: false,
        scrapedCount: 0,
        error: "Missing APIFY_API_KEY environment variable",
      }
    }

    console.log(`[ApifyIntegration] Initializing Apify client`)
    const client = new ApifyClient({ token: apiKey })

    // Prepare competitor URLs
    const competitorUrls = competitors
      .map((c) => c.booking_url)
      .filter((url): url is string => !!url)

    console.log(`[ApifyIntegration] Running actor for ${competitors.length} competitors`)

    // Call the new actor
    const run = await client.actor("5Y3TFbOR1R7awejDB").call(
      {
        hotelId: hotelData.id,
        hotelUrl: hotelData.booking_url || "",
        competitorUrls,
        checkIn,
        checkOut,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.SUPABASE_SERVICE_KEY!,
      },
      {
        waitForFinish: 300, // Wait up to 5 minutes
      }
    )

    console.log(`[ApifyIntegration] Actor completed with status: ${run.status}`)

    if (run.status === "SUCCEEDED") {
      // Fetch results to get count
      const { items } = await client.dataset(run.defaultDatasetId).listItems()
      console.log(`[ApifyIntegration] Successfully scraped ${items.length} results`)

      return {
        success: true,
        scrapedCount: competitors.length,
      }
    } else {
      return {
        success: false,
        scrapedCount: 0,
        error: `Actor run failed with status: ${run.status}`,
      }
    }
  } catch (error) {
    console.error("[ApifyIntegration] Error:", error)
    return {
      success: false,
      scrapedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
