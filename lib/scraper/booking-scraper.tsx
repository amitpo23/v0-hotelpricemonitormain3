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

// Extract prices from HTML using multiple patterns
function extractPricesFromHTML(html: string): number[] {
  const prices: number[] = []

  const patterns = [
    // Data-testid patterns
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
  ]

  for (const pattern of patterns) {
    let match
    const regex = new RegExp(pattern.source, pattern.flags)
    while ((match = regex.exec(html)) !== null) {
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

// Method 1: Booking.com Search API (free, no proxy)
async function scrapeViaBookingSearchAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    console.log(`[v0] [BookingScraper] Method 1: Booking.com Search API for ${hotelName}`)

    const searchUrl = `https://www.booking.com/autocomplete/api/v1/results?query=${encodeURIComponent(
      hotelName + " " + city,
    )}&lang=en-us&sb=1&src=searchresults`

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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

    let hotelSlug = null

    if (searchData?.results) {
      for (const result of searchData.results) {
        if (result.dest_type === "hotel" || result.type === "ho") {
          hotelSlug = result.b_hotel_url || result.url
          console.log(`[v0] [BookingScraper] Found: ${result.label}`)
          break
        }
      }
    }

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

// Method 2: Direct HTML scrape
async function scrapeViaDirectHTML(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    console.log(`[v0] [BookingScraper] Method 2: Direct HTML scrape`)

    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    })

    if (!response.ok) {
      console.log(`[v0] [BookingScraper] Direct HTML failed: ${response.status}`)
      return null
    }

    const html = await response.text()
    console.log(`[v0] [BookingScraper] Got HTML: ${html.length} bytes`)

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

    return null
  } catch (error) {
    console.error("[v0] [BookingScraper] Direct HTML error:", error)
    return null
  }
}

const BRIGHT_DATA_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN || "8f5159d5-2a68-4337-aee4-000587559bda"
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "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"

async function scrapeViaTavily(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    console.log(`[v0] [BookingScraper] Method: Tavily Search for ${hotelName}`)

    const searchQuery = `${hotelName} ${city} booking.com price ${checkIn} to ${checkOut}`

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
      console.log(`[v0] [BookingScraper] Tavily error: ${errorText}`)
      return null
    }

    const data = await response.json()
    console.log(`[v0] [BookingScraper] Tavily results: ${data.results?.length || 0}`)

    // Extract prices from Tavily results
    const allPrices: number[] = []

    if (data.results) {
      for (const result of data.results) {
        // Check raw content for prices
        if (result.raw_content) {
          const prices = extractPricesFromHTML(result.raw_content)
          allPrices.push(...prices)
        }
        // Check content snippet
        if (result.content) {
          const priceMatch = result.content.match(/[₪$]?\s*([\d,]+)\s*(ILS|USD|per night|לילה)/gi)
          if (priceMatch) {
            for (const match of priceMatch) {
              const numStr = match.replace(/[^\d]/g, "")
              const price = Number.parseInt(numStr, 10)
              if (price > 100 && price < 50000) {
                allPrices.push(price)
              }
            }
          }
        }
      }
    }

    // Also check answer if available
    if (data.answer) {
      const answerPrices = data.answer.match(/[₪$]?\s*([\d,]+)\s*(ILS|USD|per night|לילה)/gi)
      if (answerPrices) {
        for (const match of answerPrices) {
          const numStr = match.replace(/[^\d]/g, "")
          const price = Number.parseInt(numStr, 10)
          if (price > 100 && price < 50000) {
            allPrices.push(price)
          }
        }
      }
    }

    const uniquePrices = [...new Set(allPrices)].sort((a, b) => a - b)
    console.log(`[v0] [BookingScraper] Tavily extracted prices: ${uniquePrices.slice(0, 5).join(", ")}`)

    if (uniquePrices.length > 0) {
      console.log(`[v0] [BookingScraper] SUCCESS via Tavily: ${uniquePrices[0]} ILS`)
      return {
        price: uniquePrices[0],
        roomType: "Standard Room",
        currency: "ILS",
        available: true,
        hasBreakfast: false,
        source: "tavily_search",
      }
    }

    return null
  } catch (error) {
    console.error("[v0] [BookingScraper] Tavily error:", error)
    return null
  }
}

// New Method: Bright Data Web Unlocker API
async function scrapeViaBrightDataAPI(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<BookingPriceResult | null> {
  try {
    console.log(`[v0] [BookingScraper] Method: Bright Data API for ${hotelName}`)

    const targetUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      hotelName + " " + city,
    )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

    console.log(`[v0] [BookingScraper] Target URL: ${targetUrl}`)

    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        zone: "web_unlocker1",
        url: targetUrl,
        format: "raw",
      }),
    })

    console.log(`[v0] [BookingScraper] Bright Data API status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] [BookingScraper] Bright Data API error: ${errorText}`)
      return null
    }

    const html = await response.text()
    console.log(`[v0] [BookingScraper] Got HTML via Bright Data: ${html.length} bytes`)

    if (html.length < 5000) {
      console.log(`[v0] [BookingScraper] HTML too short, likely blocked`)
      return null
    }

    const prices = extractPricesFromHTML(html)
    console.log(`[v0] [BookingScraper] Extracted ${prices.length} prices: ${prices.slice(0, 5).join(", ")}`)

    if (prices.length > 0) {
      console.log(`[v0] [BookingScraper] SUCCESS via Bright Data API: ${prices[0]} ILS`)
      return {
        price: prices[0],
        roomType: "Standard Room",
        currency: "ILS",
        available: true,
        hasBreakfast: false,
        source: "brightdata_api",
      }
    }

    return null
  } catch (error) {
    console.error("[v0] [BookingScraper] Bright Data API error:", error)
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

  try {
    console.log(`[v0] [BookingScraper] Method 0: Tavily Search`)
    const tavilyResult = await scrapeViaTavily(hotelName, city, checkIn, checkOut)
    if (tavilyResult) {
      return tavilyResult
    }
  } catch (error) {
    console.error(`[v0] [BookingScraper] Tavily failed:`, error)
  }

  // Method 1: Bright Data API
  try {
    console.log(`[v0] [BookingScraper] Method 1: Bright Data API`)
    const result = await scrapeViaBrightDataAPI(hotelName, city, checkIn, checkOut)
    if (result) {
      return result
    }
  } catch (error) {
    console.error(`[v0] [BookingScraper] Bright Data API failed:`, error)
  }

  // Method 2: Puppeteer with Bright Data Scraping Browser
  try {
    console.log(`[v0] [BookingScraper] Method 2: Puppeteer with Bright Data`)
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

  // Method 3: Booking.com Search API
  try {
    const result = await scrapeViaBookingSearchAPI(hotelName, city, checkIn, checkOut)
    if (result) {
      return result
    }
  } catch (error) {
    console.error(`[v0] [BookingScraper] Search API failed:`, error)
  }

  // Method 4: Direct HTML
  try {
    const result = await scrapeViaDirectHTML(hotelName, city, checkIn, checkOut)
    if (result) {
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
