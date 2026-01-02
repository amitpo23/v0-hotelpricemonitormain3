/**
 * Enhanced Events Agent V2
 * Combines multiple event sources:
 * - Eventbrite API (official events)
 * - Tavily Search (general web search)
 * - Local event database
 * - Israeli holidays calendar
 */

interface EventSource {
  name: string
  date: string
  endDate?: string
  impact: 'very_high' | 'high' | 'medium' | 'low'
  type: 'conference' | 'concert' | 'festival' | 'sports' | 'holiday' | 'exhibition' | 'other'
  description: string
  venue?: string
  expectedAttendance?: number
  ticketsAvailable?: boolean
  priceRange?: string
  source: 'eventbrite' | 'tavily' | 'local' | 'calendar'
  confidence: number
}

interface EnhancedEventsResult {
  location: string
  dateRange: string
  events: EventSource[]
  summary: {
    totalEvents: number
    highImpactEvents: number
    conferenceCount: number
    concertCount: number
    sportCount: number
    holidayCount: number
    demandImpact: number // Overall multiplier for pricing
  }
  confidence: number
  timestamp: string
}

/**
 * Fetch events from Eventbrite API
 */
async function fetchEventbriteEvents(
  location: string,
  startDate: string,
  endDate: string
): Promise<EventSource[]> {
  const apiKey = process.env.EVENTBRITE_API_KEY

  if (!apiKey) {
    console.log('[EventsAgent] EVENTBRITE_API_KEY not set')
    return []
  }

  try {
    // Eventbrite uses location queries
    const locationQuery = location === 'Tel Aviv' ? 'Tel Aviv' : location
    
    const params = new URLSearchParams({
      'location.address': locationQuery,
      'start_date.range_start': new Date(startDate).toISOString(),
      'start_date.range_end': new Date(endDate).toISOString(),
      expand: 'venue,ticket_availability',
      'sort_by': 'date'
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(
        `https://www.eventbriteapi.com/v3/events/search/?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`[EventsAgent] Eventbrite returned status ${response.status}`)
        return []
      }

      const data = await response.json()
      
      if (!data.events || data.events.length === 0) {
        return []
      }

      return data.events.map((event: any) => {
        // Determine event type and impact
        const name = event.name?.text || ''
        const description = event.description?.text || ''
        const combined = `${name} ${description}`.toLowerCase()
        
        let type: EventSource['type'] = 'other'
        let impact: EventSource['impact'] = 'low'
        
        // Type detection
        if (combined.includes('conference') || combined.includes('כנס')) {
          type = 'conference'
          impact = 'high'
        } else if (combined.includes('concert') || combined.includes('קונצרט')) {
          type = 'concert'
          impact = combined.includes('festival') ? 'very_high' : 'high'
        } else if (combined.includes('festival') || combined.includes('פסטיבל')) {
          type = 'festival'
          impact = 'very_high'
        } else if (combined.includes('sport') || combined.includes('match') || combined.includes('משחק')) {
          type = 'sports'
          impact = 'medium'
        } else if (combined.includes('exhibition') || combined.includes('תערוכה')) {
          type = 'exhibition'
          impact = 'low'
        }
        
        // Impact based on capacity
        const capacity = event.capacity || 0
        if (capacity > 5000) impact = 'very_high'
        else if (capacity > 1000) impact = 'high'
        else if (capacity > 500) impact = 'medium'
        
        return {
          name: event.name?.text || 'Unknown Event',
          date: event.start?.local?.split('T')[0] || startDate,
          endDate: event.end?.local?.split('T')[0],
          impact,
          type,
          description: event.description?.text?.substring(0, 200) || '',
          venue: event.venue?.name,
          expectedAttendance: capacity,
          ticketsAvailable: event.ticket_availability?.has_available_tickets,
          priceRange: event.is_free ? 'Free' : 'Paid',
          source: 'eventbrite',
          confidence: 0.95
        }
      })
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[EventsAgent] Eventbrite request timeout')
      } else {
        console.warn('[EventsAgent] Eventbrite error:', error)
      }
      return []
    }
  } catch (error) {
    console.error('[EventsAgent] Eventbrite error:', error)
    return []
  }
}

/**
 * Get Israeli holidays for date range
 */
function getIsraeliHolidays(startDate: string, endDate: string): EventSource[] {
  const holidays: Array<{ name: string; date: string; impact: EventSource['impact'] }> = [
    // 2025
    { name: 'Tu BiShvat', date: '2025-02-13', impact: 'low' },
    { name: 'Purim', date: '2025-03-14', impact: 'medium' },
    { name: 'Passover (Pesach)', date: '2025-04-13', impact: 'very_high' },
    { name: 'Passover End', date: '2025-04-19', impact: 'very_high' },
    { name: 'Yom HaShoah', date: '2025-04-24', impact: 'low' },
    { name: 'Memorial Day', date: '2025-04-29', impact: 'low' },
    { name: 'Independence Day', date: '2025-04-30', impact: 'very_high' },
    { name: 'Lag BaOmer', date: '2025-05-18', impact: 'low' },
    { name: 'Shavuot', date: '2025-06-02', impact: 'medium' },
    { name: 'Rosh Hashanah', date: '2025-09-23', impact: 'very_high' },
    { name: 'Yom Kippur', date: '2025-10-02', impact: 'high' },
    { name: 'Sukkot', date: '2025-10-07', impact: 'very_high' },
    { name: 'Simchat Torah', date: '2025-10-14', impact: 'high' },
    { name: 'Hanukkah', date: '2025-12-15', impact: 'medium' },
    
    // 2026
    { name: 'Tu BiShvat', date: '2026-02-02', impact: 'low' },
    { name: 'Purim', date: '2026-03-03', impact: 'medium' },
    { name: 'Passover (Pesach)', date: '2026-04-02', impact: 'very_high' },
    { name: 'Passover End', date: '2026-04-08', impact: 'very_high' },
    { name: 'Memorial Day', date: '2026-04-22', impact: 'low' },
    { name: 'Independence Day', date: '2026-04-23', impact: 'very_high' },
    { name: 'Shavuot', date: '2026-05-22', impact: 'medium' },
    { name: 'Rosh Hashanah', date: '2026-09-12', impact: 'very_high' },
    { name: 'Yom Kippur', date: '2026-09-21', impact: 'high' },
    { name: 'Sukkot', date: '2026-09-26', impact: 'very_high' },
    { name: 'Simchat Torah', date: '2026-10-03', impact: 'high' },
    { name: 'Hanukkah', date: '2026-12-05', impact: 'medium' },
  ]

  const start = new Date(startDate)
  const end = new Date(endDate)

  return holidays
    .filter(h => {
      const hDate = new Date(h.date)
      return hDate >= start && hDate <= end
    })
    .map(h => ({
      name: h.name,
      date: h.date,
      impact: h.impact,
      type: 'holiday',
      description: `Israeli holiday: ${h.name}`,
      source: 'calendar',
      confidence: 1.0
    }))
}

/**
 * Get recurring local events
 */
function getLocalRecurringEvents(location: string, startDate: string, endDate: string): EventSource[] {
  // Tel Aviv specific events
  if (location.toLowerCase().includes('tel aviv')) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const events: EventSource[] = []

    // Check each day for recurring events
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      const dateStr = d.toISOString().split('T')[0]

      // Friday night (Kabbalat Shabbat)
      if (dayOfWeek === 5) {
        events.push({
          name: 'Kabbalat Shabbat at the Port',
          date: dateStr,
          impact: 'low',
          type: 'other',
          description: 'Weekly Shabbat celebration at Tel Aviv Port',
          venue: 'Tel Aviv Port',
          source: 'local',
          confidence: 0.8
        })
      }

      // Saturday (Shabbat activities)
      if (dayOfWeek === 6) {
        events.push({
          name: 'Namal Market',
          date: dateStr,
          impact: 'low',
          type: 'other',
          description: 'Saturday market at Tel Aviv Port',
          venue: 'Tel Aviv Port',
          source: 'local',
          confidence: 0.8
        })
      }
    }

    return events
  }

  return []
}

/**
 * Main function: Get enhanced events data
 */
export async function getEnhancedEvents(
  location: string,
  startDate: string,
  endDate: string
): Promise<EnhancedEventsResult> {
  console.log(`[EventsAgent] Fetching enhanced events for ${location}`)

  try {
    // Fetch from all sources in parallel
    const [eventbriteEvents, holidays, localEvents] = await Promise.all([
      fetchEventbriteEvents(location, startDate, endDate),
      Promise.resolve(getIsraeliHolidays(startDate, endDate)),
      Promise.resolve(getLocalRecurringEvents(location, startDate, endDate))
    ])

    // Combine all events
    const allEvents = [...eventbriteEvents, ...holidays, ...localEvents]

    // Sort by date and impact
    allEvents.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare

      const impactOrder = { very_high: 4, high: 3, medium: 2, low: 1 }
      return impactOrder[b.impact] - impactOrder[a.impact]
    })

    // Calculate summary
    const highImpactEvents = allEvents.filter(e => 
      e.impact === 'very_high' || e.impact === 'high'
    ).length

    const conferenceCount = allEvents.filter(e => e.type === 'conference').length
    const concertCount = allEvents.filter(e => e.type === 'concert' || e.type === 'festival').length
    const sportCount = allEvents.filter(e => e.type === 'sports').length
    const holidayCount = allEvents.filter(e => e.type === 'holiday').length

    // Calculate demand impact
    let demandImpact = 1.0

    allEvents.forEach(event => {
      switch (event.impact) {
        case 'very_high':
          demandImpact += 0.08
          break
        case 'high':
          demandImpact += 0.05
          break
        case 'medium':
          demandImpact += 0.02
          break
        case 'low':
          demandImpact += 0.01
          break
      }
    })

    demandImpact = Math.min(1.35, demandImpact) // Cap at 35% increase

    // Overall confidence
    const totalEvents = allEvents.length
    const eventbriteCount = eventbriteEvents.length
    const confidence = totalEvents > 0
      ? (eventbriteCount * 0.95 + holidays.length * 1.0 + localEvents.length * 0.8) / totalEvents
      : 0.5

    return {
      location,
      dateRange: `${startDate} to ${endDate}`,
      events: allEvents,
      summary: {
        totalEvents,
        highImpactEvents,
        conferenceCount,
        concertCount,
        sportCount,
        holidayCount,
        demandImpact
      },
      confidence,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('[EventsAgent] Error:', error)

    // Return holidays only as fallback
    const holidays = getIsraeliHolidays(startDate, endDate)
    const highImpactEvents = holidays.filter(e => 
      e.impact === 'very_high' || e.impact === 'high'
    ).length

    return {
      location,
      dateRange: `${startDate} to ${endDate}`,
      events: holidays,
      summary: {
        totalEvents: holidays.length,
        highImpactEvents,
        conferenceCount: 0,
        concertCount: 0,
        sportCount: 0,
        holidayCount: holidays.length,
        demandImpact: 1.0 + (highImpactEvents * 0.05)
      },
      confidence: 0.6,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Get events for single date
 */
export async function getEventsForDate(
  date: string,
  location: string = 'Tel Aviv'
): Promise<EventSource[]> {
  const result = await getEnhancedEvents(location, date, date)
  return result.events
}
