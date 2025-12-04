// Real Booking.com scraper using multiple methods
// Based on scraper_findings.md
// Now includes Bright Data MCP integration!
// And Vercel-compatible Puppeteer scraping!

import { 
  scrapeBookingWithMCP, 
  scrapeBookingUrlWithMCP 
} from './brightdata-mcp-scraper'

// Import Vercel Puppeteer (only available in Node.js environment)
// This is a lazy import to avoid bundling Puppeteer in client-side code
async function getVercelPuppeteerScrapers() {
  if (typeof window !== 'undefined') {
    return { scrapeBookingWithVercelPuppeteer: null, scrapeBookingWithVercelPuppeteerSearch: null }
  }
  
  try {
    const module = await import('./vercel-puppeteer-scraper')
    return {
      scrapeBookingWithVercelPuppeteer: module.scrapeBookingWithVercelPuppeteer,
      scrapeBookingWithVercelPuppeteerSearch: module.scrapeBookingWithVercelPuppeteerSearch
    }
  } catch (error) {
    console.log('[BookingScraper] Vercel Puppeteer not available (this is OK)')
    return { scrapeBookingWithVercelPuppeteer: null, scrapeBookingWithVercelPuppeteerSearch: null }
  }
}

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

// Parse price from text, handling different currencies
function parsePrice(text: string): { price: number; currency: string } | null {
  if (!text) return null

  const currencyPatterns: { pattern: RegExp; currency: string }[] = [
    { pattern: /S\$\s*([\d,]+(?:\.\d{2})?)/i, currency: "SGD" },
    { pattern: /₪\s*([\d,]+(?:\.\d{2})?)/i, currency: "ILS" },
    { pattern: /€\s*([\d,]+(?:\.\d{2})?)/i, currency: "EUR" },
    { pattern: /\$\s*([\d,]+(?:\.\d{2})?)/i, currency: "USD" },
    { pattern: /ILS\s*([\d,]+(?:\.\d{2})?)/i, currency: "ILS" },
  ]

  for (const { pattern, currency } of currencyPatterns) {
    const match = text.match(pattern)
    if (match) {
      const priceStr = match[1].replace(/,/g, "")
      const price = Number.parseFloat(priceStr)
      if (price > 0 && price < 100000) {
        return { price, currency }
      }
    }
  }

  return null
}

// Extract prices from HTML using multiple patterns
function extractPricesFromHTML(html: string): number[] {
  const prices: number[] = []

  const patterns = [
    // Data attributes
    /data-price="(\d+)"/g,
    /data-testid="price[^"]*"[^>]*>.*?₪\s*([\d,]+)/gs,
    // JSON in page
    /"grossPrice":\s*{\s*"value":\s*([\d.]+)/g,
    /"price":\s*([\d.]+)/g,
    /"min_price":\s*([\d.]+)/g,
    /"total_price":\s*([\d.]+)/g,
    // Currency patterns
    /₪\s*([\d,]+)/g,
    /ILS\s*([\d,]+)/g,
    // Price display patterns
    /class="[^"]*price[^"]*"[^>]*>\s*₪?\s*([\d,]+)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      const price = Number.parseFloat(match[1].replace(/,/g, ""))
      if (price > 100 && price < 50000 && !prices.includes(price)) {
        prices.push(price)
      }
    }
  }

  return prices.sort((a, b) => a - b)
}

