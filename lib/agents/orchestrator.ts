/**
 * Multi-Agent Orchestrator
 * Coordinates all agents to gather comprehensive external data
 * for price predictions with enhanced confidence calculations
 */

import { discoverEvents, discoverEventsBatch } from './events-agent'
import { getHistoricalComparison, getHistoricalComparisonBatch } from './historical-agent'
import { gatherMarketStatistics } from './statistics-agent'

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

  const startTime = Date.now()

  // Initialize result containers
  let eventsData = new Map<string, any>()
  let historicalData = new Map<string, any>()
  let statisticsData: any = null
  
  let eventsConfidence = 0
  let historicalConfidence = 0
  let statisticsConfidence = 0

  // Run agents in parallel where possible
  const tasks: Promise<void>[] = []

  // Task 1: Events Discovery
  if (includeEvents) {
    const eventsTask = async () => {
      try {
        console.log('[Orchestrator] Starting Events Agent...')
        if (batchOptimization && targetDates.length > 5) {
          eventsData = await discoverEventsBatch(location, targetDates, 7)
        } else {
          // For small sets, fetch individually
          for (const date of targetDates) {
            const result = await discoverEvents(location, date, 7)
            const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
            eventsData.set(dateStr, result)
          }
        }
        
        // Calculate average confidence
        const confidences = Array.from(eventsData.values()).map(v => v.confidence || 0)
        eventsConfidence = confidences.length > 0 
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
          : 0
        
        console.log(`[Orchestrator] Events Agent completed: ${eventsData.size} dates, ${(eventsConfidence * 100).toFixed(0)}% confidence`)
      } catch (error) {
        console.error('[Orchestrator] Events Agent failed:', error)
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
        if (batchOptimization) {
          historicalData = await getHistoricalComparisonBatch(
            hotelId,
            hotelName,
            location,
            targetDates,
            hotelBasePrice
          )
        } else {
          for (const date of targetDates) {
            const result = await getHistoricalComparison(
              hotelId,
              hotelName,
              location,
              date,
              hotelBasePrice
            )
            historicalData.set(result.targetDate, result)
          }
        }

        // Calculate average confidence
        const confidences = Array.from(historicalData.values()).map(v => v.confidence || 0)
        historicalConfidence = confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0

        console.log(`[Orchestrator] Historical Agent completed: ${historicalData.size} dates, ${(historicalConfidence * 100).toFixed(0)}% confidence`)
      } catch (error) {
        console.error('[Orchestrator] Historical Agent failed:', error)
        historicalConfidence = 0
      }
    }
    tasks.push(historicalTask())
  }

  // Task 3: Market Statistics (run once for all dates)
  if (includeStatistics) {
    const statisticsTask = async () => {
      try {
        console.log('[Orchestrator] Starting Statistics Agent...')
        // Use middle date or current date
        const targetDate = targetDates.length > 0 
          ? targetDates[Math.floor(targetDates.length / 2)] 
          : new Date()
        
        statisticsData = await gatherMarketStatistics(location, targetDate)
        statisticsConfidence = statisticsData?.confidence || 0

        console.log(`[Orchestrator] Statistics Agent completed: ${(statisticsConfidence * 100).toFixed(0)}% confidence`)
      } catch (error) {
        console.error('[Orchestrator] Statistics Agent failed:', error)
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
