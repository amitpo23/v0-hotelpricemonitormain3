/**
 * Internet Research Agent
 * Uses Tavily Search API to gather external market intelligence
 * Then uses Claude to analyze and extract insights
 */

interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  published_date?: string
}

interface TavilyResponse {
  query: string
  results: TavilySearchResult[]
  answer?: string
  images?: string[]
}

interface ExternalMarketData {
  events: Array<{
    name: string
    date: string
    impact: 'high' | 'medium' | 'low'
    description: string
    source: string
  }>
  news: Array<{
    title: string
    summary: string
    sentiment: 'positive' | 'neutral' | 'negative'
    relevance: number
    url: string
  }>
  weatherAlerts: Array<{
    type: string
    severity: string
    description: string
  }>
  marketTrends: {
    summary: string
    factors: string[]
  }
  rawData: string // Full text for Claude analysis
}

/**
 * Search using Tavily API
 */
async function searchTavily(query: string, options: {
  searchDepth?: 'basic' | 'advanced'
  maxResults?: number
  includeDomains?: string[]
  excludeDomains?: string[]
  includeAnswer?: boolean
} = {}): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set in environment variables')
  }

  try {
    console.log('[InternetAgent] Searching:', query)

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: options.searchDepth || 'advanced',
        include_answer: options.includeAnswer !== false,
        include_raw_content: true,
        max_results: options.maxResults || 5,
        include_domains: options.includeDomains,
        exclude_domains: options.excludeDomains,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[InternetAgent] Tavily error:', error)
      throw new Error(`Tavily API error: ${response.status}`)
    }

    const data: TavilyResponse = await response.json()
    console.log(`[InternetAgent] Found ${data.results?.length || 0} results`)

    return data
  } catch (error) {
    console.error('[InternetAgent] Search failed:', error)
    throw error
  }
}

/**
 * Research events and activities for a specific date and location
 */
export async function researchEvents(location: string, date: string): Promise<ExternalMarketData['events']> {
  const query = `אירועים ב${location} בתאריך ${date} כנסים תחרויות פסטיבלים קונצרטים`
  
  try {
    const results = await searchTavily(query, {
      searchDepth: 'advanced',
      maxResults: 5,
    })

    const events: ExternalMarketData['events'] = []

    // Parse results to extract events
    for (const result of results.results || []) {
      // Simple heuristic - if content mentions event-related words
      const content = (result.content || '').toLowerCase()
      const hasEventKeywords = [
        'כנס', 'פסטיבל', 'קונצרט', 'תחרות', 'אירוע',
        'conference', 'festival', 'concert', 'competition', 'event'
      ].some(keyword => content.includes(keyword))

      if (hasEventKeywords) {
        // Estimate impact based on content keywords
        let impact: 'high' | 'medium' | 'low' = 'low'
        if (content.includes('בינלאומי') || content.includes('international') || 
            content.includes('אלפי') || content.includes('thousands')) {
          impact = 'high'
        } else if (content.includes('ארצי') || content.includes('national')) {
          impact = 'medium'
        }

        events.push({
          name: result.title,
          date: result.published_date || date,
          impact,
          description: result.content.slice(0, 200),
          source: result.url,
        })
      }
    }

    console.log(`[InternetAgent] Found ${events.length} events`)
    return events
  } catch (error) {
    console.error('[InternetAgent] Event research failed:', error)
    return []
  }
}

/**
 * Research recent news affecting hotel demand
 */
export async function researchNews(location: string, date: string): Promise<ExternalMarketData['news']> {
  const query = `חדשות תיירות ${location} ${date} מלונות כלכלה`
  
  try {
    const results = await searchTavily(query, {
      searchDepth: 'advanced',
      maxResults: 5,
      includeDomains: ['ynet.co.il', 'calcalist.co.il', 'globes.co.il', 'mako.co.il'],
    })

    const news: ExternalMarketData['news'] = []

    for (const result of results.results || []) {
      // Simple sentiment analysis based on keywords
      const content = (result.content || '').toLowerCase()
      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
      
      const positiveWords = ['עלייה', 'גידול', 'שיא', 'הצלחה', 'שיפור', 'increase', 'growth', 'success']
      const negativeWords = ['ירידה', 'משבר', 'קריסה', 'חרם', 'decrease', 'crisis', 'boycott']
      
      if (positiveWords.some(w => content.includes(w))) sentiment = 'positive'
      if (negativeWords.some(w => content.includes(w))) sentiment = 'negative'

      news.push({
        title: result.title,
        summary: result.content.slice(0, 200),
        sentiment,
        relevance: result.score || 0.5,
        url: result.url,
      })
    }

    console.log(`[InternetAgent] Found ${news.length} news items`)
    return news
  } catch (error) {
    console.error('[InternetAgent] News research failed:', error)
    return []
  }
}

/**
 * Research comprehensive market data for a hotel on a specific date
 */
export async function researchMarketIntelligence(
  hotelName: string,
  location: string,
  date: string
): Promise<ExternalMarketData> {
  console.log(`[InternetAgent] Researching market for ${hotelName} on ${date}`)

  try {
    // Run searches in parallel
    const [events, news, trendsData] = await Promise.all([
      researchEvents(location, date),
      researchNews(location, date),
      searchTavily(`תיירות ${location} מגמות ${new Date(date).getFullYear()}`, {
        searchDepth: 'basic',
        maxResults: 3,
      }),
    ])

    // Compile raw data for Claude analysis
    const rawData = `
=== אירועים ===
${events.map(e => `${e.name} (${e.impact} impact) - ${e.description}`).join('\n')}

=== חדשות ===
${news.map(n => `${n.title} (${n.sentiment}) - ${n.summary}`).join('\n')}

=== מגמות שוק ===
${trendsData.results?.map(r => `${r.title}: ${r.content.slice(0, 150)}`).join('\n') || 'אין נתונים'}
    `.trim()

    // Extract market trends summary
    const marketTrends = {
      summary: trendsData.answer || 'אין סיכום זמין',
      factors: trendsData.results?.map(r => r.title).slice(0, 5) || [],
    }

    // Check for weather alerts (simplified - you'd integrate a real weather API)
    const weatherAlerts: ExternalMarketData['weatherAlerts'] = []

    return {
      events,
      news,
      weatherAlerts,
      marketTrends,
      rawData,
    }
  } catch (error) {
    console.error('[InternetAgent] Research failed:', error)
    
    // Return empty data structure on failure
    return {
      events: [],
      news: [],
      weatherAlerts: [],
      marketTrends: { summary: 'שגיאה באיסוף נתונים', factors: [] },
      rawData: 'לא הצלחנו לאסוף מידע חיצוני',
    }
  }
}

/**
 * Quick search for specific information
 */
export async function quickSearch(query: string): Promise<string> {
  try {
    const results = await searchTavily(query, {
      searchDepth: 'basic',
      maxResults: 3,
      includeAnswer: true,
    })

    if (results.answer) {
      return results.answer
    }

    if (results.results && results.results.length > 0) {
      return results.results
        .map(r => `${r.title}: ${r.content.slice(0, 150)}...`)
        .join('\n\n')
    }

    return 'לא נמצאו תוצאות'
  } catch (error) {
    console.error('[InternetAgent] Quick search failed:', error)
    return 'שגיאה בחיפוש'
  }
}
