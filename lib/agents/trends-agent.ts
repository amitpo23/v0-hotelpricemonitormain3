/**
 * Google Trends Agent
 * Fetches real Google Trends data for hotel searches in Israel
 * Uses SerpAPI for reliable Google Trends access
 */

interface TrendsDataPoint {
  date: string
  value: number // 0-100 scale
}

interface TrendsAgentResult {
  keyword: string
  location: string
  timeframe: string
  currentInterest: number // 0-100
  trend: 'rising' | 'falling' | 'stable'
  dataPoints: TrendsDataPoint[]
  relatedQueries: string[]
  confidence: number
  source: 'serpapi' | 'cached' | 'estimated'
}

/**
 * Fetch Google Trends data using SerpAPI
 */
async function fetchTrendsFromSerpAPI(
  keyword: string,
  location: string = 'IL',
  dateRange: string = 'today 3-m'
): Promise<any> {
  const apiKey = process.env.SERPAPI_KEY

  if (!apiKey) {
    console.warn('[TrendsAgent] SERPAPI_KEY not set - returning cached data')
    return null
  }

  try {
    const params = new URLSearchParams({
      engine: 'google_trends',
      q: keyword,
      data_type: 'TIMESERIES',
      geo: location,
      date: dateRange,
      api_key: apiKey,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const response = await fetch(`https://serpapi.com/search?${params}`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`[TrendsAgent] SerpAPI returned status ${response.status}`)
        return null
      }

      const data = await response.json()
      return data
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[TrendsAgent] SerpAPI request timeout')
      } else {
        console.warn('[TrendsAgent] SerpAPI error:', error)
      }
      return null
    }
  } catch (error) {
    console.error('[TrendsAgent] Error fetching from SerpAPI:', error)
    return null
  }
}

/**
 * Parse SerpAPI response into our format
 */
function parseSerpAPIResponse(data: any): TrendsDataPoint[] {
  if (!data?.interest_over_time?.timeline_data) {
    return []
  }

  return data.interest_over_time.timeline_data.map((point: any) => ({
    date: point.date,
    value: Array.isArray(point.values) ? point.values[0]?.value || 0 : point.value || 0,
  }))
}

/**
 * Get cached/estimated trends data as fallback
 */
function getEstimatedTrends(dateStr: string, location: string = 'Israel'): TrendsAgentResult {
  const date = new Date(dateStr)
  const month = date.getMonth()
  const dayOfWeek = date.getDay()
  
  // Seasonal baseline for Israeli hotel searches
  const seasonalBaseline: Record<number, number> = {
    0: 65,  // January - winter low
    1: 60,  // February - lowest
    2: 75,  // March - Purim, spring
    3: 90,  // April - Passover peak
    4: 80,  // May - good weather
    5: 85,  // June - Pride, summer start
    6: 95,  // July - peak summer
    7: 100, // August - highest peak
    8: 82,  // September - holidays
    9: 70,  // October - post-holidays
    10: 65, // November - low season
    11: 78, // December - Hanukkah
  }

  let baseInterest = seasonalBaseline[month] || 70
  
  // Weekend boost
  if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
    baseInterest = Math.min(100, baseInterest * 1.08)
  }

  // Random variation ±3 to simulate real data
  const variation = Math.random() * 6 - 3
  const currentInterest = Math.max(0, Math.min(100, baseInterest + variation))

  return {
    keyword: 'hotels tel aviv',
    location,
    timeframe: 'estimated',
    currentInterest: Math.round(currentInterest),
    trend: 'stable',
    dataPoints: [],
    relatedQueries: [
      'מלונות בתל אביב',
      'hotels near beach',
      'boutique hotels tel aviv',
      'tel aviv accommodation'
    ],
    confidence: 0.4, // Low confidence for estimated data
    source: 'estimated',
  }
}

/**
 * Main function: Get Google Trends data for specific date
 */
