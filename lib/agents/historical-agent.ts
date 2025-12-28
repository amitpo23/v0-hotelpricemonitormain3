/**
 * Historical Data Agent
 * Fetches historical pricing data from last year for same period
 * Uses internal database + external sources
 */

import { createClient } from '@/lib/supabase/server'

interface HistoricalDataPoint {
  date: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  occupancyRate?: number
  dataPoints: number
  source: 'internal' | 'external' | 'estimated'
}

interface HistoricalAgentResult {
  targetDate: string
  lastYearDate: string
  currentYearData?: HistoricalDataPoint
  lastYearData?: HistoricalDataPoint
  priceChange?: number
  priceChangePercent?: number
  trend: 'increasing' | 'decreasing' | 'stable' | 'unknown'
  confidence: number
  seasonalPattern?: string
}

/**
 * Fetch internal historical data from database
 */
async function fetchInternalHistoricalData(
  hotelId: string,
  dateStr: string
): Promise<HistoricalDataPoint | null> {
  try {
    const supabase = await createClient()

    // Query scan_results for this date (from last year or any historical data)
    const { data: scanResults } = await supabase
      .from('scan_results')
      .select('price, scraped_at, check_in_date')
      .eq('hotel_id', hotelId)
      .gte('check_in_date', dateStr)
      .lte('check_in_date', dateStr)
      .order('scraped_at', { ascending: false })
      .limit(100)

    if (!scanResults || scanResults.length === 0) {
      return null
    }

    const prices = scanResults
      .map((r: any) => Number(r.price))
      .filter((p: number) => p > 0 && p < 10000) // Sanity check

    if (prices.length === 0) {
      return null
    }

    return {
      date: dateStr,
      avgPrice: Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      dataPoints: prices.length,
      source: 'internal',
    }
  } catch (error) {
    console.error('[HistoricalAgent] Internal fetch error:', error)
    return null
  }
}

/**
 * Fetch from daily_prices table
 */
async function fetchDailyPricesData(
  hotelId: string,
  dateStr: string
): Promise<HistoricalDataPoint | null> {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('daily_prices')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('date', dateStr)
      .single()

    if (!data) {
      return null
    }

    return {
      date: dateStr,
      avgPrice: Math.round(data.avg_competitor_price || data.recommended_price || 0),
      minPrice: data.min_competitor_price || 0,
      maxPrice: data.max_competitor_price || 0,
      occupancyRate: data.occupancy_rate,
      dataPoints: data.competitor_count || 1,
      source: 'internal',
    }
  } catch (error) {
    console.error('[HistoricalAgent] Daily prices fetch error:', error)
    return null
  }
}

/**
 * Search external sources for historical pricing data (using Tavily)
 */
async function searchExternalHistoricalData(
  hotelName: string,
  location: string,
  dateStr: string
): Promise<HistoricalDataPoint | null> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    return null
  }

  try {
    const date = new Date(dateStr)
    const monthName = date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
    
    const query = `מחיר ממוצע מלון ${hotelName} ${location} ${monthName} hotel average price`

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_domains: [
          'booking.com',
          'hotels.com',
          'expedia.com',
          'tripadvisor.com',
          'priceoftravel.com'
        ]
      }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    // Try to extract prices from results
    const prices: number[] = []
    for (const result of data.results || []) {
      const content = (result.content || '') + ' ' + (result.title || '')
      const priceMatches = content.match(/₪(\d{1,4})|ILS\s*(\d{1,4})|\$(\d{1,4})/gi)
      
      if (priceMatches) {
        for (const match of priceMatches) {
          const num = Number.parseInt(match.replace(/[^\d]/g, ''))
          if (num > 100 && num < 5000) {
            // Convert USD to ILS if needed
            const price = match.includes('$') ? num * 3.7 : num
            prices.push(price)
          }
        }
      }
    }

    if (prices.length === 0) {
      return null
    }

    return {
      date: dateStr,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      dataPoints: prices.length,
      source: 'external',
    }
  } catch (error) {
    console.error('[HistoricalAgent] External search error:', error)
    return null
  }
}

/**
 * Estimate historical data based on seasonal patterns
 */
function estimateHistoricalData(
  targetDate: string,
  hotelBasePrice: number
): HistoricalDataPoint {
  const date = new Date(targetDate)
  const month = date.getMonth() // 0-11
  const dayOfWeek = date.getDay() // 0-6

  // Seasonal multipliers for Israel tourism
  const seasonalMultipliers: Record<number, number> = {
    0: 0.95,  // January - winter low
    1: 0.92,  // February - winter low
    2: 1.15,  // March - Passover period
    3: 1.18,  // April - Passover/Spring
    4: 1.05,  // May - shoulder season
    5: 1.12,  // June - Pride, summer start
    6: 1.25,  // July - peak summer
    7: 1.30,  // August - peak summer
    8: 1.10,  // September - Jewish holidays
    9: 1.08,  // October - Sukkot
    10: 1.00, // November - shoulder
    11: 1.05, // December - Hanukkah/New Year
  }

  const seasonalFactor = seasonalMultipliers[month] || 1.0
  const weekendFactor = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.15 : 1.0

  const estimatedPrice = Math.round(hotelBasePrice * seasonalFactor * weekendFactor)

  return {
    date: targetDate,
    avgPrice: estimatedPrice,
    minPrice: Math.round(estimatedPrice * 0.85),
    maxPrice: Math.round(estimatedPrice * 1.15),
    dataPoints: 0,
    source: 'estimated',
  }
}

