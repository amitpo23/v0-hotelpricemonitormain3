// Real Booking.com scraper - returns ALL room types
// Based on scraper_findings.md and Puppeteer selectors

import { scrapeWithPuppeteer } from "./puppeteer-scraper"

export interface BookingPriceResult {
  price: number
  originalPrice?: number
  roomType: string
  currency: string
  available: boolean
  hasBreakfast: boolean
  breakfastPrice?: number
  discount?: number
  source?: string
  roomsLeft?: number
}

export interface BookingScraperResponse {
  success: boolean
  results: BookingPriceResult[]
  source: string
  error?: string
}

function extractAllRoomsFromHTML(html: string): BookingPriceResult[] {
  const rooms: BookingPriceResult[] = []
  const seenRooms = new Set<string>()

  // Pattern 1: Property card format (search results)
  const propertyCardPattern = /<div[^>]*data-testid="property-card"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi
  let match

  while ((match = propertyCardPattern.exec(html)) !== null) {
    const cardHtml = match[1]

    // Extract room type
    const roomTypeMatch =
      cardHtml.match(/data-testid="title"[^>]*>([^<]+)</i) ||
      cardHtml.match(/class="[^"]*room[^"]*name[^"]*"[^>]*>([^<]+)</i) ||
      cardHtml.match(/<span[^>]*>([^<]*(?:Room|Suite|Studio|Apartment)[^<]*)</i)

    // Extract price
    const priceMatch =
      cardHtml.match(/data-testid="price-and-discounted-price"[^>]*>[^₪$]*[₪$]\s*([\d,]+)/i) ||
      cardHtml.match(/₪\s*([\d,]+)/i) ||
      cardHtml.match(/\$\s*([\d,]+)/i) ||
      cardHtml.match(/ILS\s*([\d,]+)/i)

    if (priceMatch) {
      const price = Number.parseFloat(priceMatch[1].replace(/,/g, ""))
      const roomType = roomTypeMatch ? roomTypeMatch[1].trim() : "Standard Room"
      const key = `${roomType}-${price}`

      if (price > 50 && price < 50000 && !seenRooms.has(key)) {
        seenRooms.add(key)
        rooms.push({
          price,
          roomType,
          currency: "ILS",
          available: true,
          hasBreakfast: cardHtml.toLowerCase().includes("breakfast"),
          source: "booking_html",
        })
      }
    }
  }

  // Pattern 2: Room table format (hotel page)
  const roomTablePattern = /<tr[^>]*data-block-id[^>]*>([\s\S]*?)<\/tr>/gi

  while ((match = roomTablePattern.exec(html)) !== null) {
    const rowHtml = match[1]

    const roomTypeMatch =
      rowHtml.match(/class="[^"]*room[^"]*"[^>]*>([^<]+)</i) ||
      rowHtml.match(/<span[^>]*class="[^"]*hprt-roomtype[^"]*"[^>]*>([^<]+)</i) ||
      rowHtml.match(/<a[^>]*class="[^"]*room_link[^"]*"[^>]*>([^<]+)</i)

    const priceMatch =
      rowHtml.match(/data-price="(\d+)"/i) || rowHtml.match(/₪\s*([\d,]+)/i) || rowHtml.match(/\$\s*([\d,]+)/i)

    if (priceMatch) {
      const price = Number.parseFloat(priceMatch[1].replace(/,/g, ""))
      const roomType = roomTypeMatch ? roomTypeMatch[1].trim() : "Room"
      const key = `${roomType}-${price}`

      if (price > 50 && price < 50000 && !seenRooms.has(key)) {
        seenRooms.add(key)
        rooms.push({
          price,
          roomType,
          currency: "ILS",
          available: true,
          hasBreakfast: rowHtml.toLowerCase().includes("breakfast"),
          source: "booking_table",
        })
      }
    }
  }

  // Pattern 3: JSON data in page
  const jsonPatterns = [/"rooms":\s*\[([\s\S]*?)\]/g, /"b_blocks":\s*\[([\s\S]*?)\]/g]

  for (const pattern of jsonPatterns) {
    const jsonMatch = pattern.exec(html)
    if (jsonMatch) {
      try {
        // Try to parse room data from JSON
        const pricePattern = /"(?:price|min_price|total_price|grossPrice)":\s*{?\s*"?(?:value)?[":]*\s*([\d.]+)/g
        const roomPattern = /"(?:room_name|name|room_type)":\s*"([^"]+)"/g

        let priceM, roomM
        const prices: number[] = []
        const roomNames: string[] = []

        while ((priceM = pricePattern.exec(jsonMatch[1])) !== null) {
          prices.push(Number.parseFloat(priceM[1]))
        }
        while ((roomM = roomPattern.exec(jsonMatch[1])) !== null) {
          roomNames.push(roomM[1])
        }

        for (let i = 0; i < prices.length; i++) {
          const price = prices[i]
          const roomType = roomNames[i] || `Room ${i + 1}`
          const key = `${roomType}-${price}`

          if (price > 50 && price < 50000 && !seenRooms.has(key)) {
            seenRooms.add(key)
            rooms.push({
              price,
              roomType,
              currency: "ILS",
              available: true,
              hasBreakfast: false,
              source: "booking_json",
            })
          }
        }
      } catch (e) {
        // JSON parse failed, continue
      }
    }
  }

  // Pattern 4: Simple price extraction as fallback
  if (rooms.length === 0) {
    const simplePrices: number[] = []
    const pricePatterns = [/₪\s*([\d,]+)/g, /ILS\s*([\d,]+)/g, /data-price="(\d+)"/g, /"price":\s*([\d.]+)/g]

    for (const pattern of pricePatterns) {
      let m
      const regex = new RegExp(pattern.source, pattern.flags)
      while ((m = regex.exec(html)) !== null) {
        const price = Number.parseFloat(m[1].replace(/,/g, ""))
        if (price > 50 && price < 50000 && !simplePrices.includes(price)) {
          simplePrices.push(price)
        }
      }
    }

    // Create rooms from unique prices
    simplePrices
      .sort((a, b) => a - b)
      .slice(0, 10)
      .forEach((price, i) => {
        rooms.push({
          price,
          roomType: i === 0 ? "Economy Room" : i === 1 ? "Standard Room" : `Room Type ${i + 1}`,
          currency: "ILS",
          available: true,
          hasBreakfast: false,
          source: "booking_simple",
        })
      })
  }

  return rooms
}

