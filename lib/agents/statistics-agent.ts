/**
 * Statistics Agent
 * Fetches tourism statistics, economic indicators, and market trends
 * Sources: CBS (לשכת הסטטיסטיקה המרכזית), tourism ministry, economic data
 */

// Helper: Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 12000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

interface TourismStatistics {
  period: string
  touristArrivals?: number
  hotelOccupancy?: number
  avgNightlyRate?: number
  revenuePerRoom?: number
  source: string
}

interface EconomicIndicators {
  period: string
  inflation?: number
  exchangeRate?: number
  consumerConfidence?: number
  gdpGrowth?: number
  source: string
}

interface MarketTrends {
  summary: string
  direction: 'up' | 'down' | 'stable'
  strength: 'strong' | 'moderate' | 'weak'
  factors: string[]
  confidence: number
}

interface StatisticsAgentResult {
  tourism: TourismStatistics | null
  economy: EconomicIndicators | null
  trends: MarketTrends
  marketSentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  confidence: number
  lastUpdated: string
}

/**
 * Search for tourism statistics using Tavily
 */
async function searchTourismStats(period: string): Promise<TourismStatistics | null> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    return null
  }

  try {
    const query = `סטטיסטיקות תיירות ישראל ${period} תפוסת מלונות מחיר ממוצע לילה tourism statistics Israel hotel occupancy`

    const response = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        max_results: 5,
        include_domains: [
          'cbs.gov.il',
          'tourism.gov.il',
          'globes.co.il',
          'calcalist.co.il',
          'themarker.com'
        ]
      }),
    }, 10000)  // Increased from 7s to 10s

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    // Extract statistics from results
    let touristArrivals: number | undefined
    let hotelOccupancy: number | undefined
    let avgNightlyRate: number | undefined
    let source = 'Multiple Sources'

    for (const result of data.results || []) {
      const content = (result.content || '').toLowerCase()
      
      // Try to extract tourist arrivals
      const arrivalsMatch = content.match(/(\d{1,3}(?:,\d{3})*)\s*תיירים|tourists.*?(\d{1,3}(?:,\d{3})*)/i)
      if (arrivalsMatch && !touristArrivals) {
        touristArrivals = Number.parseInt(arrivalsMatch[1]?.replace(/,/g, '') || arrivalsMatch[2]?.replace(/,/g, '') || '0')
      }

      // Try to extract occupancy rate
      const occupancyMatch = content.match(/תפוסה.*?(\d{1,3})%|occupancy.*?(\d{1,3})%/i)
      if (occupancyMatch && !hotelOccupancy) {
        hotelOccupancy = Number.parseInt(occupancyMatch[1] || occupancyMatch[2] || '0')
      }

      // Try to extract average rate
      const rateMatch = content.match(/מחיר ממוצע.*?(\d{1,4})|average.*?rate.*?(\d{1,4})|₪(\d{1,4})/i)
      if (rateMatch && !avgNightlyRate) {
        avgNightlyRate = Number.parseInt(rateMatch[1] || rateMatch[2] || rateMatch[3] || '0')
      }

      if (result.url.includes('cbs.gov.il')) {
        source = 'CBS - לשכת הסטטיסטיקה'
      }
    }

    if (!touristArrivals && !hotelOccupancy && !avgNightlyRate) {
      return null
    }

    return {
      period,
      touristArrivals,
      hotelOccupancy,
      avgNightlyRate,
      source,
    }
  } catch (error) {
    console.error('[StatisticsAgent] Tourism stats error:', error)
    return null
  }
}

/**
 * Search for economic indicators
 */
async function searchEconomicIndicators(period: string): Promise<EconomicIndicators | null> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    return null
  }

  try {
    const query = `מדדים כלכליים ישראל ${period} אינפלציה שער חליפין דולר inflation exchange rate Israel`

    const response = await fetchWithTimeout('https://api.tavily.com/search', {
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
          'boi.org.il',
          'cbs.gov.il',
          'globes.co.il',
          'calcalist.co.il'
        ]
      }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    let inflation: number | undefined
    let exchangeRate: number | undefined
    let source = 'Multiple Sources'

    for (const result of data.results || []) {
      const content = (result.content || '').toLowerCase()
      
      // Extract inflation
      const inflationMatch = content.match(/אינפלציה.*?(\d{1,2}\.?\d?)%|inflation.*?(\d{1,2}\.?\d?)%/i)
      if (inflationMatch && !inflation) {
        inflation = Number.parseFloat(inflationMatch[1] || inflationMatch[2] || '0')
      }

      // Extract exchange rate (USD/ILS)
      const rateMatch = content.match(/שער.*?דולר.*?(\d\.\d{2,3})|usd.*?(\d\.\d{2,3})|₪(\d\.\d{2,3})/i)
      if (rateMatch && !exchangeRate) {
        exchangeRate = Number.parseFloat(rateMatch[1] || rateMatch[2] || rateMatch[3] || '0')
      }

      if (result.url.includes('boi.org.il')) {
        source = 'Bank of Israel'
      }
    }

    if (!inflation && !exchangeRate) {
      return null
    }

    return {
      period,
      inflation,
      exchangeRate,
      source,
    }
  } catch (error) {
    console.error('[StatisticsAgent] Economic indicators error:', error)
    return null
  }
}

