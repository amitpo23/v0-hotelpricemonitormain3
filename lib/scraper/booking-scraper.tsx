// Real Booking.com scraper using Bright Data + Puppeteer
// Based on scraper_findings.md and scraper_v5.py

import { scrapeBookingBySearch, scrapeBookingByUrl } from './puppeteer-scraper'
import { 
  scrapeBookingBySearchAdvanced, 
  scrapeBookingByUrlAdvanced 
} from './advanced-puppeteer-scraper'

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

  // Try JSON patterns for Booking.com API responses
  const jsonPatterns = [/"grossPrice":\s*{\s*"value":\s*([\d.]+)/, /"totalPrice":\s*"?([\d,]+)/, /"price":\s*([\d.]+)/]

  for (const pattern of jsonPatterns) {
    const match = text.match(pattern)
    if (match) {
      const price = Number.parseFloat(match[1].replace(/,/g, ""))
      if (price > 50 && price < 100000) {
        return { price, currency: "ILS" }
      }
    }
  }

  return null
}

// Check if breakfast is included
function hasBreakfastIncluded(html: string): { included: boolean; optionalPrice?: number } {
  const breakfastIncludedPatterns = [/breakfast\s+included/i, /ארוחת בוקר כלולה/i, /כולל ארוחת בוקר/i]

  for (const pattern of breakfastIncludedPatterns) {
    if (pattern.test(html)) {
      return { included: true }
    }
  }

  return { included: false }
}

// Extract rooms left count
function extractRoomsLeft(html: string): number | undefined {
  const match = html.match(/We have (\d+) left/i) || html.match(/Only (\d+) (?:rooms? )?left/i)
  return match ? Number.parseInt(match[1]) : undefined
}

// Extract room name from HTML
function extractRoomName(html: string): string {
  const patterns = [
    /data-testid="title"[^>]*>([^<]+)/,
    /hprt-roomtype-name[^>]*>([^<]+)/,
    /"roomTypeName":\s*"([^"]+)"/,
    /class="room-name"[^>]*>([^<]+)/,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1].trim().length > 2) {
      return match[1].trim()
    }
  }

  return "Standard Room"
}

// Method 1: Bright Data Scraping Browser API (most reliable)
async function scrapeViaBrightDataAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  const host = process.env.BRIGHT_DATA_PROXY_HOST
  const port = process.env.BRIGHT_DATA_PROXY_PORT || "9515"
  const username = process.env.BRIGHT_DATA_USERNAME
  const password = process.env.BRIGHT_DATA_PASSWORD

  if (!host || !username || !password) {
    console.log("[BookingScraper] Bright Data credentials not configured")
    console.log("[BookingScraper] Host:", host ? "set" : "missing")
    console.log("[BookingScraper] Username:", username ? "set" : "missing")
    console.log("[BookingScraper] Password:", password ? "set" : "missing")
    return null
  }

  try {
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[BookingScraper] Scraping: ${hotelName} in ${city}`)
    console.log(`[BookingScraper] URL: ${searchUrl}`)
    console.log(`[BookingScraper] Using Bright Data proxy: ${host}:${port}`)

    // Use Bright Data proxy through their API endpoint
    const proxyUrl = `http://${username}:${password}@${host}:${port}`

    // Make request through Bright Data's Web Unlocker
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      // @ts-ignore - Next.js specific option for proxy
      agent: undefined,
    })

    if (!response.ok) {
      console.log(`[BookingScraper] Request failed with status: ${response.status}`)
      return null
    }

    const html = await response.text()
    console.log(`[BookingScraper] Got HTML response: ${html.length} bytes`)

    // Try to extract price
    const priceResult = parsePrice(html)

    if (priceResult && priceResult.price > 50) {
      const breakfast = hasBreakfastIncluded(html)
      const roomsLeft = extractRoomsLeft(html)
      const roomName = extractRoomName(html)

      console.log(`[BookingScraper] SUCCESS: Found price ${priceResult.currency} ${priceResult.price}`)

      return {
        price: priceResult.price,
        roomType: roomName,
        currency: priceResult.currency,
        available: true,
        hasBreakfast: breakfast.included,
        breakfastPrice: breakfast.optionalPrice,
        roomsLeft,
        source: "bright_data",
      }
    }

    console.log("[BookingScraper] No price found in HTML")
    return null
  } catch (error) {
    console.error("[BookingScraper] Error:", error)
    return null
  }
}

