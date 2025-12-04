// Real Booking.com scraper using multiple methods
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

// Booking.com data-testid selectors (from Puppeteer script)
const BOOKING_SELECTORS = {
  propertyCard: '[data-testid="property-card"]',
  title: '[data-testid="title"]',
  price: '[data-testid="price-and-discounted-price"]',
  reviewScore: '[data-testid="review-score"]',
  searchInput: '[data-testid="destination-container"] input',
  datesContainer: '[data-testid="searchbox-dates-container"]',
  calendar: '[data-testid="searchbox-datepicker-calendar"]',
}

// Parse price from text, handling different currencies
function parsePrice(text: string): { price: number; currency: string } | null {
  if (!text) return null

  const currencyPatterns: { pattern: RegExp; currency: string }[] = [
    { pattern: /S\$\s*([\d,]+(?:\.\d{2})?)/i, currency: "SGD" },
    { pattern: /₪\s*([\d,]+(?:\.\d{2})?)/i, currency: "ILS" },
    { pattern: /€\s*([\d,]+(?:\.\d{2})?)/i, currency: "EUR" },
    { pattern: /US\$\s*([\d,]+(?:\.\d{2})?)/i, currency: "USD" },
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

// Extract prices from HTML using multiple patterns including data-testid selectors
function extractPricesFromHTML(html: string): number[] {
  const prices: number[] = []

  const patterns = [
    // Data-testid patterns (from Puppeteer script)
    /data-testid="price-and-discounted-price"[^>]*>([^<]*₪[\d,]+)/g,
    /data-testid="price-and-discounted-price"[^>]*>([^<]*\$[\d,]+)/g,
    // Data attributes
    /data-price="(\d+)"/g,
    /data-price-amount="(\d+)"/g,
    // JSON in page
    /"grossPrice":\s*{\s*"value":\s*([\d.]+)/g,
    /"price":\s*([\d.]+)/g,
    /"min_price":\s*([\d.]+)/g,
    /"total_price":\s*([\d.]+)/g,
    /"displayPrice":\s*"[^"]*?([\d,]+)/g,
    // Currency patterns
    /₪\s*([\d,]+)/g,
    /ILS\s*([\d,]+)/g,
    /US\$\s*([\d,]+)/g,
    // Price display patterns
    /class="[^"]*price[^"]*"[^>]*>\s*[₪$]?\s*([\d,]+)/gi,
    /aria-label="[^"]*price[^"]*[\d,]+/gi,
  ]

  for (const pattern of patterns) {
    let match
    const regex = new RegExp(pattern.source, pattern.flags)
    while ((match = regex.exec(html)) !== null) {
      // Extract just the number
      const numMatch = match[1] || match[0]
      const numStr = numMatch.replace(/[^\d.]/g, "")
      const price = Number.parseFloat(numStr)
      if (price > 50 && price < 50000 && !prices.includes(price)) {
        prices.push(price)
      }
    }
  }

  return prices.sort((a, b) => a - b)
}

// Method 0: Bright Data Scraping Browser as HTTP Proxy
async function scrapeViaBrightDataProxy(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  // Use environment variables or fallback to hardcoded (for testing)
  const username = process.env.BRIGHT_DATA_USERNAME || "brd-customer-hl_b8df3680-zone-scraping_browser1"
  const password = process.env.BRIGHT_DATA_PASSWORD || "6qnz6rxzdyh3"
  const host = process.env.BRIGHT_DATA_PROXY_HOST || "brd.superproxy.io"
  const port = process.env.BRIGHT_DATA_PROXY_PORT || "9515"

  console.log(`[v0] [BookingScraper] Method 0: Bright Data Proxy`)
  console.log(`[v0] [BookingScraper] Using: ${username.substring(0, 20)}...@${host}:${port}`)

  try {
    const targetUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[v0] [BookingScraper] Target URL: ${targetUrl.substring(0, 100)}...`)

    // Try using Bright Data's proxy with Basic auth
    const auth = Buffer.from(`${username}:${password}`).toString("base64")

    // Method A: Direct request with proxy auth header
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Proxy-Authorization": `Basic ${auth}`,
        "X-Proxy-Auth": `Basic ${auth}`,
      },
    })

    console.log(`[v0] [BookingScraper] Response status: ${response.status}`)

    if (!response.ok) {
      console.log(`[v0] [BookingScraper] Proxy request failed: ${response.status}`)
      return null
    }

    const html = await response.text()
    console.log(`[v0] [BookingScraper] Got ${html.length} bytes`)

    // Check if blocked
    if (html.includes("Access Denied") || html.includes("captcha") || html.length < 5000) {
      console.log(`[v0] [BookingScraper] Blocked or captcha`)
      return null
    }

    const prices = extractPricesFromHTML(html)
    console.log(`[v0] [BookingScraper] Found ${prices.length} prices: ${prices.slice(0, 5).join(", ")}`)

    if (prices.length > 0) {
      console.log(`[v0] [BookingScraper] SUCCESS via Bright Data Proxy: ${prices[0]} ILS`)
      return {
        price: prices[0],
        roomType: "Standard Room",
        currency: "ILS",
        available: true,
        hasBreakfast: false,
        source: "bright_data_proxy",
      }
    }

    return null
  } catch (error) {
    console.error(`[v0] [BookingScraper] Bright Data Proxy error:`, error)
    return null
  }
}

// Method 1: Bright Data Web Unlocker API (requires API token)
async function scrapeViaBrightDataAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
  apiToken: string,
): Promise<BookingPriceResult | null> {
  const zone = process.env.BRIGHT_DATA_ZONE || "web_unlocker1"

  console.log(`[v0] [BookingScraper] Method 1: Bright Data API`)
  console.log(`[v0] [BookingScraper] API Token: ${apiToken ? "SET" : "NOT SET"}, Zone: ${zone}`)

  if (!apiToken) {
    console.log(`[v0] [BookingScraper] No API token, skipping Bright Data API`)
    return null
  }

  try {
    const targetUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[v0] [BookingScraper] Target: ${targetUrl}`)

    // Bright Data direct API
    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        zone: zone,
        url: targetUrl,
        format: "raw",
      }),
    })

    if (!response.ok) {
      console.log(`[v0] [BookingScraper] Bright Data API error: ${response.status}`)
      const errorText = await response.text()
      console.log(`[v0] [BookingScraper] Error details: ${errorText.substring(0, 200)}`)
      return null
    }

    const html = await response.text()
    console.log(`[v0] [BookingScraper] Got ${html.length} bytes from Bright Data API`)

    if (html.length < 5000) {
      console.log(`[v0] [BookingScraper] Response too short, likely blocked`)
      return null
    }

    const prices = extractPricesFromHTML(html)
    console.log(`[v0] [BookingScraper] Found prices: ${prices.slice(0, 5).join(", ")}`)

    if (prices.length > 0) {
      console.log(`[v0] [BookingScraper] SUCCESS via Bright Data API: ${prices[0]} ILS`)
      return {
        price: prices[0],
        roomType: "Standard Room",
        currency: "ILS",
        available: true,
        hasBreakfast: false,
        source: "bright_data_api",
      }
    }

    return null
  } catch (error) {
    console.error(`[v0] [BookingScraper] Bright Data API error:`, error)
    return null
  }
}

