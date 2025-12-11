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
  if (!APIFY_API_KEY) {
    console.log(`[v0] [Apify] No API key configured (APIFY_API_KEY is empty), skipping`)
    return []
  }

  console.log(`[v0] [Apify] API key found: ${APIFY_API_KEY.substring(0, 8)}...`)

  try {
    console.log(`[v0] [Apify] Starting scrape for ${hotelName} in ${city}`)

    // Dynamic import to avoid bundling if not needed
    const { ApifyClient } = await import("apify-client")

    const client = new ApifyClient({
      token: APIFY_API_KEY,
    })

    const searchQuery = `${hotelName} hotel ${city}`

    const ACTOR_ID = "oeiQgfg5fsmIJB7Cn"

    // Prepare Actor input for booking-scraper
    const input = {
      search: searchQuery,
      maxItems: 5,
      sortBy: "distance_from_search",
      currency: "ILS",
      language: "en-gb",
      checkIn: checkIn,
      checkOut: checkOut,
      adults: 2,
      rooms: 1,
      includeReviews: false,
      proxyConfiguration: {
        useApifyProxy: true,
      },
    }

    console.log(`[v0] [Apify] Running actor ${ACTOR_ID} with search: "${searchQuery}", dates: ${checkIn} - ${checkOut}`)

    const run = await client.actor(ACTOR_ID).call(input, {
      waitSecs: 45, // Wait up to 45 seconds for results
      memory: 4096, // Increase memory for faster execution
    })

    console.log(`[v0] [Apify] Actor finished with status: ${run.status}, dataset: ${run.defaultDatasetId}`)

    // Fetch results from the Actor's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems()

    console.log(`[v0] [Apify] Got ${items.length} results from dataset`)

    if (items.length === 0) {
      console.log(`[v0] [Apify] No hotels found for search: "${searchQuery}"`)
      return []
    }

    // Extract prices from all hotels and all rooms
    const results: BookingPriceResult[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i] as any
      console.log(`[v0] [Apify] Processing item ${i + 1}:`, item.name || item.hotel_name || "Unknown")

      // Try multiple fields for price
      const priceFields = [
        item.price,
        item.pricePerNight,
        item.b_price,
        item.b_raw_price,
        item.cheapestPrice,
        item.minPrice,
      ]

      // Try to extract from rooms array
      if (Array.isArray(item.rooms) && item.rooms.length > 0) {
        console.log(`[v0] [Apify]   Found ${item.rooms.length} rooms in item ${i + 1}`)

        for (const room of item.rooms) {
          const roomPrice = room.price || room.pricePerNight || room.totalPrice || room.displayPrice

          if (roomPrice && typeof roomPrice === "number" && roomPrice > 0) {
            results.push({
              price: roomPrice,
              currency: room.currency || item.currency || "ILS",
              roomType: room.name || room.roomType || room.type || "Standard Room",
              available: true,
              source: "Apify",
            })
            console.log(`[v0] [Apify]   ✅ Room: ${room.name || "Unknown"} - ₪${roomPrice}`)
          }
        }
      }

      // If no rooms array, try to get price from item directly
      if (results.length === 0) {
        for (const priceField of priceFields) {
          if (priceField && typeof priceField === "number" && priceField > 0) {
            results.push({
              price: priceField,
              currency: item.currency || "ILS",
              roomType: item.roomType || "Standard Room",
              available: true,
              source: "Apify",
            })
            console.log(`[v0] [Apify]   ✅ Price found: ₪${priceField}`)
            break
          }
        }
      }
    }

    const validResults = results.filter((r) => r.price > 50 && r.price < 50000)
    const uniqueResults = validResults.filter(
      (result, index, self) => index === self.findIndex((r) => Math.abs(r.price - result.price) < 10),
    )

    console.log(
      `[v0] [Apify] Extracted ${results.length} prices, ${validResults.length} valid, ${uniqueResults.length} unique`,
    )

    if (uniqueResults.length === 0) {
      console.log(`[v0] [Apify] ⚠️ No valid prices extracted from ${items.length} items`)
    } else {
      console.log(`[v0] [Apify] ✅ Returning ${uniqueResults.length} room prices`)
      uniqueResults.forEach((r, i) => {
        console.log(`[v0] [Apify]   ${i + 1}. ${r.roomType}: ₪${r.price}`)
      })
    }

    return uniqueResults
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

