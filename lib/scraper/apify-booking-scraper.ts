import { ApifyClient } from "apify-client"

interface ApifyBookingResult {
  name: string
  price?: number
  currency?: string
  url: string
  rating?: number
  reviews?: number
  address?: string
  roomType?: string
  availability?: boolean
}

interface ScrapeOptions {
  search: string
  checkIn: string
  checkOut: string
  adults?: number
  children?: number
  rooms?: number
  maxItems?: number
}

export async function scrapeBookingWithApify(
  options: ScrapeOptions,
): Promise<{ success: boolean; results: ApifyBookingResult[]; error?: string }> {
  try {
    console.log("[v0] Starting Apify scraper with options:", options)

    const apiKey = process.env.APIFY_API_KEY
    if (!apiKey) {
      console.error("[v0] Missing APIFY_API_KEY environment variable")
      return {
        success: false,
        results: [],
        error: "Missing APIFY_API_KEY - please add it to environment variables",
      }
    }

    // Initialize Apify client
    const client = new ApifyClient({
      token: apiKey,
    })

    // Prepare Actor input
    const input = {
      search: options.search,
      checkIn: options.checkIn,
      checkOut: options.checkOut,
      adults: options.adults || 2,
      children: options.children || 0,
      rooms: options.rooms || 1,
      maxItems: options.maxItems || 50,
      currency: "ILS", // Israeli Shekel
      language: "he", // Hebrew
      sortBy: "popularity",
    }

    console.log("[v0] Running Apify actor with input:", input)

    // Run the Booking.com scraper actor
    const run = await client.actor("oeiQgfg5fsmIJB7Cn").call(input, {
      waitForFinish: 120, // Wait up to 2 minutes
    })

    console.log("[v0] Apify run completed:", run.status)

    if (run.status !== "SUCCEEDED") {
      return {
        success: false,
        results: [],
        error: `Apify run failed with status: ${run.status}`,
      }
    }

    // Fetch results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems()

    console.log("[v0] Apify returned", items.length, "hotels")

    // Transform Apify results to our format
    const results: ApifyBookingResult[] = items.map((item: any) => ({
      name: item.name || item.hotel_name || "",
      price: item.price || item.priceNumber || null,
      currency: item.currency || "ILS",
      url: item.url || "",
      rating: item.rating || item.reviews?.rating || null,
      reviews: item.reviews?.count || item.reviewsCount || null,
      address: item.address || "",
      roomType: item.roomType || item.room_type || "Standard",
      availability: item.availability !== false,
    }))

    return {
      success: true,
      results,
    }
  } catch (error: any) {
    console.error("[v0] Apify scraper error:", error)
    return {
      success: false,
      results: [],
      error: error.message || "Unknown Apify error",
    }
  }
}

// Helper function to scrape specific competitor hotel
export async function scrapeCompetitorHotel(
  hotelName: string,
  checkIn: string,
  checkOut: string,
): Promise<{ success: boolean; price?: number; rooms?: any[]; error?: string }> {
  const result = await scrapeBookingWithApify({
    search: hotelName,
    checkIn,
    checkOut,
    maxItems: 5, // Just get top 5 results
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  // Find exact match or closest match
  const hotel = result.results.find((h) => h.name.toLowerCase().includes(hotelName.toLowerCase()) || h.availability)

  if (!hotel) {
    return { success: false, error: "Hotel not found in search results" }
  }

  return {
    success: true,
    price: hotel.price || 0,
    rooms: [
      {
        room_type: hotel.roomType || "Standard",
        price: hotel.price || 0,
        currency: hotel.currency || "ILS",
        availability: hotel.availability,
      },
    ],
  }
}
