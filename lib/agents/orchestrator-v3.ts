/**
 * Enhanced Multi-Agent Orchestrator V3
 * Integrates ALL data sources including new V2 agents:
 * - Velocity V2 (booking curve, cancellations, price sensitivity)
 * - CBS (Israeli tourism statistics)
 * - Weather (OpenWeather API)
 * - Events V2 (Eventbrite + holidays + local)
 * - Historical, Statistics, Trends, Competitors
 */

import { analyzeEnhancedVelocity } from './velocity-agent-v2'
import { analyzeCBSMarketTrends, getCBSPricingRecommendation } from './cbs-agent'
import { getWeatherForecast } from './weather-agent'
import { getEnhancedEvents } from './events-agent-v2'
import { getHistoricalComparison } from './historical-agent'
import { gatherMarketStatistics } from './statistics-agent'
import { getTrendsForDateRange } from './trends-agent'
import { getCompetitorPrices } from './competitor-agent'

interface ComprehensiveDataV3 {
  // Booking Intelligence V2
  velocity: {
    bookingCurve: any
    cancellations: any
    priceSensitivity: any
    mlFeatures: {
      velocityMomentum: number
      lastMinuteRatio: number
      cancellationRisk: number
      priceElasticity: number
      demandPressure: number
    }
    confidence: number
  } | null

  // CBS Tourism Statistics
  cbs: {
    current: any
    previous: any
    yearOverYear: any
    trends: any
    recommendation: any
    confidence: number
  } | null

  // Weather Forecast
  weather: {
    forecast: Array<{
      date: string
      score: number
      demandImpact: number
      temperature: number
      condition: string
    }>
    averageScore: number
    averageDemandImpact: number
    confidence: number
  } | null

  // Events V2
  events: {
    events: Array<any>
    summary: {
      totalEvents: number
      highImpactEvents: number
      demandImpact: number
    }
    confidence: number
  } | null

  // Historical Data
  historical: Map<string, any>
  historicalConfidence: number

  // Market Statistics
  statistics: any
  statisticsConfidence: number

  // Google Trends
  trends: Map<string, any>
  trendsConfidence: number

  // Competitor Prices
  competitors: Map<string, any>
  competitorsConfidence: number

  // Overall
  overallConfidence: number
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor'
  dataSources: string[]
  timestamp: string
  processingTime: number
}

interface OrchestratorOptionsV3 {
  includeVelocityV2?: boolean
  includeCBS?: boolean
  includeWeather?: boolean
  includeEventsV2?: boolean
  includeHistorical?: boolean
  includeStatistics?: boolean
  includeTrends?: boolean
  includeCompetitors?: boolean
  maxConcurrent?: number
}

/**
 * Main V3 Orchestrator: Gather ALL external data with new V2 agents
 */
