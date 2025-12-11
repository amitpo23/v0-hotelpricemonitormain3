export interface BookingPriceResult {
  price: number
  originalPrice?: number
  roomType: string
  roomName?: string
  currency: string
  available: boolean
  hasBreakfast: boolean
  breakfastPrice?: number
  discount?: number
  source?: string
  roomsLeft?: number
  mealPlan?: string
  maxOccupancy?: number
  rawData?: any
}

export interface BookingScraperResponse {
  success: boolean
  results: BookingPriceResult[]
  source: string
  error?: string
  method?: string
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
export function extractPricesFromHTML(html: string): number[] {
  const rooms = extractAllRoomsFromHTML(html)
  return rooms.map((r) => r.price)
}

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "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"
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY
const APIFY_API_KEY = process.env.APIFY_API_KEY
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

async function scrapeViaTavily(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult[]> {
  try {
    console.log(`[v0] [Tavily] Starting search for ${hotelName}`)

    const searchQuery = `${hotelName} ${city} booking.com price per night ${checkIn}`

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

    console.log(`[v0] [Tavily] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] [Tavily] Error: ${errorText.slice(0, 200)}`)
      return []
    }

    const data = await response.json()
    console.log(`[v0] [Tavily] Results: ${data.results?.length || 0}`)

    const allRooms: BookingPriceResult[] = []

    if (data.results) {
      for (const result of data.results) {
        // Extract prices from content
        const content = result.raw_content || result.content || ""

        // Look for price patterns in the content
        const pricePatterns = [/₪\s*([\d,]+)/g, /ILS\s*([\d,]+)/g, /(\d{3,4})\s*₪/g, /price[:\s]+₪?\s*([\d,]+)/gi]

        for (const pattern of pricePatterns) {
          let match
          while ((match = pattern.exec(content)) !== null) {
            const price = Number.parseFloat(match[1].replace(/,/g, ""))
            if (price > 100 && price < 10000) {
              allRooms.push({
                price,
                roomType: "Standard Room",
                currency: "ILS",
                available: true,
                hasBreakfast: content.toLowerCase().includes("breakfast"),
                source: "tavily",
              })
            }
          }
        }

        // Also try HTML extraction
        const htmlRooms = extractAllRoomsFromHTML(content)
        htmlRooms.forEach((r) => {
          r.source = "tavily"
        })
        allRooms.push(...htmlRooms)
      }
    }

    // Remove duplicates
    const uniqueRooms = allRooms.filter(
      (room, index, self) => index === self.findIndex((r) => Math.abs(r.price - room.price) < 10),
    )

    if (uniqueRooms.length > 0) {
      console.log(`[v0] [Tavily] Found ${uniqueRooms.length} rooms`)
      return uniqueRooms
    }

    console.log(`[v0] [Tavily] No prices found in results`)
    return []
  } catch (error) {
    console.error(`[v0] [Tavily] Error:`, error)
    return []
  }
}

async function scrapeViaBookingSearchAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult[]> {
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
      return []
    }

    const html = await response.text()
    console.log(`[v0] [BookingScraper] Got HTML: ${html.length} bytes`)

    if (html.includes("captcha") || html.includes("Access Denied") || html.length < 10000) {
      return []
    }

    const rooms = extractAllRoomsFromHTML(html)
    rooms.forEach((r) => {
      r.source = "booking_api"
    })

    if (rooms.length > 0) {
      console.log(`[v0] [BookingScraper] Found ${rooms.length} rooms via Booking API`)
      return rooms
    }

    return []
  } catch (error) {
    console.error("[v0] [BookingScraper] Booking API error:", error)
    return []
  }
}

async function scrapeViaDirectHTML(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult[]> {
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
                  return rooms
                }
              }
            }
            break
          }
        }
      }
    }

    return []
  } catch (error) {
    console.error("[v0] [BookingScraper] Direct HTML error:", error)
    return []
  }
}