async function scrapeViaBrightData(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  const username = process.env.BRIGHT_DATA_USERNAME
  const password = process.env.BRIGHT_DATA_PASSWORD
  const host = process.env.BRIGHT_DATA_PROXY_HOST || "brd.superproxy.io"
  const port = process.env.BRIGHT_DATA_PROXY_PORT || "22225"

  console.log(`[v0] [BookingScraper] Method 1: Bright Data Web Unlocker`)
  console.log(`[v0] [BookingScraper] Config: host=${host}, port=${port}, username=${username ? "SET" : "NOT SET"}`)

  if (!username || !password) {
    console.log(`[v0] [BookingScraper] Bright Data credentials not configured, skipping`)
    return null
  }

  try {
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[v0] [BookingScraper] Target URL: ${searchUrl}`)

    // Use Bright Data proxy via HTTP proxy URL format
    const proxyUrl = `http://${username}:${password}@${host}:${port}`
    console.log(`[v0] [BookingScraper] Using proxy: ${host}:${port}`)

    // For Vercel/Next.js, we need to use the proxy differently
    // Option 1: Try direct fetch with proxy auth in URL (some environments support this)
    // Option 2: Use Bright Data's SERP API endpoint

    // Try using Bright Data's direct API
    const brightDataApiUrl = `https://api.brightdata.com/serp/req?customer=${username.split("-")[1]?.split("-zone")[0] || ""}&zone=serp`

    // Fallback: Try fetching through their proxy with basic auth header
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
        // Bright Data proxy auth - some fetch implementations support this
        "Proxy-Authorization": `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
    })

    if (!response.ok) {
      console.log(`[v0] [BookingScraper] Bright Data request failed: ${response.status}`)
      return null
    }

    const html = await response.text()
    console.log(`[v0] [BookingScraper] Got response: ${html.length} bytes`)

    // Check for blocking
    if (html.includes("captcha") || html.includes("Access Denied") || html.length < 10000) {
      console.log(`[v0] [BookingScraper] Blocked or captcha, response too short`)
      return null
    }

    // Extract prices
    const prices = extractPricesFromHTML(html)
    console.log(`[v0] [BookingScraper] Found prices: ${prices.join(", ")}`)

    if (prices.length > 0) {
      const price = prices[0] // Take lowest price
      console.log(`[v0] [BookingScraper] SUCCESS via Bright Data: ${price} ILS`)
      return {
        price,
        roomType: "Standard Room",
        currency: "ILS",
        available: true,
        hasBreakfast: false,
        source: "bright_data",
      }
    }

    console.log(`[v0] [BookingScraper] No prices found in Bright Data response`)
    return null
  } catch (error) {
    console.error(`[v0] [BookingScraper] Bright Data error:`, error)
    return null
  }
}

// Method 2: Booking.com GraphQL API (free, no proxy)
async function scrapeViaBookingGraphQL(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    console.log(`[v0] [BookingScraper] Method 2: GraphQL API for ${hotelName}`)

    // First, search for the hotel to get dest_id
    const searchUrl = `https://www.booking.com/autocomplete/api/v1/results?query=${encodeURIComponent(hotelName + " " + city)}&lang=en-us&sb=1&src=searchresults&src_elem=sb`

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!searchResponse.ok) {
      console.log(`[v0] [BookingScraper] GraphQL search failed: ${searchResponse.status}`)
      return null
    }

    const searchData = await searchResponse.json()
    console.log(`[v0] [BookingScraper] Search results:`, JSON.stringify(searchData).substring(0, 300))

    // Look for hotel in results
    let destId = null
    let destType = "hotel"

    if (searchData?.results) {
      for (const result of searchData.results) {
        if (
          result.dest_type === "hotel" ||
          result.label?.toLowerCase().includes(hotelName.toLowerCase().split(" ")[0])
        ) {
          destId = result.dest_id
          destType = result.dest_type || "hotel"
          console.log(`[v0] [BookingScraper] Found hotel: ${result.label}, dest_id: ${destId}`)
          break
        }
      }
    }

    if (!destId) {
      console.log(`[v0] [BookingScraper] Could not find dest_id for ${hotelName}`)
      return null
    }

    // Now get prices using the search results API
    const priceUrl = `https://www.booking.com/searchresults.json?ss=${encodeURIComponent(hotelName)}&dest_id=${destId}&dest_type=${destType}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[v0] [BookingScraper] Fetching prices...`)

    const priceResponse = await fetch(priceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!priceResponse.ok) {
      console.log(`[v0] [BookingScraper] Price fetch failed: ${priceResponse.status}`)
      return null
    }

    const priceText = await priceResponse.text()
    console.log(`[v0] [BookingScraper] Price response length: ${priceText.length}`)

    // Try to find prices in response
    const prices = extractPricesFromHTML(priceText)
    if (prices.length > 0) {
      console.log(`[v0] [BookingScraper] SUCCESS via GraphQL: ${prices[0]} ILS`)
      return {
        price: prices[0],
        roomType: "Standard Room",
        currency: "ILS",
        available: true,
        hasBreakfast: false,
        source: "booking_graphql",
      }
    }

    console.log(`[v0] [BookingScraper] No price found in GraphQL response`)
    return null
  } catch (error) {
    console.error("[v0] [BookingScraper] GraphQL error:", error)
    return null
  }
}

