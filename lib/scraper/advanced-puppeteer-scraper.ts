/**
 * Advanced Puppeteer Scraper with Anti-Bot Evasion
 * Uses multiple techniques to bypass bot detection
 */

import puppeteer from 'puppeteer'
import { BookingPriceResult } from './booking-scraper'

interface ProxyConfig {
  host: string
  port: string
  username: string
  password: string
}

function getProxyConfig(): ProxyConfig | null {
  const host = process.env.BRIGHT_DATA_PROXY_HOST
  const port = process.env.BRIGHT_DATA_PROXY_PORT || '22225'
  const username = process.env.BRIGHT_DATA_USERNAME
  const password = process.env.BRIGHT_DATA_PASSWORD

  if (!host || !username || !password) {
    return null
  }

  return { host, port, username, password }
}

// Enhanced anti-bot detection evasion
const STEALTH_CONFIG = `
// Overwrite the navigator.webdriver property
Object.defineProperty(navigator, 'webdriver', {
  get: () => false,
});

// Mock chrome runtime
window.navigator.chrome = {
  runtime: {},
};

// Mock permissions
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
  parameters.name === 'notifications' ?
    Promise.resolve({ state: Notification.permission }) :
    originalQuery(parameters)
);

// Mock plugins
Object.defineProperty(navigator, 'plugins', {
  get: () => [1, 2, 3, 4, 5],
});

// Mock languages
Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en'],
});
`

export async function scrapeBookingAdvanced(
  url: string,
  options: {
    useProxy?: boolean
    headless?: boolean
    timeout?: number
  } = {}
): Promise<BookingPriceResult[]> {
  const {
    useProxy = true,
    headless = true,
    timeout = 30000,
  } = options

  console.log(`[AdvancedScraper] Starting scrape: ${url.substring(0, 80)}...`)
  console.log(`[AdvancedScraper] Proxy: ${useProxy}, Headless: ${headless}`)

  const proxyConfig = getProxyConfig()
  
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
  ]

  if (useProxy && proxyConfig) {
    args.push(`--proxy-server=http://${proxyConfig.host}:${proxyConfig.port}`)
    console.log(`[AdvancedScraper] Using proxy: ${proxyConfig.host}:${proxyConfig.port}`)
  }

  const browser = await puppeteer.launch({
    headless,
    args,
    ignoreHTTPSErrors: true,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  })

  let results: BookingPriceResult[] = []

  try {
    const page = await browser.newPage()

    // Authenticate with proxy if needed
    if (useProxy && proxyConfig) {
      await page.authenticate({
        username: proxyConfig.username,
        password: proxyConfig.password,
      })
    }

    // Inject stealth scripts
    await page.evaluateOnNewDocument(STEALTH_CONFIG)

    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    })

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    )

    console.log('[AdvancedScraper] Navigating to page...')

    // Navigate with timeout
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    })

    console.log('[AdvancedScraper] Page loaded, waiting for content...')

    // Wait for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Check if we're blocked
    const title = await page.title()
    console.log(`[AdvancedScraper] Page title: ${title}`)

    if (title.toLowerCase().includes('captcha') || title.toLowerCase().includes('robot')) {
      console.log('[AdvancedScraper] ⚠️ CAPTCHA or bot detection triggered')
      await browser.close()
      return []
    }

    // Take screenshot for debugging
    try {
      await page.screenshot({ path: '/home/user/webapp/debug-screenshot.png' })
      console.log('[AdvancedScraper] Screenshot saved to debug-screenshot.png')
    } catch (e) {
      // Ignore screenshot errors
    }

    // Try multiple extraction strategies
    console.log('[AdvancedScraper] Extracting prices...')

    // Strategy 1: Look for price in data attributes
    const dataAttributePrices = await page.evaluate(() => {
      const results: Array<{ price: string; roomType: string }> = []
      
      // Find elements with data-price attributes
      const priceElements = document.querySelectorAll('[data-price], [data-testid*="price"]')
      priceElements.forEach(el => {
        const priceText = el.textContent || el.getAttribute('data-price') || ''
        if (priceText && /\d{2,}/.test(priceText)) {
          results.push({
            price: priceText,
            roomType: 'Standard Room'
          })
        }
      })
      
      return results
    })

    // Strategy 2: Look for prices in specific Booking.com selectors
    const bookingPrices = await page.evaluate(() => {
      const results: Array<{ price: string; roomType: string }> = []
      
      const priceSelectors = [
        '[data-testid="price-and-discounted-price"]',
        '[data-testid="price-for-x-nights"]',
        '.prco-valign-middle-helper',
        '.bui-price-display__value',
        '.prco-text-nowrap-helper',
        'span[aria-hidden="true"]',
        '.hprt-price-price',
      ]

      const roomSelectors = [
        '[data-testid="title"]',
        '.hprt-roomtype-icon-link',
        '.hprt-roomtype-name-link',
      ]

      // Try to find room blocks
      const roomBlocks = document.querySelectorAll('[data-block-id], .hprt-table-row')
      
      roomBlocks.forEach(block => {
        let priceText = ''
        let roomName = 'Standard Room'

        // Find price in this block
        for (const selector of priceSelectors) {
          const priceElem = block.querySelector(selector)
          if (priceElem && priceElem.textContent && /\d{2,}/.test(priceElem.textContent)) {
            priceText = priceElem.textContent.trim()
            break
          }
        }

        // Find room name
        for (const selector of roomSelectors) {
          const roomElem = block.querySelector(selector)
          if (roomElem && roomElem.textContent && roomElem.textContent.trim().length > 2) {
            roomName = roomElem.textContent.trim()
            break
          }
        }

        if (priceText) {
          results.push({ price: priceText, roomType: roomName })
        }
      })

      return results
    })

    // Strategy 3: Brute force - find any text that looks like a price
    const bruteForcePrices = await page.evaluate(() => {
      const results: Array<{ price: string; roomType: string }> = []
      
      // Look for any element with price-like content
      const allText = document.body.innerText
      
      // Patterns that look like prices
      const pricePatterns = [
        /₪\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
        /ILS\s*(\d{1,3}(?:,\d{3})*)/g,
        /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*₪/g,
      ]

      for (const pattern of pricePatterns) {
        let match
        while ((match = pattern.exec(allText)) !== null) {
          const price = match[0]
          if (price) {
            results.push({ price, roomType: 'Standard Room' })
          }
        }
      }

      return results.slice(0, 10) // Limit to 10 to avoid duplicates
    })

    // Combine all strategies
    const allPrices = [...dataAttributePrices, ...bookingPrices, ...bruteForcePrices]
    console.log(`[AdvancedScraper] Found ${allPrices.length} price candidates`)

    // Parse and validate prices
    for (const item of allPrices) {
      const parsed = parsePrice(item.price)
      if (parsed && parsed.price > 50 && parsed.price < 50000) {
        results.push({
          price: parsed.price,
          currency: parsed.currency,
          roomType: item.roomType,
          available: true,
          hasBreakfast: item.roomType.toLowerCase().includes('breakfast'),
          source: 'advanced_puppeteer',
        })
      }
    }

    // Remove duplicates (same price)
    const uniquePrices = results.filter((item, index, self) =>
      index === self.findIndex((t) => t.price === item.price)
    )

    console.log(`[AdvancedScraper] Extracted ${uniquePrices.length} valid unique prices`)

    await browser.close()
    return uniquePrices

  } catch (error) {
    console.error('[AdvancedScraper] Error:', error)
    await browser.close()
    return []
  }
}

