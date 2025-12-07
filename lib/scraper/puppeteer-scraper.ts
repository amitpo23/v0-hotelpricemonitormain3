// Puppeteer scraper using Bright Data Scraping Browser
// The browser runs on Bright Data servers, not on Vercel
import puppeteer from "puppeteer-core"

export interface PuppeteerScrapeResult {
  price: number | null
  roomType: string
  currency: string
  available: boolean
  source: string
  error?: string
}

function getBrightDataEndpoint(): string {
  const username = process.env.BRIGHT_DATA_USERNAME
  const password = process.env.BRIGHT_DATA_PASSWORD

  console.log(`[v0] [Puppeteer] BRIGHT_DATA_USERNAME set: ${!!username}`)
  console.log(`[v0] [Puppeteer] BRIGHT_DATA_PASSWORD set: ${!!password}`)

  if (username && password) {
    console.log(`[v0] [Puppeteer] Using username: ${username.substring(0, 40)}...`)
    return `wss://${username}:${password}@brd.superproxy.io:9222`
  }

  // User has scraping_browser3 with password sz74zisg17x5
  const defaultUsername = "brd-customer-hl_b8df3680-zone-scraping_browser3"
  const defaultPassword = "sz74zisg17x5"
  console.log(`[v0] [Puppeteer] Using default credentials for scraping_browser3`)
  return `wss://${defaultUsername}:${defaultPassword}@brd.superproxy.io:9222`
}

export async function scrapeWithPuppeteer(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<PuppeteerScrapeResult> {
  console.log(`[v0] [Puppeteer] Starting scrape for ${hotelName} in ${city}`)
  console.log(`[v0] [Puppeteer] Dates: ${checkIn} to ${checkOut}`)

  const wsEndpoint = getBrightDataEndpoint()

  if (!wsEndpoint) {
    console.log(`[v0] [Puppeteer] No Bright Data credentials configured`)
    return {
      price: null,
      roomType: "",
      currency: "ILS",
      available: false,
      source: "puppeteer",
      error: "Bright Data credentials not configured",
    }
  }

  console.log(`[v0] [Puppeteer] Using WebSocket endpoint: ${wsEndpoint.substring(0, 30)}...`)

  let browser = null

  try {
    // Connect to Bright Data Scraping Browser
    console.log(`[v0] [Puppeteer] Connecting to Bright Data browser...`)
    browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
    })
    console.log(`[v0] [Puppeteer] Connected!`)

    const page = await browser.newPage()

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    )

    // Build Booking.com search URL
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const searchUrl = buildBookingSearchUrl(hotelName, city, checkInDate, checkOutDate)

    console.log(`[v0] [Puppeteer] Navigating to: ${searchUrl}`)

    // Navigate to search page
    await page.goto(searchUrl, {
      waitUntil: "networkidle2",
      timeout: 45000,
    })

    console.log(`[v0] [Puppeteer] Page loaded, waiting for results...`)

    // Wait for search results
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 15000 }).catch(() => {
      console.log(`[v0] [Puppeteer] No property cards found, trying alternative selector`)
    })

    // Extract prices from search results
    const results = await page.evaluate(() => {
      const prices: { price: number; roomType: string; currency: string }[] = []

      // Try property cards first
      const propertyCards = document.querySelectorAll('[data-testid="property-card"]')
      console.log(`Found ${propertyCards.length} property cards`)

      propertyCards.forEach((card) => {
        const titleEl = card.querySelector('[data-testid="title"]')
        const priceEl = card.querySelector('[data-testid="price-and-discounted-price"]')

        if (priceEl) {
          const priceText = priceEl.textContent || ""
          // Extract price number
          const priceMatch = priceText.match(/[\d,]+/)
          if (priceMatch) {
            const price = Number.parseInt(priceMatch[0].replace(/,/g, ""), 10)
            // Detect currency
            let currency = "USD"
            if (priceText.includes("S$")) currency = "SGD"
            else if (priceText.includes("₪") || priceText.includes("ILS")) currency = "ILS"
            else if (priceText.includes("€")) currency = "EUR"

            prices.push({
              price,
              roomType: titleEl?.textContent?.trim() || "Standard Room",
              currency,
            })
          }
        }
      })

      // Try alternative price selectors if no results
      if (prices.length === 0) {
        const altPriceEls = document.querySelectorAll('[class*="price"], [class*="Price"], [data-testid*="price"]')
        altPriceEls.forEach((el) => {
          const text = el.textContent || ""
          const priceMatch = text.match(/[\d,]+/)
          if (priceMatch) {
            const price = Number.parseInt(priceMatch[0].replace(/,/g, ""), 10)
            if (price > 10 && price < 50000) {
              prices.push({
                price,
                roomType: "Standard Room",
                currency: text.includes("S$") ? "SGD" : text.includes("₪") ? "ILS" : "USD",
              })
            }
          }
        })
      }

      return prices
    })

    console.log(`[v0] [Puppeteer] Found ${results.length} prices`)

    await browser.close()
    browser = null

    if (results.length > 0) {
      // Return the lowest price
      const lowestPrice = results.reduce((min, r) => (r.price < min.price ? r : min), results[0])
      console.log(`[v0] [Puppeteer] SUCCESS! Lowest price: ${lowestPrice.price} ${lowestPrice.currency}`)

      return {
        price: lowestPrice.price,
        roomType: lowestPrice.roomType,
        currency: lowestPrice.currency,
        available: true,
        source: "puppeteer-brightdata",
      }
    }

    console.log(`[v0] [Puppeteer] No prices found`)
    return {
      price: null,
      roomType: "Unknown",
      currency: "USD",
      available: false,
      source: "puppeteer-brightdata",
      error: "No prices found on page",
    }
  } catch (error) {
    console.error(`[v0] [Puppeteer] Error:`, error)

    if (browser) {
      try {
        await browser.close()
      } catch (e) {
        console.error(`[v0] [Puppeteer] Error closing browser:`, e)
      }
    }

    return {
      price: null,
      roomType: "Unknown",
      currency: "USD",
      available: false,
      source: "puppeteer-brightdata",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

function buildBookingSearchUrl(hotelName: string, city: string, checkIn: Date, checkOut: Date): string {
  const formatDate = (d: Date) => d.toISOString().split("T")[0]

  const params = new URLSearchParams({
    ss: `${hotelName} ${city}`,
    checkin: formatDate(checkIn),
    checkout: formatDate(checkOut),
    group_adults: "2",
    no_rooms: "1",
    group_children: "0",
    selected_currency: "ILS",
  })

  return `https://www.booking.com/searchresults.html?${params.toString()}`
}
