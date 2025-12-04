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
  fallbackBasePrice = 150,
): Promise<CompetitorPriceResult> {
  const result: CompetitorPriceResult = {
    competitorId: competitor.id,
    competitorName: competitor.competitor_hotel_name,
    date: checkIn,
    bookingPrice: null,
    avgPrice: null,
    roomType: "Standard Room",
    scrapedAt: new Date().toISOString(),
    bookingSuccess: false,
  }

  const city = competitor.city || "Tel Aviv"

  // Try to scrape Booking.com
  try {
    if (competitor.booking_url) {
      console.log(`[Scraper] Scraping Booking.com URL: ${competitor.booking_url}`)
      const bookingPrices = await scrapeBookingViaHtml(competitor.booking_url, checkIn, checkOut)
      if (bookingPrices.length > 0) {
        result.bookingPrice = bookingPrices[0].price
        result.roomType = bookingPrices[0].roomType
        result.bookingSuccess = true
        console.log(`[Scraper] SUCCESS: ${competitor.competitor_hotel_name} = ₪${result.bookingPrice}`)
      }
    } else {
      console.log(`[Scraper] Searching Booking.com for: ${competitor.competitor_hotel_name}`)
      const bookingResult = await scrapeBookingPrice(competitor.competitor_hotel_name, city, checkIn, checkOut)
      if (bookingResult) {
        result.bookingPrice = bookingResult.price
        result.roomType = bookingResult.roomType
        result.bookingSuccess = true
        console.log(`[Scraper] SUCCESS: ${competitor.competitor_hotel_name} = ₪${result.bookingPrice}`)
      }
    }
  } catch (error) {
    console.error(`[Scraper] Booking.com error for ${competitor.competitor_hotel_name}:`, error)
  }

  // Set avgPrice from booking price or fallback
  if (result.bookingPrice) {
    result.avgPrice = result.bookingPrice
  } else {
    // Fallback to simulated price if scraping failed
    console.log(`[Scraper] FALLBACK: ${competitor.competitor_hotel_name} - using simulated price`)
    const dayOfWeek = new Date(checkIn).getDay()
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6
    const multiplier = isWeekend ? 1.15 : 1.0
    const randomFactor = 0.9 + Math.random() * 0.2
    result.bookingPrice = Math.round(fallbackBasePrice * multiplier * randomFactor)
    result.avgPrice = result.bookingPrice
  }

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
  fallbackBasePrice = 150,
  delayMs = 500, // Reduced delay - only one source now
): Promise<CompetitorPriceResult[]> {
  const results: CompetitorPriceResult[] = []

  for (let i = 0; i < days; i++) {
    const checkIn = new Date(startDate)
    checkIn.setDate(checkIn.getDate() + i)
    const checkOut = new Date(checkIn)
    checkOut.setDate(checkOut.getDate() + 1)

    const checkInStr = checkIn.toISOString().split("T")[0]
    const checkOutStr = checkOut.toISOString().split("T")[0]

    const result = await scrapeCompetitorPrices(competitor, checkInStr, checkOutStr, fallbackBasePrice)
    results.push(result)

    // Add delay to avoid rate limiting
    if (i < days - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}
