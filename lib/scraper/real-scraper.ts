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

  // Try to scrape Booking.com
  try {
    if (competitor.booking_url) {
      console.log(`[v0] Scraping Booking.com URL: ${competitor.booking_url}`)
      const bookingPrices = await scrapeBookingViaHtml(competitor.booking_url, checkIn, checkOut)
      if (bookingPrices.length > 0) {
        result.bookingPrice = bookingPrices[0].price
        result.roomType = bookingPrices[0].roomType
        result.bookingSuccess = true
        console.log(`[v0] SUCCESS: ${competitor.competitor_hotel_name} = ₪${result.bookingPrice} (${result.roomType})`)
      } else {
        result.errorMessage = "No prices found on page"
        console.log(`[v0] NO PRICES FOUND: ${competitor.competitor_hotel_name}`)
      }
    } else {
      console.log(`[v0] Searching Booking.com for: ${competitor.competitor_hotel_name}`)
      const bookingResult = await scrapeBookingPrice(competitor.competitor_hotel_name, city, checkIn, checkOut)
      if (bookingResult) {
        result.bookingPrice = bookingResult.price
        result.roomType = bookingResult.roomType
        result.bookingSuccess = true
        console.log(`[v0] SUCCESS: ${competitor.competitor_hotel_name} = ₪${result.bookingPrice} (${result.roomType})`)
      } else {
        result.errorMessage = "Hotel not found or no prices available"
        console.log(`[v0] FAILED: ${competitor.competitor_hotel_name} - hotel not found`)
      }
    }
  } catch (error) {
    result.errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`[v0] ERROR scraping ${competitor.competitor_hotel_name}:`, error)
  }

  if (result.bookingPrice) {
    result.avgPrice = result.bookingPrice
  }
  // NO FALLBACK TO SIMULATED PRICES

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
    `[v0] Scrape complete for ${competitor.competitor_hotel_name}: ${successCount} success, ${failCount} failed`,
  )
  return results
}
