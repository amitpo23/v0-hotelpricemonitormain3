/**
 * Real-Time Competitor Agent
 * Fetches current competitor prices from Booking.com and Expedia
 * Uses web scraping or APIs to get live pricing data
 */

import { createClient } from '@/lib/supabase/server'

interface CompetitorPrice {
  hotelName: string
  hotelId?: string
  platform: 'booking' | 'expedia' | 'airbnb' | 'agoda'
  price: number
  currency: string
  date: string // Check-in date
  roomType?: string
  availability: boolean
  url?: string
  scrapedAt: string
}

interface CompetitorAgentResult {
  targetHotelId: string
  targetDate: string
  location: string
  competitors: CompetitorPrice[]
  averagePrice: number
  minPrice: number
  maxPrice: number
  pricePosition: 'lowest' | 'below-average' | 'average' | 'above-average' | 'highest'
  marketTrend: 'high-demand' | 'moderate' | 'low-demand'
  pricingRecommendation: string
  confidence: number
  dataFreshness: 'real-time' | 'recent' | 'cached' | 'stale'
  source: 'scraper' | 'api' | 'database'
}

/**
 * Fetch competitor prices from Apify (Booking.com scraper)
 */
async function fetchCompetitorsFromApify(
  location: string,
  checkInDate: string,
  checkOutDate: string
): Promise<CompetitorPrice[]> {
  const apifyToken = process.env.APIFY_API_TOKEN

  if (!apifyToken) {
    console.warn('[CompetitorAgent] APIFY_API_TOKEN not set')
    return []
  }

  try {
    // Use Booking.com scraper actor
    const actorId = process.env.APIFY_ACTOR_ID || 'dtrungtin/booking-scraper'
    
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        search: location,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        currency: 'ILS',
        minPrice: 200,
        maxPrice: 2000,
        sortBy: 'popularity',
        maxItems: 20,
      }),
    })

    if (!runResponse.ok) {
      console.warn('[CompetitorAgent] Apify run failed:', runResponse.status)
      return []
    }

    const runData = await runResponse.json()
    const runId = runData.data.id

    // Wait for run to complete (with timeout)
    let attempts = 0
    const maxAttempts = 30 // 30 seconds max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const statusResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${apifyToken}`)
      const statusData = await statusResponse.json()
      
      if (statusData.data.status === 'SUCCEEDED') {
        // Fetch results
        const resultsResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}/dataset/items?token=${apifyToken}`)
        const results = await resultsResponse.json()
        
        return results.map((hotel: any) => ({
          hotelName: hotel.name,
          hotelId: hotel.id,
          platform: 'booking' as const,
          price: Number(hotel.price),
          currency: hotel.currency || 'ILS',
          date: checkInDate,
          roomType: hotel.roomType,
          availability: hotel.available !== false,
          url: hotel.url,
          scrapedAt: new Date().toISOString(),
        }))
      }
      
      if (statusData.data.status === 'FAILED' || statusData.data.status === 'ABORTED') {
        console.warn('[CompetitorAgent] Apify run failed')
        break
      }
      
      attempts++
    }

    console.warn('[CompetitorAgent] Apify run timeout')
    return []

  } catch (error) {
    console.error('[CompetitorAgent] Apify error:', error)
    return []
  }
}

/**
 * Fetch competitor prices from database (recent scans)
 */
async function fetchCompetitorsFromDB(
  location: string,
  targetDate: string,
  maxAgeHours: number = 24
): Promise<CompetitorPrice[]> {
  try {
    const supabase = await createClient()
    
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours)
    const cutoffStr = cutoffTime.toISOString()

    const { data: scans, error } = await supabase
      .from('scan_results')
      .select('hotel_id, hotel_name, platform, price, date, created_at')
      .eq('date', targetDate)
      .gte('created_at', cutoffStr)
      .order('created_at', { ascending: false })

    if (error || !scans) {
      console.log('[CompetitorAgent] No recent scans in database')
      return []
    }

    return scans.map(scan => ({
      hotelName: scan.hotel_name,
      hotelId: scan.hotel_id,
      platform: scan.platform as 'booking' | 'expedia',
      price: Number(scan.price),
      currency: 'ILS',
      date: scan.date,
      availability: true,
      scrapedAt: scan.created_at,
    }))

  } catch (error) {
    console.error('[CompetitorAgent] Database error:', error)
    return []
  }
}

/**
 * Get competitor URLs for a hotel
 */
async function getCompetitorUrls(hotelId: string): Promise<Array<{ name: string; url: string; platform: string }>> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('competitors')
      .select('competitor_name, booking_url, expedia_url')
      .eq('hotel_id', hotelId)

    if (error || !data) {
      return []
    }

    const competitors: Array<{ name: string; url: string; platform: string }> = []
    
    data.forEach(comp => {
      if (comp.booking_url) {
        competitors.push({
          name: comp.competitor_name,
          url: comp.booking_url,
          platform: 'booking',
        })
      }
      if (comp.expedia_url) {
        competitors.push({
          name: comp.competitor_name,
          url: comp.expedia_url,
          platform: 'expedia',
        })
      }
    })

    return competitors
  } catch (error) {
    console.error('[CompetitorAgent] Error fetching competitor URLs:', error)
    return []
  }
}

/**
 * Calculate market position
 */
function calculateMarketPosition(
  targetPrice: number | undefined,
  competitorPrices: number[]
): 'lowest' | 'below-average' | 'average' | 'above-average' | 'highest' {
  if (!targetPrice || competitorPrices.length === 0) return 'average'

  const avgPrice = competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length
  const minPrice = Math.min(...competitorPrices)
  const maxPrice = Math.max(...competitorPrices)

  if (targetPrice <= minPrice) return 'lowest'
  if (targetPrice >= maxPrice) return 'highest'
  
  const deviation = (targetPrice - avgPrice) / avgPrice

  if (deviation < -0.1) return 'below-average'
  if (deviation > 0.1) return 'above-average'
  return 'average'
}

/**
 * Calculate market trend
 */
function calculateMarketTrend(prices: number[]): 'high-demand' | 'moderate' | 'low-demand' {
  if (prices.length === 0) return 'moderate'

  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
  
  // High prices indicate high demand
  if (avgPrice > 800) return 'high-demand'
  if (avgPrice < 400) return 'low-demand'
  return 'moderate'
}

/**
 * Generate pricing recommendation
 */
function generatePricingRecommendation(
  position: string,
  marketTrend: string,
  averagePrice: number,
  targetPrice?: number
): string {
  if (!targetPrice) {
    return `מחיר שוק ממוצע: ₪${Math.round(averagePrice)}. המלצה: תמחר בטווח ₪${Math.round(averagePrice * 0.95)}-₪${Math.round(averagePrice * 1.05)}`
  }

  const priceDiff = targetPrice - averagePrice
  const priceDiffPercent = (priceDiff / averagePrice * 100).toFixed(0)

  switch (position) {
    case 'lowest':
      return `🔴 המחיר שלך (₪${targetPrice}) הוא הנמוך ביותר בשוק. ממוצע: ₪${Math.round(averagePrice)}. יש מקום להעלאה של 15-20%!`
    
    case 'below-average':
      return `🟡 המחיר שלך ₪${priceDiffPercent}% מתחת לממוצע (₪${Math.round(averagePrice)}). שקול העלאה של 10%`
    
    case 'average':
      return `🟢 המחיר שלך תחרותי (±5% מהממוצע ₪${Math.round(averagePrice)}). שמור על מחיר נוכחי`
    
    case 'above-average':
      return `🟠 המחיר שלך ₪${priceDiffPercent}% מעל הממוצע. בדוק שיש הצדקה (מיקום טוב יותר, שירות, וכו')`
    
    case 'highest':
      return `🔴 המחיר שלך (₪${targetPrice}) הוא הגבוה ביותר בשוק (ממוצע: ₪${Math.round(averagePrice)}). שקול הפחתה או הדגשת יתרונות`
    
    default:
      return `מחיר שוק: ₪${Math.round(averagePrice)}`
  }
}

