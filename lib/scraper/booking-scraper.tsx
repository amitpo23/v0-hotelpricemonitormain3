// Real Booking.com scraper using multiple methods
// Based on scraper_findings.md and scraper_v5.py

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

// Price extraction patterns based on scraper_findings.md
const PRICE_PATTERNS = [
  // Pattern for S$ format (Singapore Dollars)
  /S\$\s*([\d,]+(?:\.\d{2})?)/g,
  // Pattern for ₪ format (Israeli Shekels)
  /₪\s*([\d,]+(?:\.\d{2})?)/g,
  // Pattern for $ format (US Dollars)
  /\$\s*([\d,]+(?:\.\d{2})?)/g,
  // Pattern for € format (Euros)
  /€\s*([\d,]+(?:\.\d{2})?)/g,
  // JSON price patterns
  /"priceBreakdown":\s*{\s*"grossPrice":\s*{\s*"value":\s*([\d.]+)/,
  /"totalPrice":\s*"?([\d,]+)/,
  /data-testid="price-and-discounted-price"[^>]*>([^<]*[\d,]+)/,
]

// Selectors based on scraper_findings.md
const SELECTORS = {
  roomContainer: '[data-testid="property-card-container"], .hprt-table-row, [data-block-id], .room-block',
  roomName: '.hprt-roomtype-icon-link, [data-testid="title"], .room-name, a[data-room-id]',
  price: '[data-testid="price-and-discounted-price"], .prco-valign-middle-helper, .bui-price-display__value',
  originalPrice: '.bui-price-display__original, [data-testid="strikethrough-price"]',
  breakfast: '.hprt-facilities-facility, [data-testid="inclusion"]',
  availability: '[data-testid="availability-single"], .only_x_left',
}

// Parse price from text, handling different currencies
function parsePrice(text: string): { price: number; currency: string } | null {
  if (!text) return null

  // Detect currency and extract price
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

  // Fallback: just extract numbers
  const numMatch = text.match(/([\d,]+(?:\.\d{2})?)/)
  if (numMatch) {
    const price = Number.parseFloat(numMatch[1].replace(/,/g, ""))
    if (price > 50 && price < 100000) {
      return { price, currency: "ILS" }
    }
  }

  return null
}

// Check if breakfast is included
function hasBreakfastIncluded(html: string): { included: boolean; optionalPrice?: number } {
  const breakfastIncludedPatterns = [
    /breakfast\s+included/i,
    /ארוחת בוקר כלולה/i,
    /כולל ארוחת בוקר/i,
    /Breakfast included in the price/i,
  ]

  for (const pattern of breakfastIncludedPatterns) {
    if (pattern.test(html)) {
      return { included: true }
    }
  }

  // Check for optional breakfast with price
  const optionalMatch =
    html.match(/Breakfast\s+S?\$?\s*([\d,]+)\s*$$optional$$/i) ||
    html.match(/ארוחת בוקר\s+₪?\s*([\d,]+)\s*$$אופציונלי$$/i)
  if (optionalMatch) {
    return { included: false, optionalPrice: Number.parseFloat(optionalMatch[1].replace(/,/g, "")) }
  }

  return { included: false }
}

// Extract rooms left count
function extractRoomsLeft(html: string): number | undefined {
  const match =
    html.match(/We have (\d+) left/i) || html.match(/Only (\d+) (?:rooms? )?left/i) || html.match(/נותרו (\d+)/i)
  return match ? Number.parseInt(match[1]) : undefined
}

// Method 1: Bright Data Web Unlocker (best for bypassing anti-bot)
async function scrapeViaBrightDataUnlocker(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  const username = process.env.BRIGHT_DATA_USERNAME
  const password = process.env.BRIGHT_DATA_PASSWORD

  if (!username || !password) {
    console.log("[BookingScraper] Bright Data credentials not configured")
    return null
  }

  try {
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[BookingScraper] Trying Bright Data Web Unlocker for: ${hotelName}`)

    // Bright Data Web Unlocker via proxy
    const proxyAuth = Buffer.from(`${username}:${password}`).toString("base64")

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Proxy-Authorization": `Basic ${proxyAuth}`,
      },
    })

    if (!response.ok) {
      console.log(`[BookingScraper] Bright Data request failed: ${response.status}`)
      return null
    }

    const html = await response.text()

    // Try to extract price using multiple patterns
    const priceResult = parsePrice(html)
    if (priceResult && priceResult.price > 50) {
      const breakfast = hasBreakfastIncluded(html)
      const roomsLeft = extractRoomsLeft(html)

      // Try to find room name
      const roomNameMatch =
        html.match(/data-testid="title"[^>]*>([^<]+)/) || html.match(/hprt-roomtype-name[^>]*>([^<]+)/)

      console.log(`[BookingScraper] SUCCESS via Bright Data: ${priceResult.currency} ${priceResult.price}`)

      return {
        price: priceResult.price,
        roomType: roomNameMatch ? roomNameMatch[1].trim() : "Standard Room",
        currency: priceResult.currency,
        available: true,
        hasBreakfast: breakfast.included,
        breakfastPrice: breakfast.optionalPrice,
        roomsLeft,
        source: "bright_data_unlocker",
      }
    }

    return null
  } catch (error) {
    console.error("[BookingScraper] Bright Data error:", error)
    return null
  }
}

// Method 2: Bright Data Scraping Browser (for JavaScript-heavy pages)
async function scrapeViaBrightDataBrowser(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  const username = process.env.BRIGHT_DATA_BROWSER_USERNAME || process.env.BRIGHT_DATA_USERNAME
  const password = process.env.BRIGHT_DATA_BROWSER_PASSWORD || process.env.BRIGHT_DATA_PASSWORD

  if (!username || !password) {
    return null
  }

  try {
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[BookingScraper] Trying Bright Data Scraping Browser for: ${hotelName}`)

    const response = await fetch("https://api.brightdata.com/scraping/v1/browser/html", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({
        url: searchUrl,
        wait_for: '.sr_property_block, [data-testid="property-card"]',
        timeout: 30000,
        country: "il",
        render_js: true,
      }),
    })

    if (!response.ok) {
      console.log(`[BookingScraper] Bright Data Browser failed: ${response.status}`)
      return null
    }

    const html = await response.text()
    const priceResult = parsePrice(html)

    if (priceResult && priceResult.price > 50) {
      const breakfast = hasBreakfastIncluded(html)
      console.log(`[BookingScraper] SUCCESS via Bright Data Browser: ${priceResult.currency} ${priceResult.price}`)

      return {
        price: priceResult.price,
        roomType: "Standard Room",
        currency: priceResult.currency,
        available: true,
        hasBreakfast: breakfast.included,
        breakfastPrice: breakfast.optionalPrice,
        source: "bright_data_browser",
      }
    }

    return null
  } catch (error) {
    console.error("[BookingScraper] Bright Data Browser error:", error)
    return null
  }
}