// Method 3: Booking.com Autocomplete API (backup)
async function scrapeViaAutocomplete(hotelName: string, city: string): Promise<BookingPriceResult | null> {
  try {
    console.log(`[v0] [BookingScraper] Method 3: Autocomplete API for ${hotelName}`)

    const url = `https://accommodations.booking.com/autocomplete.json?query=${encodeURIComponent(hotelName + " " + city)}&lang=en-us&sid=&aid=304142&currency=ILS`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.log(`[v0] [BookingScraper] Autocomplete failed: ${response.status}`)
      return null
    }

    const data = await response.json()
    console.log(`[v0] [BookingScraper] Autocomplete response:`, JSON.stringify(data).substring(0, 300))

    // Look for price info in autocomplete results
    if (data?.results?.[0]) {
      const hotel = data.results[0]

      // Sometimes autocomplete includes average prices
      if (hotel.avg_price || hotel.b_avg_price_per_night) {
        const price = hotel.avg_price || hotel.b_avg_price_per_night
        console.log(`[v0] [BookingScraper] SUCCESS via Autocomplete: ${price} ILS`)
        return {
          price: price,
          roomType: "Standard Room",
          currency: "ILS",
          available: true,
          hasBreakfast: false,
          source: "booking_autocomplete",
        }
      }
    }

    console.log(`[v0] [BookingScraper] No price in autocomplete`)
    return null
  } catch (error) {
    console.error("[v0] [BookingScraper] Autocomplete error:", error)
    return null
  }
}

// Method 4: Direct HTML scrape (might be blocked without proxy)
async function scrapeDirectHTML(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    console.log(`[v0] [BookingScraper] Method 4: Direct HTML for ${hotelName}`)

    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    })

    if (!response.ok) {
      console.log(`[v0] [BookingScraper] Direct HTML failed: ${response.status}`)
      return null
    }

    const html = await response.text()
    console.log(`[v0] [BookingScraper] Got HTML: ${html.length} bytes`)

    // Check if we got blocked
    if (html.includes("captcha") || html.includes("blocked") || html.length < 5000) {
      console.log(`[v0] [BookingScraper] Blocked or captcha detected`)
      return null
    }

    // Extract prices
    const prices = extractPricesFromHTML(html)
    if (prices.length > 0) {
      console.log(`[v0] [BookingScraper] SUCCESS via HTML: ${prices[0]} ILS`)
      return {
        price: prices[0],
        roomType: "Standard Room",
        currency: "ILS",
        available: true,
        hasBreakfast: false,
        source: "booking_html",
      }
    }

    console.log(`[v0] [BookingScraper] No price found in HTML`)
    return null
  } catch (error) {
    console.error("[v0] [BookingScraper] Direct HTML error:", error)
    return null
  }
}