/**
 * Main function: Get real-time competitor prices
 */
export async function getCompetitorPrices(
  hotelId: string,
  location: string,
  targetDate: string,
  currentPrice?: number,
  useRealTime: boolean = false
): Promise<CompetitorAgentResult> {
  console.log(`[CompetitorAgent] Fetching competitor prices for ${location} on ${targetDate}`)

  let competitors: CompetitorPrice[] = []
  let source: 'scraper' | 'api' | 'database' = 'database'
  let dataFreshness: 'real-time' | 'recent' | 'cached' | 'stale' = 'cached'

  try {
    // Try database first (fastest)
    competitors = await fetchCompetitorsFromDB(location, targetDate, 24)
    
    if (competitors.length > 0) {
      const oldestScan = new Date(Math.min(...competitors.map(c => new Date(c.scrapedAt).getTime())))
      const ageHours = (Date.now() - oldestScan.getTime()) / (1000 * 60 * 60)
      
      dataFreshness = ageHours < 6 ? 'recent' : ageHours < 24 ? 'cached' : 'stale'
      source = 'database'
      
      console.log(`[CompetitorAgent] Found ${competitors.length} competitors in DB (${ageHours.toFixed(1)}h old)`)
    }

    // If no recent data and real-time requested, scrape
    if ((competitors.length === 0 || dataFreshness === 'stale') && useRealTime) {
      console.log('[CompetitorAgent] Triggering real-time scraping...')
      
      const checkOutDate = new Date(targetDate)
      checkOutDate.setDate(checkOutDate.getDate() + 1)
      const checkOutStr = checkOutDate.toISOString().split('T')[0]
      
      const scrapedCompetitors = await fetchCompetitorsFromApify(location, targetDate, checkOutStr)
      
      if (scrapedCompetitors.length > 0) {
        competitors = scrapedCompetitors
        source = 'scraper'
        dataFreshness = 'real-time'
        console.log(`[CompetitorAgent] Scraped ${competitors.length} real-time prices`)
      }
    }

    // Calculate metrics
    const prices = competitors
      .filter(c => c.availability && c.price > 0)
      .map(c => c.price)

    const averagePrice = prices.length > 0 
      ? prices.reduce((sum, p) => sum + p, 0) / prices.length 
      : 0

    const minPrice = prices.length > 0 ? Math.min(...prices) : 0
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

    const pricePosition = calculateMarketPosition(currentPrice, prices)
    const marketTrend = calculateMarketTrend(prices)
    const pricingRecommendation = generatePricingRecommendation(pricePosition, marketTrend, averagePrice, currentPrice)

    const confidence = 
      dataFreshness === 'real-time' ? 0.95 :
      dataFreshness === 'recent' ? 0.85 :
      dataFreshness === 'cached' ? 0.65 :
      0.40

    const result: CompetitorAgentResult = {
      targetHotelId: hotelId,
      targetDate,
      location,
      competitors,
      averagePrice,
      minPrice,
      maxPrice,
      pricePosition,
      marketTrend,
      pricingRecommendation,
      confidence,
      dataFreshness,
      source,
    }

    console.log(`[CompetitorAgent] Result:`, {
      competitors: competitors.length,
      averagePrice: Math.round(averagePrice),
      pricePosition,
      marketTrend,
      confidence,
      source,
      dataFreshness,
    })

    return result

  } catch (error) {
    console.error('[CompetitorAgent] Error:', error)
    
    // Return empty result
    return {
      targetHotelId: hotelId,
      targetDate,
      location,
      competitors: [],
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      pricePosition: 'average',
      marketTrend: 'moderate',
      pricingRecommendation: 'אין נתוני מתחרים זמינים',
      confidence: 0.1,
      dataFreshness: 'stale',
      source: 'database',
    }
  }
}

/**
 * Batch version: Get competitor prices for multiple dates
 */
export async function getCompetitorPricesBatch(
  hotelId: string,
  location: string,
  targetDates: string[],
  currentPrice?: number,
  useRealTime: boolean = false
): Promise<Map<string, CompetitorAgentResult>> {
  console.log(`[CompetitorAgent] Batch fetching for ${targetDates.length} dates`)

  const results = new Map<string, CompetitorAgentResult>()

  // Process first date with real-time if requested
  if (targetDates.length > 0) {
    const firstResult = await getCompetitorPrices(hotelId, location, targetDates[0], currentPrice, useRealTime)
    results.set(targetDates[0], firstResult)
  }

  // Process remaining dates from cache
  const remainingPromises = targetDates.slice(1).map(async (date) => {
    const result = await getCompetitorPrices(hotelId, location, date, currentPrice, false)
    results.set(date, result)
  })

  await Promise.all(remainingPromises)

  console.log(`[CompetitorAgent] Batch complete: ${results.size} dates processed`)

  return results
}