export async function getTrendsForDate(
  dateStr: string,
  keyword: string = 'hotels tel aviv',
  location: string = 'IL'
): Promise<TrendsAgentResult> {
  console.log(`[TrendsAgent] Fetching trends for "${keyword}" on ${dateStr}`)

  try {
    // Try to fetch real data from SerpAPI
    const serpData = await fetchTrendsFromSerpAPI(keyword, location, 'today 3-m')

    if (serpData) {
      const dataPoints = parseSerpAPIResponse(serpData)
      
      if (dataPoints.length > 0) {
        // Find the closest date in the data
        const targetDate = new Date(dateStr)
        let closestPoint = dataPoints[0]
        let minDiff = Math.abs(new Date(dataPoints[0].date).getTime() - targetDate.getTime())
        
        dataPoints.forEach(point => {
          const diff = Math.abs(new Date(point.date).getTime() - targetDate.getTime())
          if (diff < minDiff) {
            minDiff = diff
            closestPoint = point
          }
        })

        // Calculate trend from last 7 data points
        const recentPoints = dataPoints.slice(-7)
        const avgRecent = recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length
        const avgPrevious = dataPoints.slice(-14, -7).reduce((sum, p) => sum + p.value, 0) / 7
        
        let trend: 'rising' | 'falling' | 'stable' = 'stable'
        if (avgRecent > avgPrevious * 1.05) trend = 'rising'
        else if (avgRecent < avgPrevious * 0.95) trend = 'falling'

        // Extract related queries
        const relatedQueries = serpData.related_queries?.rising?.map((q: any) => q.query) || []

        return {
          keyword,
          location,
          timeframe: 'today 3-m',
          currentInterest: closestPoint.value,
          trend,
          dataPoints,
          relatedQueries: relatedQueries.slice(0, 10),
          confidence: 0.9, // High confidence for real data
          source: 'serpapi',
        }
      }
    }

    // Fallback to estimated data
    console.log('[TrendsAgent] Using estimated trends data')
    return getEstimatedTrends(dateStr, location)
    
  } catch (error) {
    console.error('[TrendsAgent] Error:', error)
    return getEstimatedTrends(dateStr, location)
  }
}

/**
 * Batch version: Get trends for multiple dates efficiently
 */
export async function getTrendsForDateRange(
  startDate: string,
  endDate: string,
  keyword: string = 'hotels tel aviv',
  location: string = 'IL'
): Promise<Map<string, TrendsAgentResult>> {
  console.log(`[TrendsAgent] Fetching trends for date range ${startDate} to ${endDate}`)

  const results = new Map<string, TrendsAgentResult>()

  try {
    // Fetch once for the entire range
    const serpData = await fetchTrendsFromSerpAPI(keyword, location, 'today 3-m')

    if (serpData) {
      const dataPoints = parseSerpAPIResponse(serpData)

      if (dataPoints.length > 0) {
        // Map each date in range to closest data point
        const start = new Date(startDate)
        const end = new Date(endDate)
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          
          // Find closest point
          let closestPoint = dataPoints[0]
          let minDiff = Math.abs(new Date(dataPoints[0].date).getTime() - d.getTime())
          
          dataPoints.forEach(point => {
            const diff = Math.abs(new Date(point.date).getTime() - d.getTime())
            if (diff < minDiff) {
              minDiff = diff
              closestPoint = point
            }
          })

          results.set(dateStr, {
            keyword,
            location,
            timeframe: 'today 3-m',
            currentInterest: closestPoint.value,
            trend: 'stable',
            dataPoints: [closestPoint],
            relatedQueries: [],
            confidence: 0.85,
            source: 'serpapi',
          })
        }

        return results
      }
    }

    // Fallback: Generate estimated data for each date
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      results.set(dateStr, getEstimatedTrends(dateStr, location))
    }

    return results
    
  } catch (error) {
    console.error('[TrendsAgent] Batch error:', error)
    
    // Return estimated data for all dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      results.set(dateStr, getEstimatedTrends(dateStr, location))
    }

    return results
  }
}