// Method 2: Direct fetch (may be blocked but worth trying)
async function scrapeDirectFetch(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[BookingScraper] Trying direct fetch for: ${hotelName}`)

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    })

    if (!response.ok) {
      console.log(`[BookingScraper] Direct fetch failed: ${response.status}`)
      return null
    }

    const html = await response.text()
    console.log(`[BookingScraper] Direct fetch got ${html.length} bytes`)

    const priceResult = parsePrice(html)

    if (priceResult && priceResult.price > 50) {
      console.log(`[BookingScraper] Direct fetch SUCCESS: ${priceResult.currency} ${priceResult.price}`)
      return {
        price: priceResult.price,
        roomType: extractRoomName(html),
        currency: priceResult.currency,
        available: true,
        hasBreakfast: hasBreakfastIncluded(html).included,
        source: "direct_fetch",
      }
    }

    return null
  } catch (error) {
    console.error("[BookingScraper] Direct fetch error:", error)
    return null
  }
}

// Method 3: Direct URL scraping - now with Advanced Puppeteer!
export async function scrapeBookingViaHtml(
  hotelUrl: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult[]> {
  console.log(`[BookingScraper] Scraping direct URL: ${hotelUrl}`)

  // Try Advanced Puppeteer first (with proxy)
  try {
    console.log('[BookingScraper] 🚀 Trying Advanced Puppeteer with proxy for direct URL...')
    const advancedResults = await scrapeBookingByUrlAdvanced(hotelUrl, checkIn, checkOut, true)
    if (advancedResults.length > 0) {
      console.log(`[BookingScraper] ✅ SUCCESS with Advanced Puppeteer+Proxy: found ${advancedResults.length} prices`)
      return advancedResults
    }
  } catch (error) {
    console.log('[BookingScraper] Advanced Puppeteer with proxy failed for URL:', error)
  }

  // Try Advanced Puppeteer without proxy
  try {
    console.log('[BookingScraper] 🚀 Trying Advanced Puppeteer without proxy for direct URL...')
    const advancedResults = await scrapeBookingByUrlAdvanced(hotelUrl, checkIn, checkOut, false)
    if (advancedResults.length > 0) {
      console.log(`[BookingScraper] ✅ SUCCESS with Advanced Puppeteer (no proxy): found ${advancedResults.length} prices`)
      return advancedResults
    }
  } catch (error) {
    console.log('[BookingScraper] Advanced Puppeteer without proxy failed for URL:', error)
  }

  // Try standard Puppeteer (with proxy)
  try {
    console.log('[BookingScraper] 🔄 Trying Standard Puppeteer with proxy for direct URL...')
    const puppeteerResults = await scrapeBookingByUrl(hotelUrl, checkIn, checkOut, true)
    if (puppeteerResults.length > 0) {
      console.log(`[BookingScraper] ✅ SUCCESS with Standard Puppeteer+Proxy: found ${puppeteerResults.length} prices`)
      return puppeteerResults
    }
  } catch (error) {
    console.log('[BookingScraper] Standard Puppeteer with proxy failed for URL:', error)
  }

  // Try standard Puppeteer without proxy
  try {
    console.log('[BookingScraper] 🔄 Trying Standard Puppeteer without proxy for direct URL...')
    const puppeteerResults = await scrapeBookingByUrl(hotelUrl, checkIn, checkOut, false)
    if (puppeteerResults.length > 0) {
      console.log(`[BookingScraper] ✅ SUCCESS with Standard Puppeteer (no proxy): found ${puppeteerResults.length} prices`)
      return puppeteerResults
    }
  } catch (error) {
    console.log('[BookingScraper] Standard Puppeteer without proxy failed for URL:', error)
  }

  // Fallback to direct fetch
  try {
    // Add dates to the URL
    const url = new URL(hotelUrl)
    url.searchParams.set("checkin", checkIn)
    url.searchParams.set("checkout", checkOut)
    url.searchParams.set("selected_currency", "ILS")
    url.searchParams.set("lang", "en-us")
    url.searchParams.set("group_adults", "2")
    url.searchParams.set("no_rooms", "1")

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    })

    if (!response.ok) {
      console.log(`[BookingScraper] Direct URL fetch failed: ${response.status}`)
      return []
    }

    const html = await response.text()
    console.log(`[BookingScraper] Got ${html.length} bytes from direct URL`)

    const results: BookingPriceResult[] = []
    const priceResult = parsePrice(html)

    if (priceResult && priceResult.price > 50) {
      results.push({
        price: priceResult.price,
        roomType: extractRoomName(html),
        currency: priceResult.currency,
        available: true,
        hasBreakfast: hasBreakfastIncluded(html).included,
        source: "direct_url",
      })
      console.log(`[BookingScraper] Found price from URL: ${priceResult.currency} ${priceResult.price}`)
    }

    return results
  } catch (error) {
    console.error("[BookingScraper] Error scraping URL:", error)
    return []
  }
}

// Main scrape function - tries multiple methods
export async function scrapeBookingPrice(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  console.log(`[BookingScraper] Starting scrape for ${hotelName} in ${city}`)
  console.log(`[BookingScraper] Dates: ${checkIn} to ${checkOut}`)

  // Method 1: Try Advanced Puppeteer with Bright Data proxy (MOST RELIABLE)
  try {
    console.log('[BookingScraper] 🚀 Method 1: Advanced Puppeteer with Bright Data proxy...')
    const advancedResult = await scrapeBookingBySearchAdvanced(hotelName, city, checkIn, checkOut, true)
    if (advancedResult) {
      console.log(`[BookingScraper] ✅ SUCCESS with Advanced Puppeteer+Proxy: ${advancedResult.currency} ${advancedResult.price}`)
      return advancedResult
    }
  } catch (error) {
    console.log('[BookingScraper] Advanced Puppeteer with proxy failed:', error)
  }

  // Method 2: Try Advanced Puppeteer without proxy
  try {
    console.log('[BookingScraper] 🚀 Method 2: Advanced Puppeteer without proxy...')
    const advancedNoProxyResult = await scrapeBookingBySearchAdvanced(hotelName, city, checkIn, checkOut, false)
    if (advancedNoProxyResult) {
      console.log(`[BookingScraper] ✅ SUCCESS with Advanced Puppeteer (no proxy): ${advancedNoProxyResult.currency} ${advancedNoProxyResult.price}`)
      return advancedNoProxyResult
    }
  } catch (error) {
    console.log('[BookingScraper] Advanced Puppeteer without proxy failed:', error)
  }

  // Method 3: Try standard Puppeteer with Bright Data proxy
  try {
    console.log('[BookingScraper] 🔄 Method 3: Standard Puppeteer with Bright Data proxy...')
    const puppeteerResult = await scrapeBookingBySearch(hotelName, city, checkIn, checkOut, true)
    if (puppeteerResult) {
      console.log(`[BookingScraper] ✅ SUCCESS with Standard Puppeteer+Proxy: ${puppeteerResult.currency} ${puppeteerResult.price}`)
      return puppeteerResult
    }
  } catch (error) {
    console.log('[BookingScraper] Standard Puppeteer with proxy failed:', error)
  }

  // Method 4: Try standard Puppeteer without proxy
  try {
    console.log('[BookingScraper] 🔄 Method 4: Standard Puppeteer without proxy...')
    const puppeteerNoProxyResult = await scrapeBookingBySearch(hotelName, city, checkIn, checkOut, false)
    if (puppeteerNoProxyResult) {
      console.log(`[BookingScraper] ✅ SUCCESS with Standard Puppeteer (no proxy): ${puppeteerNoProxyResult.currency} ${puppeteerNoProxyResult.price}`)
      return puppeteerNoProxyResult
    }
  } catch (error) {
    console.log('[BookingScraper] Standard Puppeteer without proxy failed:', error)
  }

  // Method 5: Try Bright Data API (legacy method)
  console.log('[BookingScraper] 🔄 Method 5: Bright Data API...')
  const brightDataResult = await scrapeViaBrightDataAPI(hotelName, city, checkIn, checkOut)
  if (brightDataResult) {
    return brightDataResult
  }

  // Method 6: Fallback to direct fetch
  console.log('[BookingScraper] 🔄 Method 6: Direct fetch...')
  const directResult = await scrapeDirectFetch(hotelName, city, checkIn, checkOut)
  if (directResult) {
    return directResult
  }

  console.log(`[BookingScraper] ❌ All 6 methods failed for ${hotelName}`)
  return null
}
