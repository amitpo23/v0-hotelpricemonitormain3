import { scrapeBookingPrice, type BookingPriceResult, type BookingScraperResponse } from "./booking-scraper"

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

export interface CompetitorMultiRoomResult {
  competitorId: string
  competitorName: string
  date: string
  rooms: BookingPriceResult[]
  scrapedAt: string
  success: boolean
  source: string
  errorMessage?: string
}

export async function scrapeCompetitorAllRooms(
  competitor: {
    id: string
    competitor_hotel_name: string
    booking_url?: string | null
    city?: string
  },
  checkIn: string,
  checkOut: string,
): Promise<CompetitorMultiRoomResult> {
  const city = competitor.city || "Tel Aviv"

  console.log(`[v0] [RealScraper] ========================================`)
  console.log(`[v0] [RealScraper] Scraping ALL ROOMS: ${competitor.competitor_hotel_name}`)
  console.log(`[v0] [RealScraper] City: ${city}`)
  console.log(`[v0] [RealScraper] Date: ${checkIn} to ${checkOut}`)

  try {
    const response: BookingScraperResponse = await scrapeBookingPrice(
      competitor.competitor_hotel_name,
      city,
      checkIn,
      checkOut,
      competitor.booking_url || undefined,
    )

    if (response.success && response.results.length > 0) {
      console.log(`[v0] [RealScraper] SUCCESS: Found ${response.results.length} room types`)
      response.results.forEach((r, i) => {
        const priceNum = typeof r.price === "number" ? r.price : (r.price as any)?.price || 0
        console.log(`[v0] [RealScraper]   Room ${i + 1}: ${r.roomType} - ${priceNum} ${r.currency}`)
      })

      const validRooms = response.results
        .map((r) => ({
          ...r,
          price:
            typeof r.price === "number"
              ? r.price
              : typeof (r.price as any)?.price === "number"
                ? (r.price as any).price
                : 0,
        }))
        .filter((r) => r.price > 0 && r.price < 100000)

      if (validRooms.length === 0) {
        console.log(`[v0] [RealScraper] No valid prices found after filtering`)
        return {
          competitorId: competitor.id,
          competitorName: competitor.competitor_hotel_name,
          date: checkIn,
          rooms: [],
          scrapedAt: new Date().toISOString(),
          success: false,
          source: response.source,
          errorMessage: "No valid prices found",
        }
      }

      console.log(`[v0] [RealScraper] Valid rooms after filtering: ${validRooms.length}`)
      return {
        competitorId: competitor.id,
        competitorName: competitor.competitor_hotel_name,
        date: checkIn,
        rooms: validRooms,
        scrapedAt: new Date().toISOString(),
        success: true,
        source: response.source,
      }
    } else {
      console.log(`[v0] [RealScraper] FAILED: ${response.error || "No rooms found"}`)
      return {
        competitorId: competitor.id,
        competitorName: competitor.competitor_hotel_name,
        date: checkIn,
        rooms: [],
        scrapedAt: new Date().toISOString(),
        success: false,
        source: response.source,
        errorMessage: response.error || "No rooms found",
      }
    }
  } catch (error) {
    console.error(`[v0] [RealScraper] ERROR:`, error)
    return {
      competitorId: competitor.id,
      competitorName: competitor.competitor_hotel_name,
      date: checkIn,
      rooms: [],
      scrapedAt: new Date().toISOString(),
      success: false,
      source: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Keep old function for backwards compatibility
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
  const multiResult = await scrapeCompetitorAllRooms(competitor, checkIn, checkOut)

  // Return the first/cheapest room for backwards compatibility
  if (multiResult.success && multiResult.rooms.length > 0) {
    const cheapestRoom = multiResult.rooms.reduce((min, r) => (r.price < min.price ? r : min), multiResult.rooms[0])
    return {
      competitorId: multiResult.competitorId,
      competitorName: multiResult.competitorName,
      date: multiResult.date,
      bookingPrice: cheapestRoom.price,
      avgPrice: cheapestRoom.price,
      roomType: cheapestRoom.roomType,
      scrapedAt: multiResult.scrapedAt,
      bookingSuccess: true,
    }
  }

  return {
    competitorId: multiResult.competitorId,
    competitorName: multiResult.competitorName,
    date: multiResult.date,
    bookingPrice: null,
    avgPrice: null,
    roomType: "",
    scrapedAt: multiResult.scrapedAt,
    bookingSuccess: false,
    errorMessage: multiResult.errorMessage,
  }
}
