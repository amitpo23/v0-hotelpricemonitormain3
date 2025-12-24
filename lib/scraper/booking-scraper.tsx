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
    bookingUrl?: string,
): Promise<BookingPriceResult[]> {
  if (!APIFY_API_KEY) {
    console.log(`[v0] [Apify] No API key configured`)
    throw new Error("Apify API key not configured")
  }

  const keyPreview =
    APIFY_API_KEY.length > 8
      ? `${APIFY_API_KEY.substring(0, 4)}...${APIFY_API_KEY.substring(APIFY_API_KEY.length - 4)}`
      : `${APIFY_API_KEY.substring(0, 2)}...`
  console.log(`[v0] [Apify] Using API key: ${keyPreview} (length: ${APIFY_API_KEY.length})`)

  try {
    const { ApifyClient } = await import("apify-client")
    const client = new ApifyClient({ token: APIFY_API_KEY })

    const ACTOR_ID = "oeiQgfg5fsmIJB7Cn"

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      const formatted = date.toISOString().split("T")[0]
      console.log(`[v0] [Apify]   formatDate: "${dateStr}" -> "${formatted}"`)
      return formatted
    }

    const formattedCheckIn = formatDate(checkIn)
    const formattedCheckOut = formatDate(checkOut)

    console.log(`[v0] [Apify] Final formatted dates:`)
    console.log(`[v0] [Apify]   checkin: "${formattedCheckIn}"`)
    console.log(`[v0] [Apify]   checkout: "${formattedCheckOut}"`)

    const input = {
    search: bookingUrl || `${hotelName} ${city}`,      maxItems: 5,
      sortBy: "distance_from_search",
      currency: "ILS",
      language: "en-gb",
      checkin: formattedCheckIn, // lowercase!
      checkout: formattedCheckOut, // lowercase!
      adults: 2,
      rooms: 1,
      includeReviews: false,
      proxyConfiguration: { useApifyProxy: true },
    }

    console.log(`[v0] [Apify] Final Apify input object:`)
    console.log(JSON.stringify(input, null, 2))

    console.log(`[v0] [Apify] Calling actor ${ACTOR_ID}...`)
    const run = await client.actor(ACTOR_ID).call(input, {
      waitSecs: 300, // Wait up to 5 minutes
      memory: 2048,
    })

    console.log(`[v0] [Apify] Run completed with status: ${run.status}`)
    console.log(`[v0] [Apify] Run ID: ${run.id}`)
    console.log(`[v0] [Apify] Dataset ID: ${run.defaultDatasetId}`)

    console.log(`[v0] [Apify] Fetching results from dataset...`)
    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    console.log(`[v0] [Apify] Got ${items.length} items from dataset`)

    if (items.length === 0) {
      console.warn(`[v0] [Apify] No items returned from actor!`)
      if (run.status !== 'SUCCEEDED') {
        console.error(`[v0] [Apify] Actor failed with status: ${run.status}`)
        throw new Error(`Apify actor failed with status: ${run.status}`)
      }
    }

    if (items.length > 0) {
      console.log(`[v0] [Apify] First item structure:`, JSON.stringify(items[0], null, 2))
    }

    const results: BookingPriceResult[] = []

    for (const item of items) {
      console.log(`[v0] [Apify] Processing hotel: ${item.name || "Unknown"}`)
      console.log(`[v0] [Apify] Item keys:`, Object.keys(item))
      console.log(`[v0] [Apify] Price field:`, item.price)
      console.log(`[v0] [Apify] Currency field:`, item.currency)

      const price =
        item.price || item.pricePerNight || item.cheapestPrice || item.minPrice || item.totalPrice || item.b_raw_price

      if (price !== null && price !== undefined && Number(price) > 0) {
        results.push({
          price: Number.parseFloat(String(price)),
          roomType: item.roomType || item.name || "Standard Room",
          currency: item.currency || "ILS",
          available: true,
          hasBreakfast: item.hasBreakfast || false,
          source: "Booking.com",
        })
        console.log(`[v0] [Apify] Added room with price: ${price}`)
      } else {
        console.log(`[v0] [Apify] No valid price found for ${item.name}`)
      }

      const rooms = item.rooms || item.roomOptions || []
      if (Array.isArray(rooms) && rooms.length > 0) {
        console.log(`[v0] [Apify] Found ${rooms.length} rooms in item.rooms`)
        for (const room of rooms) {
          const roomPrice = room.price || room.pricePerNight || room.totalPrice
          if (roomPrice !== null && roomPrice !== undefined && Number(roomPrice) > 0) {
            results.push({
              price: Number.parseFloat(String(roomPrice)),
              roomType: room.name || room.roomName || room.type || "Standard Room",
              currency: room.currency || item.currency || "ILS",
              available: true,
              hasBreakfast: room.breakfast || room.hasBreakfast || false,
              source: "Booking.com",
            })
            console.log(`[v0] [Apify] Added room from rooms array: ${room.name} - ${roomPrice}`)
          }
        }
      }
    }

    console.log(`[v0] [Apify] Final results: ${results.length} rooms found`)

    if (items.length > 0 && results.length === 0) {
      console.warn(`[v0] [Apify] WARNING: Got ${items.length} hotels but extracted 0 prices!`)
      console.warn(`[v0] [Apify] Sample item:`, JSON.stringify(items[0], null, 2))
    }

    return results
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isAuthError =
      errorMessage.includes("401") ||
      errorMessage.includes("authentication") ||
      errorMessage.includes("token") ||
      errorMessage.includes("User was not found")

    if (isAuthError) {
      console.error("[v0] [Apify] Authentication error - skipping to next method")
      throw new Error(`Apify auth error: ${errorMessage}`)
    }

    console.error("[v0] [Apify] Error:", error)
    throw error
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
  console.log(`[v0] [DirectURL] Scraping direct URL: ${bookingUrl}`)

  if (!bookingUrl) {
    throw new Error("No booking URL provided")
  }

  try {
    const url = new URL(bookingUrl)
    url.searchParams.set("checkin", checkIn)
    url.searchParams.set("checkout", checkOut)
    url.searchParams.set("selected_currency", "ILS")
    url.searchParams.set("group_adults", "2")
    url.searchParams.set("no_rooms", "1")

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()

    if (html.includes("captcha") || html.includes("Access Denied") || html.length < 10000) {
      throw new Error("Blocked by Booking.com or invalid response")
    }

    const rooms = extractAllRoomsFromHTML(html)

    if (rooms.length === 0) {
      throw new Error("No rooms found in HTML")
    }

    rooms.forEach((r) => {
      r.source = "booking_direct_url"
    })
    console.log(`[v0] [DirectURL] Success: Found ${rooms.length} rooms`)
    return rooms
  } catch (error) {
    console.error(`[v0] [DirectURL] Error:`, error)
    throw error
  }
}

