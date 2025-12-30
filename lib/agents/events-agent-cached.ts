/**
 * Enhanced Events Agent with Caching
 * Wraps the original events agent with cache layer
 */

import { discoverEvents as originalDiscoverEvents } from './events-agent'
import { getCachedData } from '@/lib/cache/external-data-cache'

/**
 * Discover events with caching (wrapper)
 */
export async function discoverEventsWithCache(
  location: string,
  date: string | Date,
  daysRange: number = 7
) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  const cacheKey = `${location}_${dateStr}_${daysRange}`

  return getCachedData(
    'tavily_events',
    cacheKey,
    () => originalDiscoverEvents(location, date, daysRange),
    { ttl: 24 * 60 * 60 } // Cache for 24 hours
  )
}

/**
 * Batch discover events with intelligent caching
 */
export async function discoverEventsBatchWithCache(
  location: string,
  dates: (string | Date)[],
  daysRange: number = 7
): Promise<Map<string, any>> {
  const results = new Map<string, any>()

  // Process in parallel but respect cache
  const promises = dates.map(async (date) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
    const result = await discoverEventsWithCache(location, dateStr, daysRange)
    return { dateStr, result }
  })

  const settled = await Promise.allSettled(promises)

  settled.forEach((outcome) => {
    if (outcome.status === 'fulfilled') {
      results.set(outcome.value.dateStr, outcome.value.result)
    }
  })

  return results
}
