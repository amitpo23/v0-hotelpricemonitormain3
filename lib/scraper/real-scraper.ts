import { scrapeBookingPrice } from "./booking-scraper"

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

  console.log(`[v0] [RealScraper] ========================================`)
  console.log(`[v0] [RealScraper] Scraping: ${competitor.competitor_hotel_name}`)
  console.log(`[v0] [RealScraper] City: ${city}`)
  console.log(`[v0] [RealScraper] Date: ${checkIn} to ${checkOut}`)

  try {
    console.log(`[v0] [RealScraper] Searching Booking.com by hotel name`)
    const bookingResult = await scrapeBookingPrice(competitor.competitor_hotel_name, city, checkIn, checkOut)

    if (bookingResult) {
      result.bookingPrice = bookingResult.price
      result.roomType = bookingResult.roomType
      result.bookingSuccess = true
      result.avgPrice = bookingResult.price
      console.log(`[v0] [RealScraper] SUCCESS: ${result.bookingPrice} ${bookingResult.currency}`)
    } else {
      result.errorMessage = "Hotel not found or no prices available"
      console.log(`[v0] [RealScraper] FAILED: Hotel not found or no prices`)
    }
  } catch (error) {
    result.errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`[v0] [RealScraper] ERROR:`, error)
  }

  console.log(`[v0] [RealScraper] Final result: ${result.bookingSuccess ? "SUCCESS" : "FAILED"}`)
  return result
}