async function scrapeViaScraperAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult[]> {
  if (!SCRAPER_API_KEY) {
    console.log(`[v0] [ScraperAPI] No API key configured, skipping`)
    return []
  }

  try {
    console.log(`[v0] [ScraperAPI] Starting scrape for ${hotelName}`)

    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    // ScraperAPI endpoint with render=true for JavaScript rendering
    const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(searchUrl)}&render=true&country_code=il`

    const response = await fetch(scraperUrl, {
      headers: {
        Accept: "text/html",
      },
    })

    console.log(`[v0] [ScraperAPI] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] [ScraperAPI] Error: ${errorText.slice(0, 200)}`)
      return []
    }

    const html = await response.text()
    console.log(`[v0] [ScraperAPI] Got HTML: ${html.length} bytes`)

    if (html.includes("captcha") || html.includes("Access Denied") || html.length < 5000) {
      console.log(`[v0] [ScraperAPI] Got blocked or captcha`)
      return []
    }

    const rooms = extractAllRoomsFromHTML(html)
    rooms.forEach((r) => {
      r.source = "scraper_api"
    })

    if (rooms.length > 0) {
      console.log(`[v0] [ScraperAPI] Found ${rooms.length} rooms`)
      return rooms
    }

    return []
  } catch (error) {
    console.error(`[v0] [ScraperAPI] Error:`, error)
    return []
  }
}

async function scrapeViaApify(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult[]> {
  console.log(`[v0] [Apify] Starting search for "${hotelName}" in ${city}`)

  if (!APIFY_API_KEY) {
    console.log(`[v0] [Apify] No API key configured`)
    return []
  }

  try {
    const { ApifyClient } = await import("apify-client")
    const client = new ApifyClient({ token: APIFY_API_KEY })

    const ACTOR_ID = "oeiQgfg5fsmIJB7Cn"

    // More specific search query
    const input = {
      search: `"${hotelName}" ${city}`,
      maxItems: 3, // Reduced from 5 to speed up
      sortBy: "distance_from_search",
      currency: "ILS",
      language: "en-gb",
      checkIn: checkIn,
      checkOut: checkOut,
      adults: 2,
      rooms: 1,
      includeReviews: false,
      proxyConfiguration: { useApifyProxy: true },
    }

    console.log(`[v0] [Apify] Running actor with search: "${input.search}"`)

    // Shorter timeout - 35 seconds
    const run = await client.actor(ACTOR_ID).call(input, {
      waitSecs: 35,
      memory: 2048,
    })

    console.log(`[v0] [Apify] Run status: ${run.status}`)

    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    console.log(`[v0] [Apify] Got ${items.length} items`)

    const results: BookingPriceResult[] = []

    for (const item of items) {
      const itemName = (item.name || item.hotelName || "").toLowerCase()
      const searchName = hotelName.toLowerCase()

      // Only use exact or close matches
      if (!itemName.includes(searchName) && !searchName.includes(itemName.split(" ")[0])) {
        console.log(`[v0] [Apify] Skipping non-matching hotel: ${item.name}`)
        continue
      }

      console.log(`[v0] [Apify] Processing matching hotel: ${item.name}`)

      // Extract prices
      const price = item.price || item.pricePerNight || item.cheapestPrice || item.b_raw_price

      if (price && price > 0) {
        results.push({
          price: Number.parseFloat(String(price)),
          roomType: item.roomType || "Standard Room",
          currency: "ILS",
          available: true,
          hasBreakfast: false,
          source: "Booking.com",
        })
      }

      // Check for room array
      const rooms = item.rooms || item.roomOptions || []
      if (Array.isArray(rooms)) {
        for (const room of rooms) {
          const roomPrice = room.price || room.pricePerNight
          if (roomPrice && roomPrice > 0) {
            results.push({
              price: Number.parseFloat(String(roomPrice)),
              roomType: room.name || room.roomName || "Standard Room",
              currency: "ILS",
              available: true,
              hasBreakfast: room.breakfast || false,
              source: "Booking.com",
            })
          }
        }
      }
    }

    console.log(`[v0] [Apify] Final results: ${results.length} rooms`)
    return results
  } catch (error) {
    console.error("[v0] [Apify] Error:", error)
    return []
  }
}

async function scrapeViaRapidAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult[]> {
  if (!RAPIDAPI_KEY) {
    console.log(`[v0] [RapidAPI] No API key configured, skipping`)
    return []
  }

  try {
    console.log(`[v0] [RapidAPI] Starting scrape for ${hotelName}`)

    // Use Booking.com API on RapidAPI
    const searchUrl = `https://booking-com.p.rapidapi.com/v1/hotels/search?checkin_date=${checkIn}&checkout_date=${checkOut}&dest_type=city&units=metric&order_by=popularity&adults_number=2&room_number=1&dest_id=-781545&filter_by_currency=ILS&locale=en-gb&page_number=0&include_adjacency=true`

    const response = await fetch(searchUrl, {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "booking-com.p.rapidapi.com",
      },
    })

    if (!response.ok) {
      console.log(`[v0] [RapidAPI] Request failed: ${response.status}`)
      return []
    }

    const data = await response.json()
    const results = data.result || []
    const rooms: BookingPriceResult[] = []

    for (const hotel of results) {
      const hotelNameLower = (hotel.hotel_name || "").toLowerCase()
      const searchNameLower = hotelName.toLowerCase()

      if (!hotelNameLower.includes(searchNameLower.split(" ")[0])) {
        continue
      }

      const price = hotel.min_total_price || hotel.price_breakdown?.gross_price

      if (price && price > 50 && price < 50000) {
        rooms.push({
          price: Math.round(price),
          roomType: hotel.unit_configuration_label || "Standard Room",
          currency: hotel.currency_code || "ILS",
          available: true,
          hasBreakfast: hotel.hotel_include_breakfast || false,
          source: "rapidapi",
        })
      }
    }

    if (rooms.length > 0) {
      console.log(`[v0] [RapidAPI] Found ${rooms.length} rooms`)
      return rooms
    }

    return []
  } catch (error) {
    console.error(`[v0] [RapidAPI] Error:`, error)
    return []
  }
}