// Method 2: Booking.com Search API (free, no proxy)
async function scrapeViaBookingSearchAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    console.log(`[v0] [BookingScraper] Method 2: Booking.com Search API for ${hotelName}`)

    // First, search for the hotel using autocomplete
    const searchUrl = `https://www.booking.com/autocomplete/api/v1/results?query=${encodeURIComponent(
      hotelName + " " + city,
    )}&lang=en-us&sb=1&src=searchresults`

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.booking.com/",
      },
    })

    if (!searchResponse.ok) {
      console.log(`[v0] [BookingScraper] Search API failed: ${searchResponse.status}`)
      return null
    }

    const searchData = await searchResponse.json()
    console.log(`[v0] [BookingScraper] Search results count: ${searchData?.results?.length || 0}`)

    // Find hotel dest_id
    let destId = null
    let hotelSlug = null

    if (searchData?.results) {
      for (const result of searchData.results) {
        if (result.dest_type === "hotel" || result.type === "ho") {
          destId = result.dest_id
          hotelSlug = result.b_hotel_url || result.url
          console.log(`[v0] [BookingScraper] Found: ${result.label}, dest_id: ${destId}`)
          break
        }
      }
    }

    if (!destId) {
      // Try city search as fallback
      for (const result of searchData?.results || []) {
        if (result.dest_type === "city" || result.type === "ci") {
          destId = result.dest_id
          console.log(`[v0] [BookingScraper] Using city: ${result.label}, dest_id: ${destId}`)
          break
        }
      }
    }

    if (!destId) {
      console.log(`[v0] [BookingScraper] Could not find dest_id`)
      return null
    }

    // Try to get price data from search results JSON endpoint
    const priceApiUrl = `https://www.booking.com/dml/graphql?query=${encodeURIComponent(`
      query {
        searchQueries {
          search(input: {
            destination: { id: "${destId}" }
            checkin: "${checkIn}"
            checkout: "${checkOut}"
            nbAdults: 2
            nbRooms: 1
          }) {
            results {
              displayName { text }
              priceDisplayInfo {
                displayPrice { amountPerStay { amountRounded } }
              }
            }
          }
        }
      }
    `)}`

    // This GraphQL endpoint may not work without auth, so let's try a simpler approach
    // Try to get hotel page directly if we have the slug
    if (hotelSlug) {
      const hotelUrl = hotelSlug.startsWith("http") ? hotelSlug : `https://www.booking.com${hotelSlug}`
      const fullUrl = `${hotelUrl}?checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS`

      console.log(`[v0] [BookingScraper] Trying hotel page: ${fullUrl}`)

      const hotelResponse = await fetch(fullUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
      })

      if (hotelResponse.ok) {
        const html = await hotelResponse.text()
        console.log(`[v0] [BookingScraper] Hotel page: ${html.length} bytes`)

        const prices = extractPricesFromHTML(html)
        if (prices.length > 0) {
          console.log(`[v0] [BookingScraper] SUCCESS via Hotel Page: ${prices[0]} ILS`)
          return {
            price: prices[0],
            roomType: "Standard Room",
            currency: "ILS",
            available: true,
            hasBreakfast: false,
            source: "booking_hotel_page",
          }
        }
      }
    }

    console.log(`[v0] [BookingScraper] No price found via Booking API`)
    return null
  } catch (error) {
    console.error("[v0] [BookingScraper] Booking API error:", error)
    return null
  }
}

