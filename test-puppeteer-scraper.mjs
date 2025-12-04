/**
 * Test script for Puppeteer Scraper
 * Tests scraping a real Booking.com hotel
 */

import puppeteer from 'puppeteer'

// Test configuration
const TEST_HOTEL_URL = 'https://www.booking.com/hotel/il/david-intercontinental.html'
const CHECK_IN = '2025-01-15'
const CHECK_OUT = '2025-01-16'

console.log('🔧 Testing Puppeteer Scraper')
console.log('=' .repeat(60))
console.log(`Hotel URL: ${TEST_HOTEL_URL}`)
console.log(`Check-in: ${CHECK_IN}`)
console.log(`Check-out: ${CHECK_OUT}`)
console.log('=' .repeat(60))

// Parse price from text
function parsePrice(text) {
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

async function testScraper() {
  console.log('\n📍 Step 1: Launching browser...')
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  })

  console.log('✅ Browser launched')

  try {
    console.log('\n📍 Step 2: Creating new page...')
    const page = await browser.newPage()
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    console.log('✅ Page created')

    // Build URL with dates
    const url = new URL(TEST_HOTEL_URL)
    url.searchParams.set('checkin', CHECK_IN)
    url.searchParams.set('checkout', CHECK_OUT)
    url.searchParams.set('selected_currency', 'ILS')
    url.searchParams.set('group_adults', '2')
    url.searchParams.set('no_rooms', '1')

    console.log(`\n📍 Step 3: Navigating to: ${url.toString().substring(0, 100)}...`)
    
    await page.goto(url.toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    console.log('✅ Page loaded')

    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Check title
    const title = await page.title()
    console.log(`\n📄 Page title: ${title}`)

    if (title.toLowerCase().includes('captcha') || title.toLowerCase().includes('robot')) {
      console.log('⚠️  CAPTCHA detected! Bright Data proxy may be needed.')
    }

    console.log('\n📍 Step 4: Extracting prices...')

    // Wait for price elements
    try {
      await page.waitForSelector('[data-testid="price-and-discounted-price"], .prco-valign-middle-helper, .bui-price-display__value', {
        timeout: 10000,
      })
      console.log('✅ Price elements found')
    } catch (error) {
      console.log('⚠️  No price elements found with standard selectors, trying to extract anyway...')
    }

    // Extract prices
    const prices = await page.evaluate(() => {
      const results = []

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
      ]

      // Get all room blocks
      const cards = document.querySelectorAll(
        '[data-block-id], .hprt-table-row, tr[data-block-id]'
      )

      console.log(`Found ${cards.length} room blocks`)

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

    console.log(`\n✅ Found ${prices.length} price elements`)

    // Parse and display prices
    if (prices.length > 0) {
      console.log('\n💰 Extracted Prices:')
      console.log('=' .repeat(60))
      
      prices.slice(0, 5).forEach((item, index) => {
        const parsed = parsePrice(item.price)
        if (parsed) {
          console.log(`${index + 1}. ${item.roomType}`)
          console.log(`   Price: ${parsed.currency} ${parsed.price}`)
          console.log(`   Raw: ${item.price}`)
          console.log('')
        }
      })

      console.log('=' .repeat(60))
      console.log(`\n🎉 SUCCESS! Scraper is working!`)
      console.log(`Total prices found: ${prices.length}`)
    } else {
      console.log('\n❌ No prices found')
      console.log('This could mean:')
      console.log('1. The hotel has no availability for these dates')
      console.log('2. Booking.com is blocking the scraper')
      console.log('3. The page structure has changed')
      console.log('\n💡 Try using Bright Data proxy for better results')
    }

  } catch (error) {
    console.error('\n❌ Error during scrape:', error.message)
  } finally {
    await browser.close()
    console.log('\n✅ Browser closed')
  }
}

// Run test
testScraper().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