// Method 3: Direct HTTP with rotating headers (free, but may be blocked)
async function scrapeViaDirectHTTP(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[BookingScraper] Trying direct HTTP for: ${hotelName}`)

    // Rotate user agents
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ]
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)]

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    })

    if (!response.ok) {
      console.log(`[BookingScraper] Direct HTTP failed: ${response.status}`)
      return null
    }

    const html = await response.text()

    // Check for CAPTCHA or blocking
    if (html.includes("captcha") || html.includes("blocked") || html.includes("Access denied")) {
      console.log("[BookingScraper] Blocked by anti-bot")
      return null
    }

    const priceResult = parsePrice(html)
    if (priceResult && priceResult.price > 50) {
      const breakfast = hasBreakfastIncluded(html)
      console.log(`[BookingScraper] SUCCESS via direct HTTP: ${priceResult.currency} ${priceResult.price}`)

      return {
        price: priceResult.price,
        roomType: "Standard Room",
        currency: priceResult.currency,
        available: true,
        hasBreakfast: breakfast.included,
        breakfastPrice: breakfast.optionalPrice,
        source: "direct_http",
      }
    }

    return null
  } catch (error) {
    console.error("[BookingScraper] Direct HTTP error:", error)
    return null
  }
}

// Method 4: Booking.com Autocomplete API (to find hotel ID)
async function scrapeViaAutocomplete(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    console.log(`[BookingScraper] Trying Autocomplete API for: ${hotelName}`)

    const autocompleteUrl = `https://accommodations.booking.com/autocomplete.json?lang=en-us&query=${encodeURIComponent(
      hotelName + " " + city,
    )}`

    const response = await fetch(autocompleteUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      return null
    }

    // Find hotel in results
    const hotel = data.results.find((r: any) => r.dest_type === "hotel")
    if (!hotel || !hotel.b_url) {
      return null
    }

    console.log(`[BookingScraper] Found hotel: ${hotel.label}`)

    // Now fetch the hotel page
    const hotelUrl = `https://www.booking.com${hotel.b_url}?checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    const hotelResponse = await fetch(hotelUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!hotelResponse.ok) {
      return null
    }

    const html = await hotelResponse.text()
    const priceResult = parsePrice(html)

    if (priceResult && priceResult.price > 50) {
      const breakfast = hasBreakfastIncluded(html)
      console.log(`[BookingScraper] SUCCESS via Autocomplete: ${priceResult.currency} ${priceResult.price}`)

      return {
        price: priceResult.price,
        roomType: "Standard Room",
        currency: priceResult.currency,
        available: true,
        hasBreakfast: breakfast.included,
        breakfastPrice: breakfast.optionalPrice,
        source: "autocomplete_api",
      }
    }

    return null
  } catch (error) {
    console.error("[BookingScraper] Autocomplete error:", error)
    return null
  }
}