/**
 * Analyze market trends from news and data
 */
async function analyzeMarketTrends(location: string, period: string): Promise<MarketTrends> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    return {
      summary: 'Insufficient data - using baseline estimates',
      direction: 'stable',
      strength: 'weak',
      factors: ['No external data available'],
      confidence: 0.3,
    }
  }

  try {
    const query = `מגמות תיירות מלונאות ${location} ${period} חדשות טרנדים hotel trends news`

    const response = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        max_results: 10,
        include_answer: true,
      }),
    }, 7000)

    if (!response.ok) {
      throw new Error('Search failed')
    }

    const data = await response.json()

    // Analyze sentiment from results
    const positiveKeywords = [
      'עלייה', 'גידול', 'שיא', 'שיפור', 'הצלחה', 'התאוששות', 'חזקה',
      'increase', 'growth', 'record', 'improvement', 'success', 'recovery', 'strong'
    ]
    const negativeKeywords = [
      'ירידה', 'קריסה', 'משבר', 'חרם', 'ביטולים', 'נמוכה',
      'decrease', 'crisis', 'boycott', 'cancellations', 'low', 'drop', 'decline'
    ]

    let positiveCount = 0
    let negativeCount = 0
    const factors: string[] = []

    for (const result of data.results || []) {
      const content = ((result.content || '') + ' ' + (result.title || '')).toLowerCase()
      
      // Count sentiment indicators
      for (const keyword of positiveKeywords) {
        if (content.includes(keyword)) {
          positiveCount++
        }
      }
      for (const keyword of negativeKeywords) {
        if (content.includes(keyword)) {
          negativeCount++
        }
      }

      // Extract key factors
      if (content.includes('אירוע') || content.includes('event')) {
        factors.push('Major events affecting demand')
      }
      if (content.includes('מחירים') || content.includes('price')) {
        factors.push('Price competition in market')
      }
      if (content.includes('תיירות') || content.includes('tourism')) {
        factors.push('Tourism sector trends')
      }
    }

    // Determine direction and strength
    const netSentiment = positiveCount - negativeCount
    let direction: 'up' | 'down' | 'stable' = 'stable'
    let strength: 'strong' | 'moderate' | 'weak' = 'moderate'

    if (netSentiment > 3) {
      direction = 'up'
      strength = netSentiment > 6 ? 'strong' : 'moderate'
    } else if (netSentiment < -3) {
      direction = 'down'
      strength = netSentiment < -6 ? 'strong' : 'moderate'
    } else {
      direction = 'stable'
      strength = 'weak'
    }

    const summary = data.answer || `Market trends ${direction} with ${strength} signals based on ${data.results?.length || 0} sources`

    const confidence = Math.min(0.85, 0.5 + (data.results?.length || 0) * 0.05)

    return {
      summary,
      direction,
      strength,
      factors: factors.length > 0 ? factors : ['General market conditions'],
      confidence,
    }
  } catch (error) {
    console.error('[StatisticsAgent] Market trends error:', error)
    return {
      summary: 'Unable to analyze trends - using baseline',
      direction: 'stable',
      strength: 'weak',
      factors: ['Data unavailable'],
      confidence: 0.3,
    }
  }
}

/**
 * Main function: Gather comprehensive statistics and trends
 */
export async function gatherMarketStatistics(
  location: string = 'Tel Aviv',
  targetDate?: string | Date
): Promise<StatisticsAgentResult> {
  const date = targetDate ? (typeof targetDate === 'string' ? new Date(targetDate) : targetDate) : new Date()
  const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

  console.log(`[StatisticsAgent] Gathering market statistics for ${location}, period: ${period}`)

  // Fetch all data in parallel
  const [tourism, economy, trends] = await Promise.all([
    searchTourismStats(period),
    searchEconomicIndicators(period),
    analyzeMarketTrends(location, period),
  ])

  // Determine overall market sentiment
  let marketSentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative' = 'neutral'

  const indicators = {
    occupancyHigh: (tourism?.hotelOccupancy || 50) > 70,
    trendsPositive: trends.direction === 'up',
    trendsNegative: trends.direction === 'down',
    economyStable: !economy || (economy.inflation || 0) < 5,
  }

  if (indicators.occupancyHigh && indicators.trendsPositive && indicators.economyStable) {
    marketSentiment = 'very_positive'
  } else if ((indicators.occupancyHigh && indicators.trendsPositive) || (indicators.trendsPositive && indicators.economyStable)) {
    marketSentiment = 'positive'
  } else if (indicators.trendsNegative || !indicators.economyStable) {
    marketSentiment = indicators.trendsNegative && !indicators.economyStable ? 'very_negative' : 'negative'
  }

  // Calculate overall confidence
  const confidence = (
    (tourism ? 0.4 : 0) +
    (economy ? 0.2 : 0) +
    (trends.confidence * 0.4)
  )

  console.log(`[StatisticsAgent] Completed with confidence ${(confidence * 100).toFixed(0)}%, sentiment: ${marketSentiment}`)

  return {
    tourism,
    economy,
    trends,
    marketSentiment,
    confidence,
    lastUpdated: new Date().toISOString(),
  }
}
