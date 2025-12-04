/**
 * Vercel-compatible Puppeteer Scraper
 * 
 * This scraper is specifically designed to work on Vercel Serverless Functions
 * Uses:
 * - puppeteer-core (lightweight, no bundled browser)
 * - @sparticuz/chromium (minimal Chromium for serverless)
 * 
 * Compatible with Vercel's 250MB function size limit
 */

import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { BookingPriceResult } from './booking-scraper'

const isDevelopment = process.env.NODE_ENV === 'development'
const isVercel = !!process.env.VERCEL

/**
 * Get Chromium executable path based on environment
 */
async function getChromiumPath(): Promise<string> {
  if (isDevelopment) {
    // Local development - use system Chrome
    const puppeteerPkg = await import('puppeteer')
    return puppeteerPkg.default.executablePath()
  }
  
  // Production (Vercel) - use @sparticuz/chromium
  return await chromium.executablePath()
}

/**
 * Launch browser with Vercel-optimized settings
 */
async function launchBrowser() {
  const executablePath = await getChromiumPath()
  
  // Chromium args optimized for serverless
  const args = isDevelopment
    ? puppeteer.defaultArgs()
    : chromium.args

  console.log('[VercelPuppeteer] Launching browser...')
  console.log('[VercelPuppeteer] Environment:', isDevelopment ? 'Development' : 'Production')
  console.log('[VercelPuppeteer] Executable:', executablePath)

  const browser = await puppeteer.launch({
    args,
    executablePath,
    headless: chromium.headless || true,
    ignoreHTTPSErrors: true,
    // Additional settings for Vercel
    ...(isVercel ? {
      defaultViewport: chromium.defaultViewport,
    } : {})
  })

  console.log('[VercelPuppeteer] ✅ Browser launched successfully')
  return browser
}

/**
 * Scrape Booking.com with Vercel-optimized Puppeteer
 */
export async function scrapeBookingWithVercelPuppeteer(
  hotelUrl: string,
  checkIn: string,
  checkOut: string
): Promise<BookingPriceResult | null> {
  let browser = null
  
  try {
    console.log('[VercelPuppeteer] Starting scrape...')
    console.log('[VercelPuppeteer] URL:', hotelUrl)
    console.log('[VercelPuppeteer] Check-in:', checkIn)
    console.log('[VercelPuppeteer] Check-out:', checkOut)
    
    browser = await launchBrowser()
    const page = await browser.newPage()
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    
    // Add extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    })
    
    // Build URL with parameters
    const url = new URL(hotelUrl)
    url.searchParams.set('checkin', checkIn)
    url.searchParams.set('checkout', checkOut)
    url.searchParams.set('selected_currency', 'ILS')
    url.searchParams.set('group_adults', '2')
    url.searchParams.set('no_rooms', '1')
    
    console.log('[VercelPuppeteer] Navigating to:', url.toString())
    
    // Navigate with timeout
    await page.goto(url.toString(), {
      waitUntil: 'networkidle2',
      timeout: 30000
    })
    
    console.log('[VercelPuppeteer] Page loaded, extracting prices...')
    
    // Wait for price elements
    try {
      await page.waitForSelector('[data-testid*="price"], .priceDisplay, .bui-price-display', {
        timeout: 10000
      })
    } catch (e) {
      console.log('[VercelPuppeteer] ⚠️ Price selectors not found, trying to extract anyway')
    }
    
    // Extract prices from page
    const priceData = await page.evaluate(() => {
      const prices: number[] = []
      
      // Multiple selectors to find prices
      const selectors = [
        '[data-testid*="price"]',
        '.priceDisplay',
        '.bui-price-display__value',
        '[aria-label*="price"]',
        '.prco-ltr-right-align-helper',
      ]
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector)
        elements.forEach((el) => {
          const text = el.textContent || ''
          // Match ILS prices: ₪1,234 or ILS 1234
          const matches = text.match(/₪\s*([\d,]+)|ILS\s*([\d,]+)/i)
          if (matches) {
            const priceStr = (matches[1] || matches[2]).replace(/,/g, '')
            const price = parseFloat(priceStr)
            if (price >= 100 && price <= 50000 && !prices.includes(price)) {
              prices.push(price)
            }
          }
        })
      }
      
      // Get room type
      let roomType = 'Standard Room'
      const roomTypeEl = document.querySelector('[data-testid*="room-name"], .hprt-roomtype-bed')
      if (roomTypeEl) {
        roomType = roomTypeEl.textContent?.trim() || roomType
      }
      
      // Check for breakfast
      const hasBreakfast = document.body.innerHTML.toLowerCase().includes('breakfast') ||
                          document.body.innerHTML.toLowerCase().includes('ארוחת בוקר')
      
      return {
        prices: prices.sort((a, b) => a - b),
        roomType,
        hasBreakfast
      }
    })
    
    console.log('[VercelPuppeteer] Extracted:', priceData.prices.length, 'prices')
    
    if (priceData.prices.length === 0) {
      console.log('[VercelPuppeteer] ❌ No prices found')
      return null
    }
    
    const result: BookingPriceResult = {
      price: priceData.prices[0], // Lowest price
      currency: 'ILS',
      roomType: priceData.roomType,
      available: true,
      hasBreakfast: priceData.hasBreakfast,
      source: 'vercel_puppeteer',
    }
    
    console.log('[VercelPuppeteer] ✅ SUCCESS:', result)
    return result
    
  } catch (error: any) {
    console.error('[VercelPuppeteer] ❌ Error:', error.message)
    console.error('[VercelPuppeteer] Stack:', error.stack)
    return null
  } finally {
    if (browser) {
      await browser.close()
      console.log('[VercelPuppeteer] Browser closed')
    }
  }
}

/**
 * Scrape by hotel name and city (search first, then scrape)
 */
export async function scrapeBookingWithVercelPuppeteerSearch(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string
): Promise<BookingPriceResult | null> {
  let browser = null
  
  try {
    console.log('[VercelPuppeteer] Searching for:', hotelName, 'in', city)
    
    browser = await launchBrowser()
    const page = await browser.newPage()
    
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    
    // Go to Booking.com search page
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkIn}&checkout=${checkOut}&selected_currency=ILS&group_adults=2&no_rooms=1`
    
    console.log('[VercelPuppeteer] Searching:', searchUrl)
    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    })
    
    // Find hotel link
    const hotelLink = await page.evaluate((name) => {
      const links = Array.from(document.querySelectorAll('a[href*="/hotel/"]'))
      const found = links.find((a) => {
        const text = a.textContent || ''
        return text.toLowerCase().includes(name.toLowerCase())
      })
      return found ? (found as HTMLAnchorElement).href : null
    }, hotelName)
    
    await browser.close()
    browser = null
    
    if (!hotelLink) {
      console.log('[VercelPuppeteer] ❌ Hotel not found in search results')
      return null
    }
    
    console.log('[VercelPuppeteer] Found hotel URL:', hotelLink)
    
    // Now scrape the hotel page
    return await scrapeBookingWithVercelPuppeteer(hotelLink, checkIn, checkOut)
    
  } catch (error: any) {
    console.error('[VercelPuppeteer] ❌ Search error:', error.message)
    return null
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