// Method 5: Bright Data Scraping Browser via HTTP proxy
async function scrapeViaBrightDataScrapingBrowser(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  // Get WebSocket URL from env or use the provided credentials
  const wsUrl = process.env.BRIGHT_DATA_BROWSER_WS

  if (!wsUrl) {
    console.log("[BookingScraper] BRIGHT_DATA_BROWSER_WS not configured")
    return null
  }

  try {
    // Extract credentials from WebSocket URL
    // Format: wss://username:password@host:port
    const urlMatch = wsUrl.match(/wss?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)/)
    if (!urlMatch) {
      console.log("[BookingScraper] Invalid BRIGHT_DATA_BROWSER_WS format")
      return null
    }

    const [, username, password, host, port] = urlMatch

    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[BookingScraper] Trying Bright Data Scraping Browser for: ${hotelName}`)

    // Use Bright Data's proxy with the scraping browser credentials
    const proxyUrl = `https://${username}:${password}@${host}:${port}`

    // Make request through Bright Data's HTTP endpoint
    // The scraping browser can also be accessed via HTTP for simple requests
    const response = await fetch(`https://${host}:33335/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
      body: JSON.stringify({
        url: searchUrl,
        render_js: true,
        wait_for_selector: '[data-testid="property-card"], .sr_property_block',
        timeout: 45000,
        country: "il",
      }),
    })

    if (!response.ok) {
      // Fallback: try direct proxy request
      console.log(`[BookingScraper] Scraping Browser API failed (${response.status}), trying proxy method...`)
      return await scrapeViaBrightDataProxy(hotelName, city, checkIn, checkOut, username, password, host)
    }

    const data = await response.json()
    const html = data.html || data.body || ""

    const priceResult = parsePrice(html)
    if (priceResult && priceResult.price > 50) {
      const breakfast = hasBreakfastIncluded(html)
      const roomsLeft = extractRoomsLeft(html)

      console.log(`[BookingScraper] SUCCESS via Scraping Browser: ${priceResult.currency} ${priceResult.price}`)

      return {
        price: priceResult.price,
        roomType: extractRoomType(html) || "Standard Room",
        currency: priceResult.currency,
        available: true,
        hasBreakfast: breakfast.included,
        breakfastPrice: breakfast.optionalPrice,
        roomsLeft,
        source: "bright_data_scraping_browser",
      }
    }

    return null
  } catch (error) {
    console.error("[BookingScraper] Scraping Browser error:", error)
    return null
  }
}

// Method 6: Fallback proxy method for Bright Data
async function scrapeViaBrightDataProxy(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  const host = process.env.BRIGHT_DATA_PROXY_HOST
  const port = process.env.BRIGHT_DATA_PROXY_PORT
  const username = process.env.BRIGHT_DATA_USERNAME
  const password = process.env.BRIGHT_DATA_PASSWORD

  if (!host || !username || !password) {
    console.log("[BookingScraper] Bright Data Proxy not configured - missing env vars")
    return null
  }

  try {
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[BookingScraper] Trying Bright Data Proxy for: ${hotelName}`)

    // Use proxy-agent approach with fetch
    const proxyUrl = `http://${username}:${password}@${host}:${port || "9515"}`

    // For Vercel/Next.js, we need to use the proxy differently
    // We'll add proxy auth in headers and use Bright Data's API endpoint
    const response = await fetch(`https://api.brightdata.com/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
      body: JSON.stringify({
        zone: "scraping_browser1",
        url: searchUrl,
        format: "raw",
        country: "il",
      }),
    })

    if (!response.ok) {
      // Fallback: try direct proxy connection
      console.log(`[BookingScraper] Bright Data API failed (${response.status}), trying direct...`)

      const directResponse = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
          "x-proxy-auth": `${username}:${password}`,
        },
      })

      if (!directResponse.ok) {
        console.log(`[BookingScraper] Direct proxy failed: ${directResponse.status}`)
        return null
      }

      const html = await directResponse.text()
      return parseBookingHtml(html, "bright_data_proxy_direct")
    }

    const html = await response.text()
    return parseBookingHtml(html, "bright_data_proxy")
  } catch (error) {
    console.error("[BookingScraper] Bright Data Proxy error:", error)
    return null
  }
}

// Method 7: Bright Data HTTP Proxy (simplest and most reliable)
async function scrapeViaBrightDataHTTPProxy(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  const proxyUrl = process.env.BRIGHT_DATA_PROXY

  if (!proxyUrl) {
    console.log("[BookingScraper] BRIGHT_DATA_PROXY not configured")
    return null
  }

  try {
    // Extract credentials from proxy URL
    // Format: https://username:password@host:port
    const urlMatch = proxyUrl.match(/https?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)/)
    if (!urlMatch) {
      console.log("[BookingScraper] Invalid BRIGHT_DATA_PROXY format")
      return null
    }

    const [, username, password, host, port] = urlMatch

    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[BookingScraper] Trying Bright Data HTTP Proxy for: ${hotelName}`)

    // Make request with proxy authentication header
    const auth = Buffer.from(`${username}:${password}`).toString("base64")

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
        "Proxy-Authorization": `Basic ${auth}`,
      },
    })

    if (!response.ok) {
      console.log(`[BookingScraper] HTTP Proxy failed: ${response.status}`)
      return null
    }

    const html = await response.text()

    // Check for blocking
    if (html.includes("captcha") || html.includes("Access denied") || html.length < 1000) {
      console.log("[BookingScraper] Blocked or empty response from HTTP Proxy")
      return null
    }

    const priceResult = parsePrice(html)
    if (priceResult && priceResult.price > 50) {
      const breakfast = hasBreakfastIncluded(html)
      const roomsLeft = extractRoomsLeft(html)

      console.log(`[BookingScraper] SUCCESS via HTTP Proxy: ${priceResult.currency} ${priceResult.price}`)

      return {
        price: priceResult.price,
        roomType: extractRoomType(html) || "Standard Room",
        currency: priceResult.currency,
        available: true,
        hasBreakfast: breakfast.included,
        breakfastPrice: breakfast.optionalPrice,
        roomsLeft,
        source: "bright_data_http_proxy",
      }
    }

    return null
  } catch (error) {
    console.error("[BookingScraper] HTTP Proxy error:", error)
    return null
  }
}