export async function scrapeBookingPrices(
  hotelName: string,
  location: string,
  checkIn: string,
  checkOut: string,
  bookingUrl?: string,
): Promise<BookingScraperResponse> {
  console.log("[v0] [BookingScraper] Starting scrape for:", hotelName)
  console.log("[v0] [BookingScraper] Dates:", checkIn, "to", checkOut)

  try {
    console.log("[v0] [BookingScraper] Trying Method 0: Apify...")
    const apifyResults = await scrapeViaApify(hotelName, location, checkIn, checkOut)
    if (apifyResults.length > 0) {
      console.log("[v0] [BookingScraper] Method 0 SUCCESS! Found", apifyResults.length, "rooms")
      return {
        success: true,
        results: apifyResults,
        source: "apify",
      }
    }
    console.log("[v0] [BookingScraper] Method 0 returned no results or no API key")
  } catch (error) {
    console.error("[v0] [BookingScraper] Method 0 failed:", error)
  }

  // Method 1: Tavily Search (AI-powered, fastest)
  try {
    console.log("[v0] [BookingScraper] Trying Method 1: Tavily...")
    const tavilyResults = await scrapeViaTavily(hotelName, location, checkIn, checkOut)
    if (tavilyResults.length > 0) {
      console.log("[v0] [BookingScraper] Method 1 SUCCESS! Found", tavilyResults.length, "rooms")
      return {
        success: true,
        results: tavilyResults,
        source: "tavily",
      }
    }
    console.log("[v0] [BookingScraper] Method 1 returned no results")
  } catch (error) {
    console.error("[v0] [BookingScraper] Method 1 failed:", error)
  }

  try {
    console.log("[v0] [BookingScraper] Trying Method 1.5: RapidAPI...")
    const rapidResults = await scrapeViaRapidAPI(hotelName, location, checkIn, checkOut)
    if (rapidResults.length > 0) {
      console.log("[v0] [BookingScraper] Method 1.5 SUCCESS! Found", rapidResults.length, "rooms")
      return {
        success: true,
        results: rapidResults,
        source: "rapidapi",
      }
    }
    console.log("[v0] [BookingScraper] Method 1.5 returned no results or no API key")
  } catch (error) {
    console.error("[v0] [BookingScraper] Method 1.5 failed:", error)
  }

  // Method 2: ScraperAPI (bypasses blocks)
  try {
    console.log("[v0] [BookingScraper] Trying Method 2: ScraperAPI...")
    const scraperResults = await scrapeViaScraperAPI(hotelName, location, checkIn, checkOut)
    if (scraperResults.length > 0) {
      console.log("[v0] [BookingScraper] Method 2 SUCCESS! Found", scraperResults.length, "rooms")
      return {
        success: true,
        results: scraperResults,
        source: "scraper_api",
      }
    }
    console.log("[v0] [BookingScraper] Method 2 returned no results or no API key")
  } catch (error) {
    console.error("[v0] [BookingScraper] Method 2 failed:", error)
  }

  // Method 3: Direct Booking.com Search API
  try {
    console.log("[v0] [BookingScraper] Trying Method 3: Booking Search API...")
    const searchResults = await scrapeViaBookingSearchAPI(hotelName, location, checkIn, checkOut)
    if (searchResults.length > 0) {
      console.log("[v0] [BookingScraper] Method 3 SUCCESS! Found", searchResults.length, "rooms")
      return {
        success: true,
        results: searchResults,
        source: "booking_api",
      }
    }
    console.log("[v0] [BookingScraper] Method 3 returned no results")
  } catch (error) {
    console.error("[v0] [BookingScraper] Method 3 failed:", error)
  }

  // Method 4: Direct HTML fetch (last resort)
  try {
    console.log("[v0] [BookingScraper] Trying Method 4: Direct HTML...")
    const directResults = await scrapeViaDirectHTML(hotelName, location, checkIn, checkOut)
    if (directResults.length > 0) {
      console.log("[v0] [BookingScraper] Method 4 SUCCESS! Found", directResults.length, "rooms")
      return {
        success: true,
        results: directResults,
        source: "direct_html",
      }
    }
    console.log("[v0] [BookingScraper] Method 4 returned no results")
  } catch (error) {
    console.error("[v0] [BookingScraper] Method 4 failed:", error)
  }

  console.log("[v0] [BookingScraper] All methods failed")
  return {
    success: false,
    results: [],
    source: "none",
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
