// ScraperAPI integration - Works on Vercel!
// Unlike Puppeteer, this is a simple HTTP API that works perfectly on serverless

import { type BookingPriceResult, extractAllRoomsFromHTML } from "./booking-scraper"

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || "1e1275322e81f07ca0a13ecb33288c77"

export interface ScraperAPIResult {
  success: boolean
  rooms: BookingPriceResult[]
  source: string
  error?: string
}

/**
 * Scrape Booking.com using ScraperAPI
 * This works on Vercel Serverless Functions because it's just HTTP requests
 */
export async function scrapeWithScraperAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<ScraperAPIResult> {
  console.log(`[v0] [ScraperAPI] Starting scrape for ${hotelName} in ${city}`)
  console.log(`[v0] [ScraperAPI] API Key present: ${SCRAPER_API_KEY ? "YES" : "NO"}`)

  try {
    // Build Booking.com search URL
    const searchParams = new URLSearchParams({
      ss: `${hotelName} ${city}`,
      checkin: checkIn,
      checkout: checkOut,
      group_adults: "2",
      no_rooms: "1",
      selected_currency: "ILS",
    })

    const bookingUrl = `https://www.booking.com/searchresults.html?${searchParams.toString()}`
    console.log(`[v0] [ScraperAPI] Target URL: ${bookingUrl}`)

    // Use ScraperAPI to fetch the page
    const scraperApiUrl = new URL("https://api.scraperapi.com/")
    scraperApiUrl.searchParams.set("api_key", SCRAPER_API_KEY)
    scraperApiUrl.searchParams.set("url", bookingUrl)
    scraperApiUrl.searchParams.set("render", "true") // Enable JavaScript rendering
    scraperApiUrl.searchParams.set("country_code", "il") // Israel proxy

    console.log(`[v0] [ScraperAPI] Fetching via ScraperAPI...`)

    const response = await fetch(scraperApiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "text/html",
      },
    })

    console.log(`[v0] [ScraperAPI] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[v0] [ScraperAPI] Error response: ${errorText.slice(0, 500)}`)
      return {
        success: false,
        rooms: [],
        source: "scraperapi",
        error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      }
    }

    const html = await response.text()
    console.log(`[v0] [ScraperAPI] Received HTML: ${html.length} bytes`)

    // Extract rooms from HTML
    const rooms = extractAllRoomsFromHTML(html)
    rooms.forEach((r) => {
      r.source = "scraperapi"
    })

    console.log(`[v0] [ScraperAPI] Extracted ${rooms.length} rooms`)

    if (rooms.length > 0) {
      rooms.forEach((room, i) => {
        console.log(`[v0] [ScraperAPI]   Room ${i + 1}: ${room.roomType} - ${room.price} ${room.currency}`)
      })

      return {
        success: true,
        rooms,
        source: "scraperapi",
      }
    }

    console.log(`[v0] [ScraperAPI] No rooms found in HTML`)
    return {
      success: false,
      rooms: [],
      source: "scraperapi",
      error: "No prices found in HTML",
    }
  } catch (error) {
    console.error(`[v0] [ScraperAPI] Error:`, error)
    return {
      success: false,
      rooms: [],
      source: "scraperapi",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Try to find the direct hotel page URL using Booking.com autocomplete
 * Then scrape it with ScraperAPI
 */
export async function scrapeHotelPageWithScraperAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<ScraperAPIResult> {
  console.log(`[v0] [ScraperAPI] Trying direct hotel page for ${hotelName}`)

  try {
    // Try autocomplete first to get hotel URL
    const searchUrl = `https://www.booking.com/autocomplete/api/v1/results?query=${encodeURIComponent(
      hotelName + " " + city,
    )}&lang=en-us`

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    })

    if (searchResponse.ok) {
      const searchData = await searchResponse.json()

      if (searchData?.results) {
        for (const result of searchData.results) {
          if (result.dest_type === "hotel" || result.type === "ho") {
            const hotelSlug = result.b_hotel_url || result.url
            if (hotelSlug) {
              const hotelUrl = hotelSlug.startsWith("http") ? hotelSlug : `https://www.booking.com${hotelSlug}`
              const fullUrl = `${hotelUrl}?checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS`

              console.log(`[v0] [ScraperAPI] Found hotel page: ${fullUrl}`)

              // Use ScraperAPI to fetch the hotel page
              const scraperApiUrl = new URL("https://api.scraperapi.com/")
              scraperApiUrl.searchParams.set("api_key", SCRAPER_API_KEY)
              scraperApiUrl.searchParams.set("url", fullUrl)
              scraperApiUrl.searchParams.set("render", "true")
              scraperApiUrl.searchParams.set("country_code", "il")

              const hotelResponse = await fetch(scraperApiUrl.toString())

              if (hotelResponse.ok) {
                const html = await hotelResponse.text()
                console.log(`[v0] [ScraperAPI] Hotel page HTML: ${html.length} bytes`)

                const rooms = extractAllRoomsFromHTML(html)
                rooms.forEach((r) => {
                  r.source = "scraperapi"
                })

                if (rooms.length > 0) {
                  console.log(`[v0] [ScraperAPI] Found ${rooms.length} rooms from hotel page`)
                  return {
                    success: true,
                    rooms,
                    source: "scraperapi",
                  }
                }
              }
            }
            break
          }
        }
      }
    }

    return {
      success: false,
      rooms: [],
      source: "scraperapi",
      error: "Could not find hotel page",
    }
  } catch (error) {
    console.error(`[v0] [ScraperAPI] Hotel page error:`, error)
    return {
      success: false,
      rooms: [],
      source: "scraperapi",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