// Method 3: Direct HTML scrape (last resort, often blocked)
async function scrapeViaDirectHTML(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    console.log(`[v0] [BookingScraper] Method 3: Direct HTML scrape`)

    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1&nflt=`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    })

    if (!response.ok) {
      console.log(`[v0] [BookingScraper] Direct HTML failed: ${response.status}`)
      return null
    }

    const html = await response.text()
    console.log(`[v0] [BookingScraper] Got HTML: ${html.length} bytes`)

    // Check for blocking
    if (html.includes("captcha") || html.includes("Access Denied") || html.length < 10000) {
      console.log(`[v0] [BookingScraper] Blocked or captcha detected`)
      return null
    }

    const prices = extractPricesFromHTML(html)
    console.log(`[v0] [BookingScraper] Extracted ${prices.length} prices: ${prices.slice(0, 5).join(", ")}`)

    if (prices.length > 0) {
      console.log(`[v0] [BookingScraper] SUCCESS via Direct HTML: ${prices[0]} ILS`)
      return {
        price: prices[0],
        roomType: "Standard Room",
        currency: "ILS",
        available: true,
        hasBreakfast: false,
        source: "booking_direct",
      }
    }

    console.log(`[v0] [BookingScraper] No prices found in HTML`)
    return null
  } catch (error) {
    console.error("[v0] [BookingScraper] Direct HTML error:", error)
    return null
  }
}

// Main scraping function - tries all methods in order
export async function scrapeBookingPrice(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
  bookingUrl?: string,
): Promise<BookingPriceResult | null> {
  console.log(`[v0] [BookingScraper] ========================================`)
  console.log(`[v0] [BookingScraper] Scraping: ${hotelName}`)
  console.log(`[v0] [BookingScraper] City: ${city}`)
  console.log(`[v0] [BookingScraper] Dates: ${checkIn} to ${checkOut}`)
  console.log(`[v0] [BookingScraper] URL: ${bookingUrl || "none"}`)

  // Method 0: Puppeteer with Bright Data (most reliable)
  try {
    console.log(`[v0] [BookingScraper] Method 0: Puppeteer with Bright Data`)
    const puppeteerResult = await scrapeWithPuppeteer(hotelName, city, checkIn, checkOut)

    if (puppeteerResult.price) {
      console.log(`[v0] [BookingScraper] SUCCESS with Puppeteer: ${puppeteerResult.price} ${puppeteerResult.currency}`)
      return {
        price: puppeteerResult.price,
        roomType: puppeteerResult.roomType,
        currency: puppeteerResult.currency,
        available: puppeteerResult.available,
        hasBreakfast: false,
        source: "puppeteer-brightdata",
      }
    }
    console.log(`[v0] [BookingScraper] Puppeteer returned no price, trying next method...`)
  } catch (error) {
    console.error(`[v0] [BookingScraper] Puppeteer failed:`, error)
  }

  // Method 1: Bright Data API (if token available)
  const apiToken = process.env.BRIGHT_DATA_API_TOKEN
  if (apiToken) {
    try {
      console.log(`[v0] [BookingScraper] Method 1: Bright Data API`)
      const result = await scrapeViaBrightDataAPI(hotelName, city, checkIn, checkOut, apiToken)
      if (result) {
        console.log(`[v0] [BookingScraper] SUCCESS with Bright Data API`)
        return result
      }
    } catch (error) {
      console.error(`[v0] [BookingScraper] Bright Data API failed:`, error)
    }
  }

  // Method 2: Booking.com Search API
  try {
    console.log(`[v0] [BookingScraper] Method 2: Booking.com Search API`)
    const result = await scrapeViaBookingSearchAPI(hotelName, city, checkIn, checkOut)
    if (result) {
      console.log(`[v0] [BookingScraper] SUCCESS with Search API`)
      return result
    }
  } catch (error) {
    console.error(`[v0] [BookingScraper] Search API failed:`, error)
  }

  // Method 3: Direct HTML with headers
  try {
    console.log(`[v0] [BookingScraper] Method 3: Direct HTML`)
    const result = await scrapeViaDirectHTML(hotelName, city, checkIn, checkOut)
    if (result) {
      console.log(`[v0] [BookingScraper] SUCCESS with Direct HTML`)
      return result
    }
  } catch (error) {
    console.error(`[v0] [BookingScraper] Direct HTML failed:`, error)
  }

  console.log(`[v0] [BookingScraper] All methods failed`)
  return null
}

// Alias for backwards compatibility
export async function scrapeBookingViaHtml(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  return scrapeBookingPrice(hotelName, city, checkIn, checkOut)
}