// Keep old function for backwards compatibility
function extractPricesFromHTML(html: string): number[] {
  const rooms = extractAllRoomsFromHTML(html)
  return rooms.map((r) => r.price)
}

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "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"

async function scrapeViaTavily(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingScraperResponse> {
  try {
    console.log(`[v0] [BookingScraper] Tavily API Key present: ${TAVILY_API_KEY ? "YES" : "NO"}`)
    console.log(`[v0] [BookingScraper] Method: Tavily Search for ${hotelName}`)

    const searchQuery = `${hotelName} ${city} booking.com price ${checkIn} to ${checkOut}`
    console.log(`[v0] [BookingScraper] Tavily query: ${searchQuery}`)

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: searchQuery,
        search_depth: "advanced",
        include_raw_content: true,
        max_results: 5,
        include_domains: ["booking.com"],
      }),
    })

    console.log(`[v0] [BookingScraper] Tavily status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] [BookingScraper] Tavily error response: ${errorText.slice(0, 200)}`)
      return { success: false, results: [], source: "tavily", error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    console.log(`[v0] [BookingScraper] Tavily results count: ${data.results?.length || 0}`)

    const allRooms: BookingPriceResult[] = []

    if (data.results) {
      for (const result of data.results) {
        if (result.raw_content) {
          const rooms = extractAllRoomsFromHTML(result.raw_content)
          rooms.forEach((r) => {
            r.source = "tavily"
          })
          allRooms.push(...rooms)
        }
        if (result.content) {
          const rooms = extractAllRoomsFromHTML(result.content)
          rooms.forEach((r) => {
            r.source = "tavily"
          })
          allRooms.push(...rooms)
        }
      }
    }

    if (allRooms.length > 0) {
      console.log(`[v0] [BookingScraper] Tavily found ${allRooms.length} rooms`)
      return { success: true, results: allRooms, source: "tavily" }
    }

    return { success: false, results: [], source: "tavily", error: "No prices found" }
  } catch (error) {
    console.error("[v0] [BookingScraper] Tavily error:", error)
    return { success: false, results: [], source: "tavily", error: String(error) }
  }
}

async function scrapeViaBookingSearchAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingScraperResponse> {
  try {
    console.log(`[v0] [BookingScraper] Method: Booking.com Search API for ${hotelName}`)

    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!response.ok) {
      return { success: false, results: [], source: "booking_api", error: `HTTP ${response.status}` }
    }

    const html = await response.text()
    console.log(`[v0] [BookingScraper] Got HTML: ${html.length} bytes`)

    if (html.includes("captcha") || html.includes("Access Denied") || html.length < 10000) {
      return { success: false, results: [], source: "booking_api", error: "Blocked or captcha" }
    }

    const rooms = extractAllRoomsFromHTML(html)
    rooms.forEach((r) => {
      r.source = "booking_api"
    })

    if (rooms.length > 0) {
      console.log(`[v0] [BookingScraper] Found ${rooms.length} rooms via Booking API`)
      return { success: true, results: rooms, source: "booking_api" }
    }

    return { success: false, results: [], source: "booking_api", error: "No prices found" }
  } catch (error) {
    console.error("[v0] [BookingScraper] Booking API error:", error)
    return { success: false, results: [], source: "booking_api", error: String(error) }
  }
}

async function scrapeViaDirectHTML(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingScraperResponse> {
  try {
    console.log(`[v0] [BookingScraper] Method: Direct HTML scrape`)

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

              console.log(`[v0] [BookingScraper] Fetching hotel page: ${fullUrl}`)

              const hotelResponse = await fetch(fullUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                  Accept: "text/html",
                },
              })

              if (hotelResponse.ok) {
                const html = await hotelResponse.text()
                const rooms = extractAllRoomsFromHTML(html)
                rooms.forEach((r) => {
                  r.source = "booking_direct"
                })

                if (rooms.length > 0) {
                  console.log(`[v0] [BookingScraper] Found ${rooms.length} rooms via Direct HTML`)
                  return { success: true, results: rooms, source: "booking_direct" }
                }
              }
            }
            break
          }
        }
      }
    }

    return { success: false, results: [], source: "booking_direct", error: "No prices found" }
  } catch (error) {
    console.error("[v0] [BookingScraper] Direct HTML error:", error)
    return { success: false, results: [], source: "booking_direct", error: String(error) }
  }
}

export async function scrapeBookingPrice(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
  bookingUrl?: string,
): Promise<BookingScraperResponse> {
  console.log(`[v0] [BookingScraper] ========================================`)
  console.log(`[v0] [BookingScraper] Scraping: ${hotelName} in ${city}`)
  console.log(`[v0] [BookingScraper] Dates: ${checkIn} to ${checkOut}`)
  console.log(`[v0] [BookingScraper] ========================================`)

  // Method 0: Tavily (most reliable)
  const tavilyResult = await scrapeViaTavily(hotelName, city, checkIn, checkOut)
  if (tavilyResult.success && tavilyResult.results.length > 0) {
    return tavilyResult
  }

  // Method 1: Booking Search API
  const bookingApiResult = await scrapeViaBookingSearchAPI(hotelName, city, checkIn, checkOut)
  if (bookingApiResult.success && bookingApiResult.results.length > 0) {
    return bookingApiResult
  }

  // Method 2: Direct HTML with autocomplete
  const directResult = await scrapeViaDirectHTML(hotelName, city, checkIn, checkOut)
  if (directResult.success && directResult.results.length > 0) {
    return directResult
  }

  // Method 3: Puppeteer with Bright Data
  try {
    console.log(`[v0] [BookingScraper] Method 3: Puppeteer with Bright Data`)
    const puppeteerResult = await scrapeWithPuppeteer(hotelName, city, checkIn, checkOut)
    if (puppeteerResult && puppeteerResult.price && puppeteerResult.price > 0) {
      return {
        success: true,
        results: [
          {
            price: puppeteerResult.price,
            roomType: puppeteerResult.roomType || "Standard Room",
            currency: puppeteerResult.currency || "ILS",
            available: puppeteerResult.available,
            hasBreakfast: false,
            source: "puppeteer",
          },
        ],
        source: "puppeteer",
      }
    }
  } catch (error) {
    console.error("[v0] [BookingScraper] Puppeteer error:", error)
  }

  console.log(`[v0] [BookingScraper] All methods failed for ${hotelName}`)
  return { success: false, results: [], source: "none", error: "All methods failed" }
}

export async function scrapeBookingViaHtml(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  const response = await scrapeBookingPrice(hotelName, city, checkIn, checkOut)
  if (response.success && response.results.length > 0) {
    return response.results[0]
  }
  return null
}
