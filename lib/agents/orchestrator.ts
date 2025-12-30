/**
 * Multi-Agent Orchestrator
 * Coordinates all agents to gather comprehensive external data
 * for price predictions with enhanced confidence calculations
 */

import { discoverEvents, discoverEventsBatch } from './events-agent'
import { getHistoricalComparison, getHistoricalComparisonBatch } from './historical-agent'
import { gatherMarketStatistics } from './statistics-agent'
import { getCachedData } from '@/lib/cache/external-data-cache'

interface EnhancedExternalData {
  // Events data
  events: Map<string, any>
  eventsConfidence: number
  
  // Historical data
  historical: Map<string, any>
  historicalConfidence: number
  
  // Market statistics
  statistics: any
  statisticsConfidence: number
  
  // Overall metrics
  overallConfidence: number
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor'
  timestamp: string
}

interface OrchestratorOptions {
  includeEvents?: boolean
  includeHistorical?: boolean
  includeStatistics?: boolean
  batchOptimization?: boolean
  maxConcurrent?: number
}

/**
 * Main orchestrator function: Gather all external data for predictions
 */
export async function orchestrateExternalData(
  hotelId: string,
  hotelName: string,
  location: string,
  targetDates: (string | Date)[],
  hotelBasePrice: number,
  options: OrchestratorOptions = {}
): Promise<EnhancedExternalData> {
  const {
    includeEvents = true,
    includeHistorical = true,
    includeStatistics = true,
    batchOptimization = true,
    maxConcurrent = 3,
  } = options

  console.log(`[Orchestrator] Starting data collection for ${targetDates.length} dates`)
  console.log(`[Orchestrator] Hotel: ${hotelName}, Location: ${location}`)
  console.log(`[Orchestrator] Options: Events=${includeEvents}, Historical=${includeHistorical}, Stats=${includeStatistics}`)
  console.log(`[Orchestrator] Environment: TAVILY_API_KEY=${process.env.TAVILY_API_KEY ? '✓ Set' : '✗ Missing'}`)

  const startTime = Date.now()

  // Initialize result containers
  let eventsData = new Map<string, any>()
  let historicalData = new Map<string, any>()
  let statisticsData: any = null
  
  let eventsConfidence = 0
  let historicalConfidence = 0
  let statisticsConfidence = 0

  // Helper function to add timeout to any promise
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, taskName: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${taskName} timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])
  }

  // Run agents in parallel where possible
  const tasks: Promise<void>[] = []

  // Task 1: Events Discovery
  if (includeEvents) {
    const eventsTask = async () => {
      try {
        console.log('[Orchestrator] Starting Events Agent with caching...')
        const eventsPromise = async () => {
          if (batchOptimization && targetDates.length > 5) {
            // Cache key for batch
            const dateRange = `${targetDates[0]}_to_${targetDates[targetDates.length - 1]}`
            const cacheKey = `${location}_batch_${dateRange}_${targetDates.length}`
            return getCachedData(
              'tavily_events_batch',
              cacheKey,
              () => discoverEventsBatch(location, targetDates, 7),
              { ttl: 24 * 60 * 60 } // 24 hours
            )
          } else {
            // For small sets, fetch individually with cache
            const results = new Map<string, any>()
            for (const date of targetDates) {
              const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
              const cacheKey = `${location}_${dateStr}_7days`
              const result = await getCachedData(
                'tavily_events',
                cacheKey,
                () => discoverEvents(location, date, 7),
                { ttl: 24 * 60 * 60 } // 24 hours
              )
              results.set(dateStr, result)
            }
            return results
          }
        }
        
        eventsData = await withTimeout(eventsPromise(), 10000, 'Events Agent')
        
        // Calculate average confidence
        const confidences = Array.from(eventsData.values()).map(v => v.confidence || 0)
        eventsConfidence = confidences.length > 0 
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
          : 0
        
        console.log(`[Orchestrator] Events Agent completed: ${eventsData.size} dates, ${(eventsConfidence * 100).toFixed(0)}% confidence`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Orchestrator] Events Agent failed:', errorMsg)
        eventsConfidence = 0
      }
    }
    tasks.push(eventsTask())
  }

  // Task 2: Historical Data
  if (includeHistorical) {
    const historicalTask = async () => {
      try {
        console.log('[Orchestrator] Starting Historical Agent...')
        const historicalPromise = async () => {
          if (batchOptimization) {
            return await getHistoricalComparisonBatch(
              hotelId,
              hotelName,
              location,
              targetDates,
              hotelBasePrice
            )
          } else {
            const results = new Map<string, any>()
            for (const date of targetDates) {
              const result = await getHistoricalComparison(
                hotelId,
                hotelName,
                location,
                date,
                hotelBasePrice
              )
              results.set(result.targetDate, result)
            }
            return results
          }
        }

        historicalData = await withTimeout(historicalPromise(), 10000, 'Historical Agent')

        // Calculate average confidence
        const confidences = Array.from(historicalData.values()).map(v => v.confidence || 0)
        historicalConfidence = confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0

        console.log(`[Orchestrator] Historical Agent completed: ${historicalData.size} dates, ${(historicalConfidence * 100).toFixed(0)}% confidence`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Orchestrator] Historical Agent failed:', errorMsg)
        historicalConfidence = 0
      }
    }
    tasks.push(historicalTask())
  }

  // Task 3: Market Statistics (run once for all dates)
  if (includeStatistics) {
    const statisticsTask = async () => {
      try {
        console.log('[Orchestrator] Starting Statistics Agent with caching...')
        // Use middle date or current date
        const targetDate = targetDates.length > 0 
          ? targetDates[Math.floor(targetDates.length / 2)] 
          : new Date()
        
        const dateStr = typeof targetDate === 'string' ? targetDate : targetDate.toISOString().split('T')[0]
        const cacheKey = `${location}_${dateStr}`
        
        statisticsData = await withTimeout(
          getCachedData(
            'tavily_statistics',
            cacheKey,
            () => gatherMarketStatistics(location, targetDate),
            { ttl: 12 * 60 * 60 } // 12 hours (statistics change less frequently)
          ),
          8000,
          'Statistics Agent'
        )
        statisticsConfidence = statisticsData?.confidence || 0

        console.log(`[Orchestrator] Statistics Agent completed: ${(statisticsConfidence * 100).toFixed(0)}% confidence`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Orchestrator] Statistics Agent failed:', errorMsg)
        statisticsConfidence = 0
      }
    }
    tasks.push(statisticsTask())
  }

  // Execute all tasks in parallel
  await Promise.all(tasks)

  // Calculate overall metrics
  const activeAgents = [includeEvents, includeHistorical, includeStatistics].filter(Boolean).length
  const totalConfidence = eventsConfidence + historicalConfidence + statisticsConfidence
  const overallConfidence = activeAgents > 0 ? totalConfidence / activeAgents : 0

  // Determine data quality
  let dataQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
  if (overallConfidence >= 0.8) dataQuality = 'excellent'
  else if (overallConfidence >= 0.65) dataQuality = 'good'
  else if (overallConfidence >= 0.45) dataQuality = 'fair'

  const duration = Date.now() - startTime
  console.log(`[Orchestrator] Completed in ${(duration / 1000).toFixed(2)}s`)
  console.log(`[Orchestrator] Overall Confidence: ${(overallConfidence * 100).toFixed(0)}%, Quality: ${dataQuality}`)
  console.log(`[Orchestrator] Breakdown: Events=${(eventsConfidence * 100).toFixed(0)}%, Historical=${(historicalConfidence * 100).toFixed(0)}%, Stats=${(statisticsConfidence * 100).toFixed(0)}%`)
  
  // Log any data collection issues
  if (includeEvents && eventsConfidence === 0) {
    console.warn(`[Orchestrator] ⚠️ Events Agent returned no data - check TAVILY_API_KEY`)
  }
  if (includeHistorical && historicalConfidence === 0) {
    console.warn(`[Orchestrator] ⚠️ Historical Agent returned no data - check database`)
  }
  if (includeStatistics && statisticsConfidence === 0) {
    console.warn(`[Orchestrator] ⚠️ Statistics Agent returned no data`)
  }

  return {
    events: eventsData,
    eventsConfidence,
    historical: historicalData,
    historicalConfidence,
    statistics: statisticsData,
    statisticsConfidence,
    overallConfidence,
    dataQuality,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Quick check: Verify if external data sources are available
 */
export async function checkExternalDataAvailability(): Promise<{
  tavily: boolean
  database: boolean
  overall: boolean
}> {
  const hasTavily = !!process.env.TAVILY_API_KEY
  const hasDatabase = true // Always true in this app

  return {
    tavily: hasTavily,
    database: hasDatabase,
    overall: hasTavily && hasDatabase,
  }
}

/**
 * Get recommended orchestrator options based on prediction scope
 */
export function getRecommendedOptions(
  datesCount: number,
  daysAhead: number
): OrchestratorOptions {
  // For far-future predictions (>60 days), rely more on historical patterns
  if (daysAhead > 60) {
    return {
      includeEvents: datesCount <= 30, // Only for smaller sets
      includeHistorical: true,
      includeStatistics: true,
      batchOptimization: true,
      maxConcurrent: 3,
    }
  }

  // For near-term predictions (<30 days), events are critical
  if (daysAhead < 30) {
    return {
      includeEvents: true,
      includeHistorical: true,
      includeStatistics: true,
      batchOptimization: datesCount > 10,
      maxConcurrent: 3,
    }
  }

  // Default for mid-range
  return {
    includeEvents: true,
    includeHistorical: true,
    includeStatistics: true,
    batchOptimization: datesCount > 5,
    maxConcurrent: 3,
  }
}

/**
 * Extract impact factors from orchestrated data for a specific date
 */
export function extractDateImpactFactors(
  date: string,
  enhancedData: EnhancedExternalData
): {
  hasEvents: boolean
  eventImpact: number
  hasHistoricalData: boolean
  historicalTrend: string
  marketSentiment: string
  overallImpact: number
} {
  // Events
  const dateEvents = enhancedData.events.get(date)
  const hasEvents = dateEvents && dateEvents.events && dateEvents.events.length > 0
  let eventImpact = 1.0

  if (hasEvents) {
    // Find highest impact event
    const impacts = dateEvents.events.map((e: any) => {
      switch (e.impact) {
        case 'very_high': return 1.4
        case 'high': return 1.25
        case 'medium': return 1.15
        case 'low': return 1.05
        default: return 1.0
      }
    })
    eventImpact = Math.max(...impacts, 1.0)
  }

  // Historical
  const historical = enhancedData.historical.get(date)
  const hasHistoricalData = !!historical?.lastYearData
  const historicalTrend = historical?.trend || 'unknown'

  // Market
  const marketSentiment = enhancedData.statistics?.marketSentiment || 'neutral'

  // Calculate overall impact multiplier
  let overallImpact = 1.0
  
  // Events contribution
  overallImpact *= eventImpact
  
  // Historical trend contribution
  if (historicalTrend === 'increasing') {
    overallImpact *= 1.05
  } else if (historicalTrend === 'decreasing') {
    overallImpact *= 0.95
  }
  
  // Market sentiment contribution
  if (marketSentiment === 'very_positive') {
    overallImpact *= 1.08
  } else if (marketSentiment === 'positive') {
    overallImpact *= 1.04
  } else if (marketSentiment === 'negative') {
    overallImpact *= 0.96
  } else if (marketSentiment === 'very_negative') {
    overallImpact *= 0.92
  }

  return {
    hasEvents,
    eventImpact,
    hasHistoricalData,
    historicalTrend,
    marketSentiment,
    overallImpact,
  }
}