export async function scrapeBookingPrices(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
  bookingUrl?: string,
): Promise<BookingScraperResponse> {
  console.log(`[v0] ========================================`)
  console.log(`[v0] [BookingScraper] Starting scrape`)
  console.log(`[v0] [BookingScraper] Hotel: ${hotelName}`)
  console.log(`[v0] [BookingScraper] City: ${city}`)
  console.log(`[v0] [BookingScraper] Dates: ${checkIn} to ${checkOut}`)
  console.log(`[v0] [BookingScraper] Booking URL: ${bookingUrl || "Not provided"}`)

  // Method 0: Apify (PRIMARY - most reliable)
  if (APIFY_API_KEY) {
    try {
      console.log(`[v0] [BookingScraper] Method 0: Apify Search (PRIMARY)`)
      const apifyResults = await scrapeViaApify(hotelName, city, checkIn, checkOut, bookingUrl)

      if (apifyResults.length > 0) {
        console.log(`[v0] [BookingScraper] ✅ SUCCESS via Apify: ${apifyResults.length} rooms`)
        return {
          success: true,
          results: apifyResults,
          source: "Booking.com",
          method: "Apify",
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`[v0] [BookingScraper] ❌ Apify failed: ${errorMsg}`)

      if (!errorMsg.includes("401") && !errorMsg.includes("authentication")) {
        // Non-auth error, continue to next method
      }
    }
  } else {
    console.log(`[v0] [BookingScraper] Apify skipped: No API key`)
  }

  // Method 1: Direct URL (if provided)
  if (bookingUrl) {
    try {
      console.log(`[v0] [BookingScraper] Method 1: Direct URL`)
      const directResults = await scrapeViaDirectUrl(bookingUrl, checkIn, checkOut)

      if (directResults.length > 0) {
        console.log(`[v0] [BookingScraper] ✓ ${hotelName}: ${directResults.length} results`)
        return {
          success: true,
          results: directResults,
          source: "Booking.com",
          method: "Direct URL",
        }
      }
    } catch (error) {
      console.log(`[v0] [BookingScraper] ❌ Direct URL failed: ${error instanceof Error ? error.message : error}`)
    }
  }

  // Method 2: Tavily (fallback)
  try {
    console.log(`[v0] [BookingScraper] Method 2: Tavily Search`)
    const tavilyResults = await scrapeViaTavily(hotelName, city, checkIn, checkOut)

    if (tavilyResults.length > 0) {
      console.log(`[v0] [BookingScraper] ✅ SUCCESS via Tavily: ${tavilyResults.length} rooms`)
      return {
        success: true,
        results: tavilyResults,
        source: "Tavily",
        method: "Tavily",
      }
    }
  } catch (error) {
    console.log(`[v0] [BookingScraper] ❌ Tavily failed: ${error instanceof Error ? error.message : error}`)
  }

  // All methods failed
  console.log(`[v0] [BookingScraper] ❌ ALL METHODS FAILED`)
  return {
    success: false,
    results: [],
    source: "none",
    error: "All scraping methods failed",
    method: "none",
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

export async function scrapeMultipleCompetitorsWithRetry(
  competitors: Array<{
    id: string
    name: string
    booking_url: string | null
    location: string
  }>,
  checkIn: string,
  checkOut: string,
  maxRetries = 3,
): Promise<Array<any>> {
  const allResults: Array<any> = []
  const failedCompetitors: Array<{ competitor: any; retries: number; lastError?: string }> = []

  console.log(`[v0] [MultiScraper] Starting scan for ${competitors.length} competitors`)
  console.log(`[v0] [MultiScraper] Date range: ${checkIn} to ${checkOut}`)

  for (const competitor of competitors) {
    console.log(`[v0] [MultiScraper] Competitor: ${competitor.name}, Attempt: 1/${maxRetries}`)

    try {
      const result = await scrapeBookingPrices(
        competitor.name,
        competitor.location,
        checkIn,
        checkOut,
        competitor.booking_url || undefined,
      )

      if (result.success && result.results.length > 0) {
        console.log(`[v0] [MultiScraper] ✓ ${competitor.name}: ${result.results.length} results`)
        allResults.push(...result.results)
      } else {
        console.log(`[v0] [MultiScraper] ✗ ${competitor.name}: No results, adding to retry queue`)
        failedCompetitors.push({ competitor, retries: 1, lastError: result.error })
      }
    } catch (error: any) {
      console.error(`[v0] [MultiScraper] ✗ ${competitor.name}: Exception:`, error.message)
      failedCompetitors.push({ competitor, retries: 1, lastError: error.message })
    }
  }

  let retryRound = 2
  while (failedCompetitors.length > 0 && retryRound <= maxRetries) {
    console.log(`[v0] [MultiScraper] Retry round ${retryRound}/${maxRetries}: ${failedCompetitors.length} competitors`)

    const toRetry = [...failedCompetitors]
    failedCompetitors.length = 0 // Clear array

    for (const failed of toRetry) {
      console.log(`[v0] [MultiScraper] Retry ${failed.competitor.name}, Attempt: ${retryRound}/${maxRetries}`)

      try {
        const result = await scrapeBookingPrices(
          failed.competitor.name,
          failed.competitor.location,
          checkIn,
          checkOut,
          failed.competitor.booking_url || undefined,
        )

        if (result.success && result.results.length > 0) {
          console.log(
            `[v0] [MultiScraper] ✓ ${failed.competitor.name}: ${result.results.length} results (retry success)`,
          )
          allResults.push(...result.results)
        } else {
          console.log(`[v0] [MultiScraper] ✗ ${failed.competitor.name}: Still no results`)
          failedCompetitors.push({ ...failed, retries: retryRound, lastError: result.error })
        }
      } catch (error: any) {
        console.error(`[v0] [MultiScraper] ✗ ${failed.competitor.name}: Exception:`, error.message)
        failedCompetitors.push({ ...failed, retries: retryRound, lastError: error.message })
      }
    }

    retryRound++
  }

  const successCount = competitors.length - failedCompetitors.length
  console.log(`[v0] [MultiScraper] ========== SCAN COMPLETE ==========`)
  console.log(`[v0] [MultiScraper] Total competitors: ${competitors.length}`)
  console.log(`[v0] [MultiScraper] Successful: ${successCount}`)
  console.log(`[v0] [MultiScraper] Failed: ${failedCompetitors.length}`)
  console.log(`[v0] [MultiScraper] Total results: ${allResults.length}`)

  if (failedCompetitors.length > 0) {
    console.log(`[v0] [MultiScraper] Failed competitors after ${maxRetries} attempts:`)
    failedCompetitors.forEach((f) => {
      console.log(`[v0] [MultiScraper]   - ${f.competitor.name}: ${f.lastError || "Unknown error"}`)
    })
  }

  return allResults
}

export { scrapeBookingPrices as scrapeBookingPrice }
