/**
 * Puppeteer-based Booking.com Scraper with Bright Data Proxy Support
 * 
 * This scraper uses Puppeteer to scrape Booking.com prices with:
 * - Bright Data proxy support for bypassing anti-bot measures
 * - Multiple fallback methods
 * - Robust error handling
 * - Price extraction from multiple selectors
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import { BookingPriceResult } from './booking-scraper'

interface ProxyConfig {
  host: string
  port: string
  username: string
  password: string
}

// Get proxy configuration from environment
function getProxyConfig(): ProxyConfig | null {
  const host = process.env.BRIGHT_DATA_PROXY_HOST
  const port = process.env.BRIGHT_DATA_PROXY_PORT || '22225'
  const username = process.env.BRIGHT_DATA_USERNAME
  const password = process.env.BRIGHT_DATA_PASSWORD

  if (!host || !username || !password) {
    console.log('[PuppeteerScraper] Bright Data proxy not configured')
    return null
  }

  return { host, port, username, password }
}

// Parse price from text
function parsePrice(text: string): { price: number; currency: string } | null {
  if (!text) return null

  // Remove common non-numeric characters
  const cleaned = text.replace(/[^\d.,₪$€ILS]/g, '')
  
  // Try to extract price
  const patterns = [
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,  // e.g., 1,234.56 or 234.56
    /([\d.]+)/,  // fallback to any number
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
      const priceStr = match[1].replace(/,/g, '')
      const price = parseFloat(priceStr)
      
      if (price > 50 && price < 100000) {
        // Detect currency
        let currency = 'ILS'
        if (text.includes('₪') || text.includes('ILS')) {
          currency = 'ILS'
        } else if (text.includes('$') || text.includes('USD')) {
          currency = 'USD'
        } else if (text.includes('€') || text.includes('EUR')) {
          currency = 'EUR'
        }
        
        return { price, currency }
      }
    }
  }

  return null
}

// Launch browser with or without proxy
async function launchBrowser(useProxy: boolean = true): Promise<Browser> {
  const proxyConfig = getProxyConfig()
  
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
    '--disable-blink-features=AutomationControlled',
  ]

  // Add proxy if configured and requested
  if (useProxy && proxyConfig) {
    args.push(`--proxy-server=http://${proxyConfig.host}:${proxyConfig.port}`)
    console.log(`[PuppeteerScraper] Using Bright Data proxy: ${proxyConfig.host}:${proxyConfig.port}`)
  } else {
    console.log('[PuppeteerScraper] Launching browser without proxy')
  }

  const browser = await puppeteer.launch({
    headless: true,
    args,
    ignoreHTTPSErrors: true,
  })

  return browser
}

// Setup page with authentication for Bright Data
async function setupPage(page: Page, useProxy: boolean): Promise<void> {
  const proxyConfig = getProxyConfig()
  
  // Authenticate with proxy if needed
  if (useProxy && proxyConfig) {
    await page.authenticate({
      username: proxyConfig.username,
      password: proxyConfig.password,
    })
  }

  // Set realistic viewport and user agent
  await page.setViewport({ width: 1920, height: 1080 })
  
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )

  // Set extra headers to look more like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  })

  // Remove webdriver flags
  await page.evaluateOnNewDocument(() => {
    // @ts-ignore
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    })
    // @ts-ignore
    window.navigator.chrome = {
      runtime: {},
    }
  })
}

// Extract prices from page
async function extractPrices(page: Page): Promise<BookingPriceResult[]> {
  console.log('[PuppeteerScraper] Extracting prices from page...')

  try {
    // Wait for price elements to load
    await page.waitForSelector('div[data-testid="property-card"], [data-testid="availability-table"]', {
      timeout: 10000,
    }).catch(() => {
      console.log('[PuppeteerScraper] No property cards found, trying alternative selectors')
    })

    // Extract all price elements
    const prices = await page.evaluate(() => {
      const results: Array<{ price: string; roomType: string }> = []

      // Try multiple price selectors
      const priceSelectors = [
        '[data-testid="price-and-discounted-price"]',
        '[data-testid="price-for-x-nights"]',
        '.prco-valign-middle-helper',
        '.bui-price-display__value',
        'span[aria-hidden="true"]',
        '.prco-text-nowrap-helper',
      ]

      const roomSelectors = [
        '[data-testid="title"]',
        '.hprt-roomtype-icon-link',
        '[data-testid="room-name"]',
        '.hprt-roomtype-name-link',
      ]

      // Get all property cards or room blocks
      const cards = document.querySelectorAll(
        'div[data-testid="property-card"], [data-block-id], .hprt-table-row, tr[data-block-id]'
      )

      cards.forEach((card) => {
        let priceText = ''
        let roomName = 'Standard Room'

        // Try to find price
        for (const selector of priceSelectors) {
          const priceElem = card.querySelector(selector)
          if (priceElem && priceElem.textContent) {
            priceText = priceElem.textContent.trim()
            if (priceText && /\d/.test(priceText)) {
              break
            }
          }
        }

        // Try to find room name
        for (const selector of roomSelectors) {
          const roomElem = card.querySelector(selector)
          if (roomElem && roomElem.textContent && roomElem.textContent.trim().length > 2) {
            roomName = roomElem.textContent.trim()
            break
          }
        }

        if (priceText && /\d/.test(priceText)) {
          results.push({ price: priceText, roomType: roomName })
        }
      })

      return results
    })

    console.log(`[PuppeteerScraper] Found ${prices.length} potential price elements`)

    // Parse and filter prices
    const validPrices: BookingPriceResult[] = []
    
    for (const item of prices) {
      const parsed = parsePrice(item.price)
      if (parsed && parsed.price > 50) {
        validPrices.push({
          price: parsed.price,
          currency: parsed.currency,
          roomType: item.roomType,
          available: true,
          hasBreakfast: item.roomType.toLowerCase().includes('breakfast'),
          source: 'puppeteer',
        })
      }
    }

    console.log(`[PuppeteerScraper] Extracted ${validPrices.length} valid prices`)
    
    return validPrices
  } catch (error) {
    console.error('[PuppeteerScraper] Error extracting prices:', error)
    return []
  }
}

// Main scrape function
export async function scrapePuppeteer(
  url: string,
  useProxy: boolean = true
): Promise<BookingPriceResult[]> {
  console.log(`[PuppeteerScraper] Starting scrape for URL: ${url}`)
  console.log(`[PuppeteerScraper] Proxy enabled: ${useProxy}`)

  let browser: Browser | null = null
  
  try {
    browser = await launchBrowser(useProxy)
    const page = await browser.newPage()
    await setupPage(page, useProxy)

    console.log(`[PuppeteerScraper] Navigating to: ${url}`)
    
    // Navigate with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    console.log('[PuppeteerScraper] Page loaded successfully')

    // Check if we got blocked
    const title = await page.title()
    if (title.toLowerCase().includes('captcha') || title.toLowerCase().includes('robot')) {
      console.log('[PuppeteerScraper] ⚠️ Detected CAPTCHA or bot detection')
      return []
    }

    // Extract prices
    const prices = await extractPrices(page)

    await browser.close()
    
    return prices
  } catch (error) {
    console.error('[PuppeteerScraper] Error during scrape:', error)
    
    if (browser) {
      await browser.close().catch(() => {})
    }
    
    return []
  }
}

// Scrape hotel by search (name + city)
export async function scrapeBookingBySearch(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
  useProxy: boolean = true
): Promise<BookingPriceResult | null> {
  const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
    hotelName + ' ' + city
  )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

  console.log(`[PuppeteerScraper] Searching for: ${hotelName} in ${city}`)
  
  const results = await scrapePuppeteer(searchUrl, useProxy)
  
  if (results.length > 0) {
    console.log(`[PuppeteerScraper] ✅ Found ${results.length} prices, returning first one`)
    return results[0]
  }

  console.log('[PuppeteerScraper] ❌ No prices found')
  return null
}

// Scrape hotel by direct URL
export async function scrapeBookingByUrl(
  hotelUrl: string,
  checkIn: string,
  checkOut: string,
  useProxy: boolean = true
): Promise<BookingPriceResult[]> {
  // Add dates to URL
  const url = new URL(hotelUrl)
  url.searchParams.set('checkin', checkIn)
  url.searchParams.set('checkout', checkOut)
  url.searchParams.set('selected_currency', 'ILS')
  url.searchParams.set('group_adults', '2')
  url.searchParams.set('no_rooms', '1')

  console.log(`[PuppeteerScraper] Scraping hotel URL: ${url.toString()}`)
  
  return await scrapePuppeteer(url.toString(), useProxy)
}