function parsePrice(text: string): { price: number; currency: string } | null {
  if (!text) return null

  // Remove most non-numeric characters but keep currency symbols
  const cleaned = text.replace(/[^\d.,₪$€ILS]/g, '')
  
  // Extract numbers
  const patterns = [
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    /([\d.]+)/,
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
      const priceStr = match[1].replace(/,/g, '')
      const price = parseFloat(priceStr)
      
      if (price > 50 && price < 100000) {
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

// Wrapper functions for compatibility
export async function scrapeBookingByUrlAdvanced(
  hotelUrl: string,
  checkIn: string,
  checkOut: string,
  useProxy: boolean = true
): Promise<BookingPriceResult[]> {
  const url = new URL(hotelUrl)
  url.searchParams.set('checkin', checkIn)
  url.searchParams.set('checkout', checkOut)
  url.searchParams.set('selected_currency', 'ILS')
  url.searchParams.set('group_adults', '2')
  url.searchParams.set('no_rooms', '1')

  return scrapeBookingAdvanced(url.toString(), { useProxy })
}

export async function scrapeBookingBySearchAdvanced(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
  useProxy: boolean = true
): Promise<BookingPriceResult | null> {
  const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
    hotelName + ' ' + city
  )}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&lang=en-us&group_adults=2&no_rooms=1`

  const results = await scrapeBookingAdvanced(searchUrl, { useProxy })
  
  return results.length > 0 ? results[0] : null
}