export async function orchestrateComprehensiveDataV3(
  hotelId: string,
  hotelName: string,
  location: string,
  targetDates: (string | Date)[],
  hotelBasePrice: number,
  options: OrchestratorOptionsV3 = {}
): Promise<ComprehensiveDataV3> {
  const {
    includeVelocityV2 = true,
    includeCBS = true,
    includeWeather = true,
    includeEventsV2 = true,
    includeHistorical = true,
    includeStatistics = true,
    includeTrends = true,
    includeCompetitors = true,
    maxConcurrent = 8,
  } = options

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 MULTI-AGENT ORCHESTRATOR V3 - STARTING')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📍 Hotel: ${hotelName} (${hotelId})`)
  console.log(`📍 Location: ${location}`)
  console.log(`📅 Dates: ${targetDates.length} dates`)
  console.log(`💰 Base: ₪${hotelBasePrice}`)
  console.log(`⚙️  V2 Agents: Velocity=${includeVelocityV2}, CBS=${includeCBS}, Weather=${includeWeather}, Events=${includeEventsV2}`)
  console.log(`⚙️  Classic: Historical=${includeHistorical}, Stats=${includeStatistics}, Trends=${includeTrends}, Competitors=${includeCompetitors}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const startTime = Date.now()
  const dataSources: string[] = []

  // Convert dates
  const dateStrings = targetDates.map(d =>
    typeof d === 'string' ? d : d.toISOString().split('T')[0]
  )
  const firstDate = dateStrings[0]
  const lastDate = dateStrings[dateStrings.length - 1]

  // Initialize results
  let velocityResult: any = null
  let cbsResult: any = null
  let weatherResult: any = null
  let eventsResult: any = null
  let historicalData = new Map<string, any>()
  let statisticsData: any = null
  let trendsData = new Map<string, any>()
  let competitorsData = new Map<string, any>()

  let velocityConfidence = 0
  let cbsConfidence = 0
  let weatherConfidence = 0
  let eventsConfidence = 0
  let historicalConfidence = 0
  let statisticsConfidence = 0
  let trendsConfidence = 0
  let competitorsConfidence = 0

  // Helper: Timeout
  const withTimeout = <T>(promise: Promise<T>, ms: number, name: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${name} timeout after ${ms}ms`)), ms)
      ),
    ])
  }

  // === STAGE 1: New V2 Agents (High Priority) ===
  console.log('\n📊 STAGE 1: Enhanced V2 Agents...')
  const stage1Tasks: Promise<void>[] = []

  // 1. Velocity Agent V2
  if (includeVelocityV2) {
    stage1Tasks.push(
      (async () => {
        try {
          console.log('🚀 [Velocity V2] Starting...')
          const result = await withTimeout(
            analyzeEnhancedVelocity(hotelId, 30),
            8000,
            'Velocity V2'
          )
          if (result) {
            velocityResult = result
            velocityConfidence = result.confidence
            dataSources.push('velocity_v2')
            console.log(`✅ [Velocity V2] Complete - ML Features ready, confidence: ${result.confidence.toFixed(2)}`)
          }
        } catch (error) {
          console.warn('⚠️  [Velocity V2] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // 2. CBS Tourism Statistics
  if (includeCBS) {
    stage1Tasks.push(
      (async () => {
        try {
          console.log('📊 [CBS Agent] Starting...')
          const currentDate = new Date(firstDate)
          
          const trends = await analyzeCBSMarketTrends(currentDate, 'tel_aviv')
          const recommendation = await getCBSPricingRecommendation(trends, hotelBasePrice)
          
          cbsResult = {
            trends,
            recommendation
          }
          cbsConfidence = 0.85
          dataSources.push('cbs_tourism')
          console.log(`✅ [CBS Agent] Complete - Market analyzed`)
        } catch (error) {
          console.warn('⚠️  [CBS Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // 3. Weather Forecast
  if (includeWeather) {
    stage1Tasks.push(
      (async () => {
        try {
          console.log('⛅ [Weather Agent] Starting...')
          const result = await withTimeout(
            getWeatherForecast(firstDate, lastDate, location),
            8000,
            'Weather Agent'
          )
          if (result && result.forecastDays) {
            const avgScore = result.forecastDays.reduce((sum: number, f: any) => sum + f.weatherScore, 0) / result.forecastDays.length
            const avgImpact = result.forecastDays.reduce((sum: number, f: any) => sum + f.demandImpact, 0) / result.forecastDays.length
            
            weatherResult = {
              forecast: result.forecastDays,
              averageScore: avgScore,
              averageDemandImpact: avgImpact
            }
            weatherConfidence = 0.9
            dataSources.push('weather_forecast')
            console.log(`✅ [Weather Agent] Complete - Avg Score: ${avgScore.toFixed(0)}/100, Impact: ${avgImpact.toFixed(2)}x`)
          }
        } catch (error) {
          console.warn('⚠️  [Weather Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // 4. Events V2 (Eventbrite + Holidays)
  if (includeEventsV2) {
    stage1Tasks.push(
      (async () => {
        try {
          console.log('🎉 [Events V2] Starting...')
          const result = await withTimeout(
            getEnhancedEvents(location, firstDate, lastDate),
            10000,
            'Events V2'
          )
          if (result) {
            eventsResult = {
              events: result.events,
              summary: result.summary
            }
            eventsConfidence = result.confidence
            dataSources.push('events_v2')
            console.log(`✅ [Events V2] Complete - ${result.summary.totalEvents} events, ${result.summary.highImpactEvents} high-impact`)
          }
        } catch (error) {
          console.warn('⚠️  [Events V2] Failed:', (error as Error).message)
        }
      })()
    )
  }

  await Promise.allSettled(stage1Tasks)

  // === STAGE 2: Classic Agents ===
  console.log('\n📊 STAGE 2: Classic Agents...')
  const stage2Tasks: Promise<void>[] = []

  // 5. Historical Data
  if (includeHistorical) {
    stage2Tasks.push(
      (async () => {
        try {
          console.log('📅 [Historical Agent] Starting...')
          for (const dateStr of dateStrings.slice(0, 10)) {
            const result = await getHistoricalComparison(
              hotelId,
              hotelName,
              location,
              dateStr,
              hotelBasePrice
            )
            if (result) {
              historicalData.set(dateStr, result)
            }
          }
          historicalConfidence = 0.9
          if (historicalData.size > 0) {
            dataSources.push('historical_data')
            console.log(`✅ [Historical Agent] Complete - ${historicalData.size} dates`)
          }
        } catch (error) {
          console.warn('⚠️  [Historical Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // 6. Market Statistics
  if (includeStatistics) {
    stage2Tasks.push(
      (async () => {
        try {
          console.log('📈 [Statistics Agent] Starting...')
          const result = await withTimeout(
            gatherMarketStatistics(location, firstDate),
            8000,
            'Statistics Agent'
          )
          if (result) {
            statisticsData = result
            statisticsConfidence = result.confidence
            dataSources.push('market_statistics')
            console.log(`✅ [Statistics Agent] Complete - Sentiment: ${result.marketSentiment}`)
          }
        } catch (error) {
          console.warn('⚠️  [Statistics Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // 7. Google Trends
  if (includeTrends) {
    stage2Tasks.push(
      (async () => {
        try {
          console.log('📊 [Trends Agent] Starting...')
          const result = await withTimeout(
            getTrendsForDateRange(firstDate, lastDate),
            10000,
            'Trends Agent'
          )
          if (result && result.size > 0) {
            trendsData = result
            trendsConfidence = 0.8
            dataSources.push('google_trends')
            console.log(`✅ [Trends Agent] Complete - ${result.size} data points`)
          }
        } catch (error) {
          console.warn('⚠️  [Trends Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // 8. Competitor Prices
  if (includeCompetitors) {
    stage2Tasks.push(
      (async () => {
        try {
          console.log('💰 [Competitors Agent] Starting...')
          for (const dateStr of dateStrings.slice(0, 10)) {
            const result = await getCompetitorPrices(hotelName, location, dateStr)
            if (result && result.competitors.length > 0) {
              competitorsData.set(dateStr, result)
            }
          }
          if (competitorsData.size > 0) {
            competitorsConfidence = 0.85
            dataSources.push('competitor_prices')
            console.log(`✅ [Competitors Agent] Complete - ${competitorsData.size} dates`)
          }
        } catch (error) {
          console.warn('⚠️  [Competitors Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  await Promise.allSettled(stage2Tasks)

  // === CALCULATE OVERALL CONFIDENCE ===
  const confidences = [
    velocityConfidence,
    cbsConfidence,
    weatherConfidence,
    eventsConfidence,
    historicalConfidence,
    statisticsConfidence,
    trendsConfidence,
    competitorsConfidence,
  ].filter(c => c > 0)

  const overallConfidence = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : 0.5

  let dataQuality: 'excellent' | 'good' | 'fair' | 'poor'
  if (overallConfidence >= 0.85) dataQuality = 'excellent'
  else if (overallConfidence >= 0.7) dataQuality = 'good'
  else if (overallConfidence >= 0.5) dataQuality = 'fair'
  else dataQuality = 'poor'

  const processingTime = Date.now() - startTime

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ ORCHESTRATOR V3 COMPLETE')
  console.log(`📊 Data Sources: ${dataSources.length} active`)
  console.log(`🎯 Overall Confidence: ${(overallConfidence * 100).toFixed(1)}%`)
  console.log(`📈 Data Quality: ${dataQuality.toUpperCase()}`)
  console.log(`⏱️  Processing Time: ${processingTime}ms`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  return {
    velocity: velocityResult ? {
      bookingCurve: velocityResult.bookingCurve,
      cancellations: velocityResult.cancellations,
      priceSensitivity: velocityResult.priceSensitivity,
      mlFeatures: velocityResult.mlFeatures,
      confidence: velocityConfidence
    } : null,

    cbs: cbsResult ? {
      ...cbsResult,
      confidence: cbsConfidence
    } : null,

    weather: weatherResult ? {
      ...weatherResult,
      confidence: weatherConfidence
    } : null,

    events: eventsResult ? {
      ...eventsResult,
      confidence: eventsConfidence
    } : null,

    historical: historicalData,
    historicalConfidence,

    statistics: statisticsData,
    statisticsConfidence,

    trends: trendsData,
    trendsConfidence,

    competitors: competitorsData,
    competitorsConfidence,

    overallConfidence,
    dataQuality,
    dataSources,
    timestamp: new Date().toISOString(),
    processingTime
  }
}

/**
 * Single-date version for quick predictions
 */
export async function orchestrateSingleDateV3(
  hotelId: string,
  hotelName: string,
  location: string,
  targetDate: string,
  hotelBasePrice: number,
  options: OrchestratorOptionsV3 = {}
): Promise<ComprehensiveDataV3> {
  return orchestrateComprehensiveDataV3(
    hotelId,
    hotelName,
    location,
    [targetDate],
    hotelBasePrice,
    options
  )
}