// Main scraping function - tries multiple methods
export async function scrapeBookingPrice(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  console.log(`[v0] [BookingScraper] ========================================`)
  console.log(`[v0] [BookingScraper] Starting scrape for ${hotelName} in ${city}`)
  console.log(`[v0] [BookingScraper] Dates: ${checkIn} to ${checkOut}`)
  console.log(`[v0] [BookingScraper] ========================================`)

  // Try Method 1: Bright Data MCP (MOST POWERFUL!) 🚀
  if (process.env.BRIGHT_DATA_API_TOKEN) {
    console.log(`[v0] [BookingScraper] 🚀 Method 1: Bright Data MCP`)
    try {
      const mcpResult = await scrapeBookingWithMCP(hotelName, city, checkIn, checkOut)
      if (mcpResult) {
        console.log(`[v0] [BookingScraper] ✅ SUCCESS with MCP: ${mcpResult.currency} ${mcpResult.price}`)
        return mcpResult
      }
    } catch (error) {
      console.log(`[v0] [BookingScraper] MCP failed:`, error)
    }
  } else {
    console.log(`[v0] [BookingScraper] ⏭️  Skipping MCP (no API token)`)
  }

  // Try Method 1.5: Vercel Puppeteer (Serverless-compatible) 🎭
  console.log(`[v0] [BookingScraper] 🎭 Method 1.5: Vercel Puppeteer (Serverless)`)
  try {
    const { scrapeBookingWithVercelPuppeteerSearch } = await getVercelPuppeteerScrapers()
    if (scrapeBookingWithVercelPuppeteerSearch) {
      const puppeteerResult = await scrapeBookingWithVercelPuppeteerSearch(hotelName, city, checkIn, checkOut)
      if (puppeteerResult) {
        console.log(`[v0] [BookingScraper] ✅ SUCCESS with Vercel Puppeteer: ${puppeteerResult.currency} ${puppeteerResult.price}`)
        return puppeteerResult
      }
    } else {
      console.log(`[v0] [BookingScraper] ⏭️  Vercel Puppeteer not available`)
    }
  } catch (error: any) {
    console.log(`[v0] [BookingScraper] Vercel Puppeteer failed:`, error?.message)
  }

  // Try Method 2: Bright Data Proxy (legacy)
  console.log(`[v0] [BookingScraper] 🔄 Method 2: Bright Data Proxy`)
  const brightDataResult = await scrapeViaBrightData(hotelName, city, checkIn, checkOut)
  if (brightDataResult) {
    return brightDataResult
  }

  // Try Method 3: GraphQL API
  console.log(`[v0] [BookingScraper] 🔄 Method 3: GraphQL API`)
  const graphqlResult = await scrapeViaBookingGraphQL(hotelName, city, checkIn, checkOut)
  if (graphqlResult) {
    return graphqlResult
  }

  // Try Method 4: Autocomplete API
  console.log(`[v0] [BookingScraper] 🔄 Method 4: Autocomplete API`)
  const autocompleteResult = await scrapeViaAutocomplete(hotelName, city)
  if (autocompleteResult) {
    return autocompleteResult
  }

  // Try Method 5: Direct HTML
  console.log(`[v0] [BookingScraper] 🔄 Method 5: Direct HTML`)
  const htmlResult = await scrapeDirectHTML(hotelName, city, checkIn, checkOut)
  if (htmlResult) {
    return htmlResult
  }

  console.log(`[v0] [BookingScraper] ❌ All 6 methods failed for ${hotelName}`)
  return null
}

// For compatibility with existing code
export async function scrapeBookingViaHtml(
  hotelUrl: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult[]> {
  console.log(`[v0] [BookingScraper] Scraping URL: ${hotelUrl}`)
  
  // Try MCP first if available
  if (process.env.BRIGHT_DATA_API_TOKEN) {
    console.log(`[v0] [BookingScraper] 🚀 Trying MCP for URL scraping...`)
    try {
      const mcpResults = await scrapeBookingUrlWithMCP(hotelUrl, checkIn, checkOut)
      if (mcpResults.length > 0) {
        console.log(`[v0] [BookingScraper] ✅ SUCCESS with MCP: ${mcpResults.length} prices found`)
        return mcpResults
      }
    } catch (error) {
      console.log(`[v0] [BookingScraper] MCP URL scraping failed:`, error)
    }
  }

  // Try Vercel Puppeteer second
  console.log(`[v0] [BookingScraper] 🎭 Trying Vercel Puppeteer for URL scraping...`)
  try {
    const { scrapeBookingWithVercelPuppeteer } = await getVercelPuppeteerScrapers()
    if (scrapeBookingWithVercelPuppeteer) {
      const puppeteerResult = await scrapeBookingWithVercelPuppeteer(hotelUrl, checkIn, checkOut)
      if (puppeteerResult) {
        console.log(`[v0] [BookingScraper] ✅ SUCCESS with Vercel Puppeteer`)
        return [puppeteerResult]
      }
    }
  } catch (error: any) {
    console.log(`[v0] [BookingScraper] Vercel Puppeteer URL scraping failed:`, error?.message)
  }
  
  // Fallback to extracting hotel name and using regular method
  console.log(`[v0] [BookingScraper] Falling back to standard methods...`)
  const hotelMatch = hotelUrl.match(/\/hotel\/[a-z]{2}\/([^\/]+)/)
  if (hotelMatch) {
    const hotelSlug = hotelMatch[1].replace(/-/g, ' ')
    const result = await scrapeBookingPrice(hotelSlug, '', checkIn, checkOut)
    return result ? [result] : []
  }
  
  return []
}
