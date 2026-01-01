/**
 * Enhanced Multi-Agent Orchestrator v2
 * Integrates ALL data sources for comprehensive pricing predictions
 */

import { discoverEvents, discoverEventsBatch } from './events-agent'
import { getHistoricalComparison, getHistoricalComparisonBatch } from './historical-agent'
import { gatherMarketStatistics } from './statistics-agent'
import { getTrendsForDate, getTrendsForDateRange } from './trends-agent'
import { analyzeBudget, analyzeBudgetBatch } from './budget-agent'
import { analyzeBookingVelocity, analyzeBookingVelocityBatch } from './velocity-agent'
import { getCompetitorPrices, getCompetitorPricesBatch } from './competitor-agent'
import { getIsraeliHolidays } from './holidays-agent'
import { getCachedData } from '@/lib/cache/external-data-cache'

interface ComprehensiveExternalData {
  // Events data
  events: Map<string, any>
  eventsConfidence: number
  
  // Historical data
  historical: Map<string, any>
  historicalConfidence: number
  
  // Market statistics
  statistics: any
  statisticsConfidence: number
  
  // Google Trends
  trends: Map<string, any>
  trendsConfidence: number
  
  // Budget analysis
  budget: any
  budgetConfidence: number
  
  // Booking velocity
  velocity: any
  velocityConfidence: number
  
  // Competitor prices
  competitors: Map<string, any>
  competitorsConfidence: number
  
  // Israeli holidays
  holidays: Map<string, any>
  holidaysConfidence: number
  
  // Overall metrics
  overallConfidence: number
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor'
  dataSources: string[]
  timestamp: string
}

interface OrchestratorOptions {
  includeEvents?: boolean
  includeHistorical?: boolean
  includeStatistics?: boolean
  includeTrends?: boolean
  includeBudget?: boolean
  includeVelocity?: boolean
  includeCompetitors?: boolean
  includeHolidays?: boolean
  batchOptimization?: boolean
  realTimeCompetitors?: boolean
  maxConcurrent?: number
}

/**
 * Enhanced orchestrator: Gather ALL external data sources
 */