// Helper function to extract room type
function extractRoomType(html: string): string | null {
  const patterns = [
    /data-testid="title"[^>]*>([^<]+)</,
    /hprt-roomtype-icon-link[^>]*>([^<]+)</,
    /room-name[^>]*>([^<]+)</,
    /"roomName"\s*:\s*"([^"]+)"/,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  return null
}

function parseBookingHtml(html: string, source: string): BookingPriceResult | null {
  // Check for CAPTCHA or blocking
  if (html.includes("captcha") || html.includes("blocked") || html.includes("Access denied")) {
    console.log(`[BookingScraper] Blocked or CAPTCHA detected via ${source}`)
    return null
  }

  const priceResult = parsePrice(html)
  if (priceResult && priceResult.price > 50) {
    const breakfast = hasBreakfastIncluded(html)
    const roomsLeft = extractRoomsLeft(html)

    // Try to find room name
    const roomNameMatch =
      html.match(/data-testid="title"[^>]*>([^<]+)/) ||
      html.match(/hprt-roomtype-name[^>]*>([^<]+)/) ||
      html.match(/class="[^"]*room[^"]*name[^"]*"[^>]*>([^<]+)/i)

    console.log(`[BookingScraper] SUCCESS via ${source}: ${priceResult.currency} ${priceResult.price}`)

    return {
      price: priceResult.price,
      roomType: roomNameMatch ? roomNameMatch[1].trim() : "Standard Room",
      currency: priceResult.currency,
      available: true,
      hasBreakfast: breakfast.included,
      breakfastPrice: breakfast.optionalPrice,
      roomsLeft,
      source,
    }
  }

  return null
}

