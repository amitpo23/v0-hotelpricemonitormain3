/**
 * Events Agent - Real-time Event Discovery
 * Fetches events from multiple sources using Tavily Search API
 */

interface Event {
  name: string
  date: string
  endDate?: string
  impact: 'very_high' | 'high' | 'medium' | 'low'
  type: string
  description: string
  source: string
  venue?: string
  expectedAttendance?: number
}

interface EventsAgentResult {
  events: Event[]
  sources: string[]
  searchDate: string
  confidence: number
}

/**
 * Search for events using Tavily API
 */
async function searchEventsWithTavily(location: string, dateRange: string): Promise<any> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    console.warn('[EventsAgent] TAVILY_API_KEY not set - returning empty results')
    return { results: [] }
  }

  try {
    const query = `אירועים כנסים קונצרטים פסטיבלים ב${location} ${dateRange} events conferences concerts festivals`
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: true,
        max_results: 10,
        include_domains: [
          'timeout.com',
          'eventbrite.com',
          'ticketmaster.co.il',
          'leaan.co.il',
          'itraveljerusalem.com',
          'events.themarker.com',
          'ynet.co.il',
          'mako.co.il'
        ]
      }),
    })

    if (!response.ok) {
      console.error('[EventsAgent] Tavily API error:', response.status)
      return { results: [] }
    }

    return await response.json()
  } catch (error) {
    console.error('[EventsAgent] Search failed:', error)
    return { results: [] }
  }
}

/**
 * Analyze event impact based on keywords and context
 */
function analyzeEventImpact(content: string, title: string): {
  impact: 'very_high' | 'high' | 'medium' | 'low'
  type: string
  expectedAttendance?: number
} {
  const lowerContent = content.toLowerCase()
  const lowerTitle = title.toLowerCase()
  const combined = lowerContent + ' ' + lowerTitle

  // Very High Impact Events (50k+ people)
  if (
    combined.includes('מצעד הגאווה') ||
    combined.includes('pride parade') ||
    combined.includes('eurovision') ||
    combined.includes('אירוויזיון') ||
    combined.includes('marathon') ||
    combined.includes('מרתון')
  ) {
    return { impact: 'very_high', type: 'major_international', expectedAttendance: 100000 }
  }

  // High Impact Events (10k-50k people)
  if (
    combined.includes('כנס בינלאומי') ||
    combined.includes('international conference') ||
    combined.includes('פסטיבל') ||
    combined.includes('festival') ||
    combined.match(/\d{1,2},000|אלפי|thousands/i)
  ) {
    return { impact: 'high', type: 'major_event', expectedAttendance: 25000 }
  }

  // Medium Impact Events (1k-10k people)
  if (
    combined.includes('כנס') ||
    combined.includes('conference') ||
    combined.includes('קונצרט') ||
    combined.includes('concert') ||
    combined.includes('תערוכה') ||
    combined.includes('exhibition') ||
    combined.includes('expo')
  ) {
    return { impact: 'medium', type: 'event', expectedAttendance: 5000 }
  }

  // Low Impact Events
  return { impact: 'low', type: 'local_event', expectedAttendance: 500 }
}

/**
 * Extract date from content using various patterns
 */
function extractDateFromContent(content: string, searchDate: string): string {
  // Try to find explicit dates in the content
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{1,2}\s+(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר))/,
  ]

  for (const pattern of datePatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1]
    }
  }

  // If no date found, return the search date
  return searchDate
}

/**
 * Main function: Discover events for a specific date/period
 */
export async function discoverEvents(
  location: string,
  targetDate: string | Date,
  daysRange: number = 7
): Promise<EventsAgentResult> {
  console.log(`[EventsAgent] Discovering events for ${location} around ${targetDate}`)

  const date = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
  const dateStr = date.toISOString().split('T')[0]
  
  // Create date range for search
  const startDate = new Date(date)
  startDate.setDate(startDate.getDate() - daysRange)
  const endDate = new Date(date)
  endDate.setDate(endDate.getDate() + daysRange)

  const dateRange = `${startDate.toLocaleDateString('he-IL')} עד ${endDate.toLocaleDateString('he-IL')}`

  // Search using Tavily
  const searchResults = await searchEventsWithTavily(location, dateRange)

  const events: Event[] = []
  const sources: string[] = []

  // Process search results
  for (const result of searchResults.results || []) {
    const { impact, type, expectedAttendance } = analyzeEventImpact(
      result.content || '',
      result.title || ''
    )

    // Only include medium+ impact events
    if (impact === 'low' && Math.random() > 0.3) {
      continue // Skip most low-impact events to reduce noise
    }

    const eventDate = extractDateFromContent(result.content, dateStr)

    events.push({
      name: result.title,
      date: eventDate,
      impact,
      type,
      description: (result.content || '').slice(0, 300),
      source: result.url,
      expectedAttendance,
    })

    if (!sources.includes(result.url)) {
      sources.push(result.url)
    }
  }

  // Calculate confidence based on number of sources and quality
  const confidence = Math.min(
    0.95,
    0.5 + (sources.length * 0.1) + (events.filter(e => e.impact === 'high' || e.impact === 'very_high').length * 0.1)
  )

  console.log(`[EventsAgent] Found ${events.length} events from ${sources.length} sources (confidence: ${(confidence * 100).toFixed(0)}%)`)

  return {
    events,
    sources,
    searchDate: dateStr,
    confidence,
  }
}

/**
 * Batch discover events for multiple dates
 */
export async function discoverEventsBatch(
  location: string,
  dates: (string | Date)[],
  daysRange: number = 7
): Promise<Map<string, EventsAgentResult>> {
  console.log(`[EventsAgent] Batch discovering events for ${dates.length} dates`)

  const results = new Map<string, EventsAgentResult>()

  // Group dates by week to optimize API calls
  const weekGroups = new Map<string, (string | Date)[]>()
  
  for (const date of dates) {
    const d = typeof date === 'string' ? new Date(date) : date
    const weekKey = `${d.getFullYear()}-W${Math.floor(d.getDate() / 7)}`
    
    if (!weekGroups.has(weekKey)) {
      weekGroups.set(weekKey, [])
    }
    weekGroups.get(weekKey)!.push(date)
  }

  // Process each week group
  for (const [weekKey, weekDates] of weekGroups.entries()) {
    // Use middle date for search
    const middleDate = weekDates[Math.floor(weekDates.length / 2)]
    const weekResults = await discoverEvents(location, middleDate, daysRange)

    // Apply results to all dates in this week
    for (const date of weekDates) {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
      results.set(dateStr, weekResults)
    }

    // Rate limiting - wait 1 second between searches
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return results
}