async function scrapeViaDirectUrl(
  bookingUrl: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult[]> {
  console.log(`[v0] [DirectURL] Starting with URL: ${bookingUrl}`)

  if (!APIFY_API_KEY) {
    console.log("[v0] [DirectURL] No API key")
    return []
  }

  try {
    const { ApifyClient } = await import("apify-client")
    const client = new ApifyClient({ token: APIFY_API_KEY })

    // Build full URL with dates
    const urlWithDates = new URL(bookingUrl)
    urlWithDates.searchParams.set("checkin", checkIn)
    urlWithDates.searchParams.set("checkout", checkOut)
    urlWithDates.searchParams.set("selected_currency", "ILS")
    urlWithDates.searchParams.set("group_adults", "2")
    urlWithDates.searchParams.set("no_rooms", "1")

    const input = {
      startUrls: [{ url: urlWithDates.toString() }],
      maxRequestsPerStartUrl: 1,
      proxyConfiguration: { useApifyProxy: true },
    }

    console.log("[v0] [DirectURL] Running with URL:", urlWithDates.toString())

    // Use shorter timeout - 30 seconds
    const run = await client.actor("dtrungtin/booking-scraper").call(input, {
      waitSecs: 30,
      memory: 2048,
    })

    console.log("[v0] [DirectURL] Run status:", run.status)

    if (run.status !== "SUCCEEDED") {
      // Try to get partial results
      console.log("[v0] [DirectURL] Run did not succeed, trying to get partial results...")
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    console.log("[v0] [DirectURL] Got", items.length, "items from dataset")

    const results: BookingPriceResult[] = []

    for (const item of items) {
      console.log("[v0] [DirectURL] Processing item:", item.name || item.hotelName || "unknown")

      // Extract room prices from the item
      const rooms = item.rooms || item.roomOptions || []

      if (Array.isArray(rooms) && rooms.length > 0) {
        for (const room of rooms) {
          const price = room.price || room.pricePerNight || room.totalPrice
          if (price && price > 0) {
            results.push({
              price: Number.parseFloat(String(price)),
              originalPrice: room.originalPrice || room.strikethroughPrice || undefined,
              roomType: room.name || room.roomName || room.type || "Standard Room",
              roomName: room.name || room.roomName,
              currency: "ILS",
              available: true,
              hasBreakfast: room.breakfast || room.includesBreakfast || false,
              mealPlan: room.mealPlan || (room.breakfast ? "Breakfast included" : undefined),
              maxOccupancy: room.maxOccupancy || room.persons || undefined,
              source: "Booking.com",
            })
          }
        }
      }

      // Also check for direct price field
      const directPrice = item.price || item.pricePerNight || item.cheapestPrice
      if (directPrice && directPrice > 0 && results.length === 0) {
        results.push({
          price: Number.parseFloat(String(directPrice)),
          roomType: "Standard Room",
          currency: "ILS",
          available: true,
          hasBreakfast: false,
          source: "Booking.com",
        })
      }
    }

    console.log("[v0] [DirectURL] Extracted", results.length, "room prices")
    return results
  } catch (error) {
    console.error("[v0] [DirectURL] Error:", error)
    return []
  }
}

export async function scrapeBookingPrices(
  hotelName: string,
  location: string,
  checkIn: string,
  checkOut: string,
  bookingUrl?: string,
): Promise<BookingScraperResponse> {
  console.log(`[v0] ========================================`)
  console.log(`[v0] [BookingScraper] Starting scrape`)
  console.log(`[v0] Hotel: ${hotelName}`)
  console.log(`[v0] Location: ${location}`)
  console.log(`[v0] Check-in: ${checkIn}`)
  console.log(`[v0] Check-out: ${checkOut}`)
  console.log(`[v0] Booking URL: ${bookingUrl || "not provided"}`)
  console.log(`[v0] ========================================`)

  // Method 0: Direct Booking URL (FASTEST & MOST RELIABLE)
  if (bookingUrl && APIFY_API_KEY) {
    try {
      console.log("[v0] [BookingScraper] Trying Method 0: Direct Booking URL...")
      const directResults = await scrapeViaDirectUrl(bookingUrl, checkIn, checkOut)
      if (directResults.length > 0) {
        console.log("[v0] [BookingScraper] Method 0 SUCCESS! Found", directResults.length, "rooms")
        return {
          success: true,
          results: directResults,
          source: "Booking.com (Direct URL)",
          method: "direct-url",
        }
      }
      console.log("[v0] [BookingScraper] Method 0 returned no results")
    } catch (e) {
      console.log("[v0] [BookingScraper] Method 0 failed:", e)
    }
  }

  // Method 1: Apify Search (fallback - slower)
  if (APIFY_API_KEY) {
    try {
      console.log("[v0] [BookingScraper] Trying Method 1: Apify Search...")
      const apifyResults = await scrapeViaApify(hotelName, location, checkIn, checkOut)
      if (apifyResults.length > 0) {
        console.log("[v0] [BookingScraper] Method 1 SUCCESS! Found", apifyResults.length, "rooms")
        return {
          success: true,
          results: apifyResults,
          source: "Booking.com (Apify)",
          method: "apify",
        }
      }
      console.log("[v0] [BookingScraper] Method 1 returned no results")
    } catch (e) {
      console.log("[v0] [BookingScraper] Method 1 failed:", e)
    }
  }

  // Method 2: Tavily
  if (TAVILY_API_KEY) {
    try {
      console.log("[v0] [BookingScraper] Trying Method 2: Tavily...")
      const tavilyResults = await scrapeViaTavily(hotelName, location, checkIn, checkOut)
      if (tavilyResults.length > 0) {
        console.log("[v0] [BookingScraper] Method 2 SUCCESS!")
        return {
          success: true,
          results: tavilyResults,
          source: "Booking.com (Tavily)",
          method: "tavily",
        }
      }
    } catch (e) {
      console.log("[v0] [BookingScraper] Method 2 failed:", e)
    }
  }

  console.log("[v0] [BookingScraper] All methods failed")
  return {
    success: false,
    results: [],
    error: "All scraping methods failed",
  }
}

export async function scrapeBookingViaHtml(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  const response = await scrapeBookingPrices(hotelName, city, checkIn, checkOut)
  if (response.success && response.results.length > 0) {
    return response.results[0]
  }
  return null
}

export async function scrapeBookingPrice(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
  bookingUrl?: string,
): Promise<BookingScraperResponse> {
  return scrapeBookingPrices(hotelName, city, checkIn, checkOut, bookingUrl)
}