// Main export: Try all methods in priority order
export async function scrapeBookingPrice(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  console.log(`[BookingScraper] Starting scrape for: ${hotelName} in ${city}`)
  console.log(`[BookingScraper] Dates: ${checkIn} to ${checkOut}`)

  // Log available config
  console.log(`[BookingScraper] Config check:`, {
    hasProxyHost: !!process.env.BRIGHT_DATA_PROXY_HOST,
    hasUsername: !!process.env.BRIGHT_DATA_USERNAME,
    hasPassword: !!process.env.BRIGHT_DATA_PASSWORD,
  })

  // Try methods in order of reliability
  const methods = [
    { name: "Bright Data Proxy", fn: () => scrapeViaBrightDataProxy(hotelName, city, checkIn, checkOut) },
    { name: "Bright Data Unlocker", fn: () => scrapeViaBrightDataUnlocker(hotelName, city, checkIn, checkOut) },
    { name: "Bright Data Browser", fn: () => scrapeViaBrightDataBrowser(hotelName, city, checkIn, checkOut) },
    { name: "Direct HTTP", fn: () => scrapeViaDirectHTTP(hotelName, city, checkIn, checkOut) },
    { name: "Booking Autocomplete", fn: () => scrapeViaAutocomplete(hotelName, city, checkIn, checkOut) },
  ]

  for (const method of methods) {
    try {
      console.log(`[BookingScraper] Trying method: ${method.name}`)
      const result = await method.fn()
      if (result && result.price > 0) {
        console.log(`[BookingScraper] Success with ${method.name}: ₪${result.price}`)
        return result
      }
    } catch (error) {
      console.error(`[BookingScraper] ${method.name} failed:`, error)
    }
  }

  console.log(`[BookingScraper] All methods failed for: ${hotelName}`)
  return null
}

// Scrape directly from a Booking.com URL
export async function scrapeBookingUrl(
  bookingUrl: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    const url = new URL(bookingUrl)
    url.searchParams.set("checkin", checkIn)
    url.searchParams.set("checkout", checkOut)
    url.searchParams.set("selected_currency", "ILS")
    url.searchParams.set("lang", "en-us")
    url.searchParams.set("group_adults", "2")
    url.searchParams.set("no_rooms", "1")

    console.log(`[BookingScraper] Scraping URL: ${url.toString()}`)

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
      },
    })

    if (!response.ok) {
      console.log(`[BookingScraper] URL scrape failed: ${response.status}`)
      return null
    }

    const html = await response.text()

    // Check for blocking
    if (html.includes("captcha") || html.includes("Access denied")) {
      console.log("[BookingScraper] Blocked")
      return null
    }

    const priceResult = parsePrice(html)
    if (priceResult && priceResult.price > 50) {
      const breakfast = hasBreakfastIncluded(html)
      const roomsLeft = extractRoomsLeft(html)

      return {
        price: priceResult.price,
        roomType: extractRoomType(html) || "Standard Room",
        currency: priceResult.currency,
        available: true,
        hasBreakfast: breakfast.included,
        breakfastPrice: breakfast.optionalPrice,
        roomsLeft,
        source: "direct_url",
      }
    }

    return null
  } catch (error) {
    console.error("[BookingScraper] URL scrape error:", error)
    return null
  }
}

// Export for backward compatibility
export async function scrapeBookingViaHtml(
  bookingUrl: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult[]> {
  const result = await scrapeBookingUrl(bookingUrl, checkIn, checkOut)
  return result ? [result] : []
}