export async function orchestrateComprehensiveData(
  hotelId: string,
  hotelName: string,
  location: string,
  targetDates: (string | Date)[],
  hotelBasePrice: number,
  options: OrchestratorOptions = {}
): Promise<ComprehensiveExternalData> {
  const {
    includeEvents = true,
    includeHistorical = true,
    includeStatistics = true,
    includeTrends = true,
    includeBudget = true,
    includeVelocity = true,
    includeCompetitors = true,
    includeHolidays = true,
    batchOptimization = true,
    realTimeCompetitors = false,
    maxConcurrent = 5,
  } = options

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 ENHANCED MULTI-AGENT ORCHESTRATOR v2 - STARTING')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📍 Hotel: ${hotelName} (${hotelId})`)
  console.log(`📍 Location: ${location}`)
  console.log(`📅 Target dates: ${targetDates.length} dates`)
  console.log(`💰 Base price: ₪${hotelBasePrice}`)
  console.log(`⚙️  Options: Events=${includeEvents}, Historical=${includeHistorical}, Stats=${includeStatistics}`)
  console.log(`⚙️  Trends=${includeTrends}, Budget=${includeBudget}, Velocity=${includeVelocity}`)
  console.log(`⚙️  Competitors=${includeCompetitors}, Holidays=${includeHolidays}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const startTime = Date.now()
  const dataSources: string[] = []

  // Convert dates to strings
  const dateStrings = targetDates.map(d => 
    typeof d === 'string' ? d : d.toISOString().split('T')[0]
  )
  const firstDate = dateStrings[0]
  const lastDate = dateStrings[dateStrings.length - 1]

  // Initialize result containers
  let eventsData = new Map<string, any>()
  let historicalData = new Map<string, any>()
  let statisticsData: any = null
  let trendsData = new Map<string, any>()
  let budgetData: any = null
  let velocityData: any = null
  let competitorsData = new Map<string, any>()
  let holidaysData = new Map<string, any>()
  
  let eventsConfidence = 0
  let historicalConfidence = 0
  let statisticsConfidence = 0
  let trendsConfidence = 0
  let budgetConfidence = 0
  let velocityConfidence = 0
  let competitorsConfidence = 0
  let holidaysConfidence = 0

  // Helper: Add timeout to promises
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, taskName: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${taskName} timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])
  }

  // === STAGE 1: Quick Data (Budget, Velocity, Holidays) ===
  console.log('\n📊 STAGE 1: Quick Internal Data...')
  const stage1Tasks: Promise<void>[] = []

  // Task 1: Budget Analysis (internal DB)
  if (includeBudget) {
    stage1Tasks.push(
      (async () => {
        try {
          console.log('💰 [Budget Agent] Starting...')
          const result = await withTimeout(
            analyzeBudget(hotelId, new Date(firstDate)),
            5000,
            'Budget Agent'
          )
          if (result) {
            budgetData = result
            budgetConfidence = result.confidence
            dataSources.push('budget_analysis')
            console.log(`✅ [Budget Agent] Complete - Gap: ₪${Math.round(result.budgetGap)}, Pressure: ${result.pricingPressure.toFixed(2)}x`)
          }
        } catch (error) {
          console.log('⚠️  [Budget Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // Task 2: Booking Velocity (internal DB)
  if (includeVelocity) {
    stage1Tasks.push(
      (async () => {
        try {
          console.log('🚀 [Velocity Agent] Starting...')
          const result = await withTimeout(
            analyzeBookingVelocity(hotelId, 30),
            5000,
            'Velocity Agent'
          )
          if (result) {
            velocityData = result
            velocityConfidence = result.confidence
            dataSources.push('booking_velocity')
            console.log(`✅ [Velocity Agent] Complete - Trend: ${result.trend}, Impact: ${result.pricingImpact.toFixed(2)}x`)
          }
        } catch (error) {
          console.log('⚠️  [Velocity Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // Task 3: Israeli Holidays (cached/API)
  if (includeHolidays) {
    stage1Tasks.push(
      (async () => {
        try {
          console.log('🕎 [Holidays Agent] Starting...')
          const result = await withTimeout(
            getCachedData(
              'israeli_holidays',
              `${firstDate}_${lastDate}`,
              () => getIsraeliHolidays(firstDate, lastDate),
              { ttl: 24 * 60 * 60 } // Cache for 24 hours
            ),
            5000,
            'Holidays Agent'
          )
          holidaysData = result
          holidaysConfidence = 0.95
          dataSources.push('israeli_holidays')
          console.log(`✅ [Holidays Agent] Complete - ${holidaysData.size} days with holidays`)
        } catch (error) {
          console.log('⚠️  [Holidays Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  await Promise.all(stage1Tasks)
  console.log(`✨ Stage 1 complete in ${Date.now() - startTime}ms`)

  // === STAGE 2: Medium Speed Data (Historical, Statistics, Trends) ===
  console.log('\n📈 STAGE 2: Historical & Market Data...')
  const stage2Tasks: Promise<void>[] = []

  // Task 4: Historical Comparison
  if (includeHistorical) {
    stage2Tasks.push(
      (async () => {
        try {
          console.log('📜 [Historical Agent] Starting...')
          const result = await withTimeout(
            batchOptimization && dateStrings.length > 5
              ? getHistoricalComparisonBatch(hotelId, hotelName, location, dateStrings, hotelBasePrice)
              : Promise.all(dateStrings.map(d => getHistoricalComparison(hotelId, hotelName, location, d, hotelBasePrice))).then(results => {
                  const map = new Map()
                  results.forEach((r, i) => r && map.set(dateStrings[i], r))
                  return map
                }),
            15000,
            'Historical Agent'
          )
          historicalData = result
          historicalConfidence = result.size > 0 ? 0.8 : 0.3
          dataSources.push('historical_data')
          console.log(`✅ [Historical Agent] Complete - ${result.size} dates analyzed`)
        } catch (error) {
          console.log('⚠️  [Historical Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // Task 5: Market Statistics
  if (includeStatistics) {
    stage2Tasks.push(
      (async () => {
        try {
          console.log('📊 [Statistics Agent] Starting...')
          const result = await withTimeout(
            getCachedData(
              'market_statistics',
              `${location}_${firstDate.substring(0, 7)}`,
              () => gatherMarketStatistics(location),
              { ttl: 60 * 60 } // Cache for 1 hour
            ),
            10000,
            'Statistics Agent'
          )
          statisticsData = result
          statisticsConfidence = result.confidence || 0.7
          dataSources.push('market_statistics')
          console.log(`✅ [Statistics Agent] Complete - Avg rate: ₪${result.tourism?.avgNightlyRate || 'N/A'}`)
        } catch (error) {
          console.log('⚠️  [Statistics Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // Task 6: Google Trends
  if (includeTrends) {
    stage2Tasks.push(
      (async () => {
        try {
          console.log('📈 [Trends Agent] Starting...')
          const result = await withTimeout(
            getTrendsForDateRange(firstDate, lastDate, 'hotels tel aviv', 'IL'),
            10000,
            'Trends Agent'
          )
          trendsData = result
          trendsConfidence = result.size > 0 ? (result.values().next().value?.confidence || 0.7) : 0.4
          dataSources.push('google_trends')
          console.log(`✅ [Trends Agent] Complete - ${result.size} dates with trends data`)
        } catch (error) {
          console.log('⚠️  [Trends Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  await Promise.all(stage2Tasks)
  console.log(`✨ Stage 2 complete in ${Date.now() - startTime}ms`)

  // === STAGE 3: Slow Data (Events, Competitors) ===
  console.log('\n🌐 STAGE 3: External Data (Events & Competitors)...')
  const stage3Tasks: Promise<void>[] = []

  // Task 7: Events Discovery
  if (includeEvents) {
    stage3Tasks.push(
      (async () => {
        try {
          console.log('🎉 [Events Agent] Starting...')
          const result = await withTimeout(
            batchOptimization && dateStrings.length > 5
              ? getCachedData(
                  'tavily_events_batch',
                  `${location}_${firstDate}_${lastDate}`,
                  () => discoverEventsBatch(location, dateStrings, 7),
                  { ttl: 60 * 60 } // Cache for 1 hour
                )
              : Promise.all(dateStrings.map(d => discoverEvents(location, d, 7))).then(results => {
                  const map = new Map()
                  results.forEach((r, i) => map.set(dateStrings[i], r))
                  return map
                }),
            20000,
            'Events Agent'
          )
          eventsData = result
          eventsConfidence = result.size > 0 ? 0.75 : 0.3
          dataSources.push('tavily_events')
          console.log(`✅ [Events Agent] Complete - ${result.size} dates with events`)
        } catch (error) {
          console.log('⚠️  [Events Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // Task 8: Competitor Prices
  if (includeCompetitors) {
    stage3Tasks.push(
      (async () => {
        try {
          console.log('🏨 [Competitor Agent] Starting...')
          const result = await withTimeout(
            getCompetitorPricesBatch(hotelId, location, dateStrings, hotelBasePrice, realTimeCompetitors),
            realTimeCompetitors ? 60000 : 10000,
            'Competitor Agent'
          )
          competitorsData = result
          competitorsConfidence = result.size > 0 ? (result.values().next().value?.confidence || 0.7) : 0.3
          dataSources.push('competitor_prices')
          console.log(`✅ [Competitor Agent] Complete - ${result.size} dates analyzed`)
        } catch (error) {
          console.log('⚠️  [Competitor Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  await Promise.all(stage3Tasks)

  // === Calculate Overall Metrics ===
  const confidences = [
    eventsConfidence,
    historicalConfidence,
    statisticsConfidence,
    trendsConfidence,
    budgetConfidence,
    velocityConfidence,
    competitorsConfidence,
    holidaysConfidence,
  ].filter(c => c > 0)

  const overallConfidence = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : 0.3

  const dataQuality: 'excellent' | 'good' | 'fair' | 'poor' =
    overallConfidence > 0.85 ? 'excellent' :
    overallConfidence > 0.70 ? 'good' :
    overallConfidence > 0.50 ? 'fair' : 'poor'

  const totalTime = Date.now() - startTime

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ ORCHESTRATION COMPLETE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`⏱️  Total time: ${totalTime}ms`)
  console.log(`📊 Data sources: ${dataSources.join(', ')}`)
  console.log(`🎯 Overall confidence: ${(overallConfidence * 100).toFixed(0)}%`)
  console.log(`⭐ Data quality: ${dataQuality}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  return {
    events: eventsData,
    eventsConfidence,
    historical: historicalData,
    historicalConfidence,
    statistics: statisticsData,
    statisticsConfidence,
    trends: trendsData,
    trendsConfidence,
    budget: budgetData,
    budgetConfidence,
    velocity: velocityData,
    velocityConfidence,
    competitors: competitorsData,
    competitorsConfidence,
    holidays: holidaysData,
    holidaysConfidence,
    overallConfidence,
    dataQuality,
    dataSources,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Get recommended orchestrator options based on prediction scope
 */
export function getRecommendedOptions(
  numDates: number,
  daysAhead: number
): OrchestratorOptions {
  // Near-term predictions (0-7 days) - need real-time data
  if (daysAhead <= 7) {
    return {
      includeEvents: true,
      includeHistorical: true,
      includeStatistics: true,
      includeTrends: true,
      includeBudget: true,
      includeVelocity: true,
      includeCompetitors: true,
      includeHolidays: true,
      batchOptimization: false,
      realTimeCompetitors: true,
      maxConcurrent: 5,
    }
  }

  // Short-term predictions (8-30 days) - balanced
  if (daysAhead <= 30) {
    return {
      includeEvents: true,
      includeHistorical: true,
      includeStatistics: true,
      includeTrends: true,
      includeBudget: true,
      includeVelocity: true,
      includeCompetitors: true,
      includeHolidays: true,
      batchOptimization: true,
      realTimeCompetitors: false,
      maxConcurrent: 5,
    }
  }

  // Long-term predictions (30+ days) - focus on trends and patterns
  return {
    includeEvents: true,
    includeHistorical: true,
    includeStatistics: true,
    includeTrends: true,
    includeBudget: false, // Budget less relevant for long term
    includeVelocity: false, // Velocity less relevant for long term
    includeCompetitors: false, // Competitors too variable long term
    includeHolidays: true,
    batchOptimization: true,
    realTimeCompetitors: false,
    maxConcurrent: 4,
  }
}

/**
 * Extract impact factors for a specific date from orchestrated data
 */
export function extractDateImpactFactors(
  date: string,
  data: ComprehensiveExternalData
): {
  eventImpact: number
  historicalTrend: 'increasing' | 'decreasing' | 'stable' | 'unknown'
  trendsScore: number
  budgetPressure: number
  velocityImpact: number
  competitorAvg: number | null
  holidayImpact: number
  hasEvents: boolean
  hasHistoricalData: boolean
} {
  // Events impact
  const events = data.events.get(date)
  const eventImpact = events?.events?.length > 0 
    ? Math.max(...events.events.map((e: any) => {
        if (e.impact === 'very_high') return 1.4
        if (e.impact === 'high') return 1.25
        if (e.impact === 'medium') return 1.15
        return 1.05
      }))
    : 1.0

  // Historical trend
  const historical = data.historical.get(date)
  const historicalTrend = historical?.trend || 'unknown'

  // Google Trends score
  const trends = data.trends.get(date)
  const trendsScore = trends?.currentInterest || 70

  // Budget pressure
  const budgetPressure = data.budget?.pricingPressure || 1.0

  // Velocity impact
  const velocityImpact = data.velocity?.pricingImpact || 1.0

  // Competitor average
  const competitors = data.competitors.get(date)
  const competitorAvg = competitors?.averagePrice > 0 ? competitors.averagePrice : null

  // Holiday impact
  const holidays = data.holidays.get(date)
  const holidayImpact = holidays?.length > 0
    ? Math.max(...holidays.map((h: any) => h.tourismImpact || 1.0))
    : 1.0

  return {
    eventImpact: Math.max(eventImpact, holidayImpact),
    historicalTrend,
    trendsScore,
    budgetPressure,
    velocityImpact,
    competitorAvg,
    holidayImpact,
    hasEvents: events?.events?.length > 0 || holidays?.length > 0,
    hasHistoricalData: !!historical,
  }
}

/**
 * Check if external data sources are available
 */
export async function checkExternalDataAvailability(): Promise<{
  tavily: boolean
  serpapi: boolean
  apify: boolean
  hebcal: boolean
  database: boolean
  overall: boolean
}> {
  const tavily = !!process.env.TAVILY_API_KEY
  const serpapi = !!process.env.SERPAPI_KEY
  const apify = !!process.env.APIFY_API_TOKEN
  const hebcal = true // Hebcal is free API
  const database = true // Always have DB access
  
  const overall = tavily || database

  return { tavily, serpapi, apify, hebcal, database, overall }
}
