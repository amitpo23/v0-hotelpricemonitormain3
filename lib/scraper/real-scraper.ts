import { scrapeBookingPrice, scrapeBookingViaHtml } from "./booking-scraper"

export interface CompetitorPriceResult {
  competitorId: string
  competitorName: string
  date: string
  bookingPrice: number | null
  avgPrice: number | null
  roomType: string
  scrapedAt: string
  bookingSuccess: boolean
  errorMessage?: string
}

export async function scrapeCompetitorPrices(
  competitor: {
    id: string
    competitor_hotel_name: string
    booking_url?: string | null
    city?: string
  },
  checkIn: string,
  checkOut: string,
): Promise<CompetitorPriceResult> {
  const result: CompetitorPriceResult = {
    competitorId: competitor.id,
    competitorName: competitor.competitor_hotel_name,
    date: checkIn,
    bookingPrice: null,
    avgPrice: null,
    roomType: "",
    scrapedAt: new Date().toISOString(),
    bookingSuccess: false,
  }

  const city = competitor.city || "Tel Aviv"

  console.log(`[RealScraper] ========================================`)
  console.log(`[RealScraper] Scraping: ${competitor.competitor_hotel_name}`)
  console.log(`[RealScraper] City: ${city}`)
  console.log(`[RealScraper] Date: ${checkIn} to ${checkOut}`)
  console.log(`[RealScraper] Booking URL: ${competitor.booking_url || "none"}`)

  // Try to scrape Booking.com
  try {
    if (competitor.booking_url) {
      console.log(`[RealScraper] Using direct Booking.com URL`)
      const bookingPrices = await scrapeBookingViaHtml(competitor.booking_url, checkIn, checkOut)
      if (bookingPrices.length > 0) {
        result.bookingPrice = bookingPrices[0].price
        result.roomType = bookingPrices[0].roomType
        result.bookingSuccess = true
        console.log(`[RealScraper] SUCCESS via URL: ₪${result.bookingPrice}`)
      } else {
        result.errorMessage = "No prices found on page"
        console.log(`[RealScraper] FAILED: No prices found on page`)
      }
    } else {
      console.log(`[RealScraper] Searching Booking.com by hotel name`)
      const bookingResult = await scrapeBookingPrice(competitor.competitor_hotel_name, city, checkIn, checkOut)
      if (bookingResult) {
        result.bookingPrice = bookingResult.price
        result.roomType = bookingResult.roomType
        result.bookingSuccess = true
        console.log(`[RealScraper] SUCCESS via search: ₪${result.bookingPrice}`)
      } else {
        result.errorMessage = "Hotel not found or no prices available"
        console.log(`[RealScraper] FAILED: Hotel not found or no prices`)
      }
    }
  } catch (error) {
    result.errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`[RealScraper] ERROR:`, error)
  }

  if (result.bookingPrice) {
    result.avgPrice = result.bookingPrice
  }
  // NO FALLBACK TO SIMULATED PRICES

  console.log(`[RealScraper] Final result: ${result.bookingSuccess ? "SUCCESS" : "FAILED"}`)
  console.log(`[RealScraper] ========================================`)

  return result
}

export async function scrapeCompetitorPricesForDateRange(
  competitor: {
    id: string
    competitor_hotel_name: string
    booking_url?: string | null
    city?: string
  },
  startDate: Date,
  days: number,
  delayMs = 500,
): Promise<CompetitorPriceResult[]> {
  const results: CompetitorPriceResult[] = []
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < days; i++) {
    const checkIn = new Date(startDate)
    checkIn.setDate(checkIn.getDate() + i)
    const checkOut = new Date(checkIn)
    checkOut.setDate(checkOut.getDate() + 1)

    const checkInStr = checkIn.toISOString().split("T")[0]
    const checkOutStr = checkOut.toISOString().split("T")[0]

    const result = await scrapeCompetitorPrices(competitor, checkInStr, checkOutStr)

    if (result.bookingSuccess && result.bookingPrice) {
      results.push(result)
      successCount++
    } else {
      failCount++
    }

    // Add delay to avoid rate limiting
    if (i < days - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  console.log(
    `[RealScraper] Scrape complete for ${competitor.competitor_hotel_name}: ${successCount} success, ${failCount} failed`,
  )
  return results
}
