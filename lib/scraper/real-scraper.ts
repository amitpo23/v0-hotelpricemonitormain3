import {
  scrapeBookingPrices as scrapeBookingPrice,
  type BookingPriceResult,
  type BookingScraperResponse,
} from "./booking-scraper"

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

export async function scrapeCompetitorAllRoomsWithRetry(
  competitor: {
    id: string
    competitor_hotel_name: string
    booking_url?: string | null
    city?: string
  },
  checkIn: string,
  checkOut: string,
  maxRetries = 3,
): Promise<CompetitorMultiRoomResult> {
  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[v0] [RealScraper] Attempt ${attempt}/${maxRetries} for ${competitor.competitor_hotel_name}`)

    const scrapePromise = scrapeCompetitorAllRooms(competitor, checkIn, checkOut)
    const timeoutPromise = new Promise<CompetitorMultiRoomResult>((_, reject) =>
      setTimeout(() => reject(new Error("Scrape timeout")), 180000),
    )

    try {
      const result = await Promise.race([scrapePromise, timeoutPromise])

      if (result.success && result.rooms.length > 0) {
        console.log(`[v0] [RealScraper] SUCCESS on attempt ${attempt}`)
        return result
      }

      lastError = result.errorMessage
    } catch (error) {
      lastError = error instanceof Error ? error.message : "timeout"
      console.log(`[v0] [RealScraper] Attempt ${attempt} failed: ${lastError}`)
    }

    // Don't retry if it's the last attempt
    if (attempt < maxRetries) {
      const delayMs = attempt * 3000 // 3s, 6s between retries
      console.log(`[v0] [RealScraper] Retrying after ${delayMs}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  console.log(`[v0] [RealScraper] All ${maxRetries} attempts failed for ${competitor.competitor_hotel_name}`)
  return {
    competitorId: competitor.id,
    competitorName: competitor.competitor_hotel_name,
    date: checkIn,
    rooms: [],
    scrapedAt: new Date().toISOString(),
    success: false,
    source: "retry_failed",
    errorMessage: `Failed after ${maxRetries} attempts: ${lastError}`,
  }
}

export async function scrapeMultipleCompetitorsWithRetry(
  competitors: Array<{
    id: string
    competitor_hotel_name: string
    booking_url?: string | null
    city?: string
  }>,
  checkIn: string,
  checkOut: string,
  maxRetries = 3,
): Promise<CompetitorMultiRoomResult[]> {
  console.log(`[v0] [RealScraper] ========================================`)
  console.log(`[v0] [RealScraper] Batch scraping ${competitors.length} competitors`)
  console.log(`[v0] [RealScraper] Date: ${checkIn} to ${checkOut}`)
  console.log(`[v0] [RealScraper] Max retries per competitor: ${maxRetries}`)

  const results: CompetitorMultiRoomResult[] = []
  let successCount = 0
  let failCount = 0

  for (const competitor of competitors) {
    const result = await scrapeCompetitorAllRoomsWithRetry(competitor, checkIn, checkOut, maxRetries)

    results.push(result)

    if (result.success) {
      successCount++
    } else {
      failCount++
    }

    // Small delay between competitors to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  console.log(`[v0] [RealScraper] ========================================`)
  console.log(`[v0] [RealScraper] Batch complete: ${successCount} success, ${failCount} failed`)
  console.log(`[v0] [RealScraper] ========================================`)

  return results
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