/**
 * Main function: Get historical comparison for a target date
 */
export async function getHistoricalComparison(
  hotelId: string,
  hotelName: string,
  location: string,
  targetDate: string | Date,
  hotelBasePrice: number
): Promise<HistoricalAgentResult> {
  const date = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
  const targetDateStr = date.toISOString().split('T')[0]

  // Calculate last year's date
  const lastYearDate = new Date(date)
  lastYearDate.setFullYear(lastYearDate.getFullYear() - 1)
  const lastYearDateStr = lastYearDate.toISOString().split('T')[0]

  console.log(`[HistoricalAgent] Comparing ${targetDateStr} with ${lastYearDateStr}`)

  // Try to fetch data from multiple sources in parallel
  const [
    internalLastYear,
    dailyPricesLastYear,
    internalCurrent,
    dailyPricesCurrent,
  ] = await Promise.all([
    fetchInternalHistoricalData(hotelId, lastYearDateStr),
    fetchDailyPricesData(hotelId, lastYearDateStr),
    fetchInternalHistoricalData(hotelId, targetDateStr),
    fetchDailyPricesData(hotelId, targetDateStr),
  ])

  // Use best available data for last year
  const lastYearData = internalLastYear || dailyPricesLastYear || estimateHistoricalData(lastYearDateStr, hotelBasePrice)
  
  // Use best available data for current year (if exists)
  const currentYearData = internalCurrent || dailyPricesCurrent || undefined

  // Calculate trend
  let trend: 'increasing' | 'decreasing' | 'stable' | 'unknown' = 'unknown'
  let priceChange: number | undefined
  let priceChangePercent: number | undefined

  if (currentYearData && lastYearData) {
    priceChange = currentYearData.avgPrice - lastYearData.avgPrice
    priceChangePercent = (priceChange / lastYearData.avgPrice) * 100

    if (Math.abs(priceChangePercent) < 5) {
      trend = 'stable'
    } else if (priceChangePercent > 0) {
      trend = 'increasing'
    } else {
      trend = 'decreasing'
    }
  }

  // Calculate confidence
  let confidence = 0.5 // Base confidence

  if (lastYearData.source === 'internal' && lastYearData.dataPoints > 5) {
    confidence = 0.85
  } else if (lastYearData.source === 'internal') {
    confidence = 0.70
  } else if (lastYearData.source === 'external') {
    confidence = 0.65
  } else {
    confidence = 0.50 // Estimated data
  }

  // Identify seasonal pattern
  const month = date.getMonth()
  const seasonalPatterns: Record<number, string> = {
    0: 'Winter Low Season',
    1: 'Winter Low Season',
    2: 'Spring / Passover Peak',
    3: 'Spring / Passover Peak',
    4: 'Shoulder Season',
    5: 'Summer Start / Pride',
    6: 'Peak Summer',
    7: 'Peak Summer',
    8: 'Fall / Jewish Holidays',
    9: 'Fall / Sukkot',
    10: 'Shoulder Season',
    11: 'Winter / Holidays',
  }

  return {
    targetDate: targetDateStr,
    lastYearDate: lastYearDateStr,
    currentYearData,
    lastYearData,
    priceChange,
    priceChangePercent,
    trend,
    confidence,
    seasonalPattern: seasonalPatterns[month],
  }
}

/**
 * Batch get historical comparisons for multiple dates
 */
export async function getHistoricalComparisonBatch(
  hotelId: string,
  hotelName: string,
  location: string,
  dates: (string | Date)[],
  hotelBasePrice: number
): Promise<Map<string, HistoricalAgentResult>> {
  console.log(`[HistoricalAgent] Batch processing ${dates.length} dates`)

  const results = new Map<string, HistoricalAgentResult>()

  // Process in batches of 10 to avoid overwhelming the database
  const batchSize = 10
  for (let i = 0; i < dates.length; i += batchSize) {
    const batch = dates.slice(i, i + batchSize)
    
    const batchResults = await Promise.all(
      batch.map(date => 
        getHistoricalComparison(hotelId, hotelName, location, date, hotelBasePrice)
      )
    )

    batchResults.forEach(result => {
      results.set(result.targetDate, result)
    })
  }

  return results
}
