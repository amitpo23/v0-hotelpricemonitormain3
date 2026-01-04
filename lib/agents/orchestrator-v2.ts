/**
 * Enhanced Multi-Agent Orchestrator v2
 * Integrates ALL data sources for comprehensive pricing predictions
 * With Error Coordination and Performance Monitoring
 */

import { discoverEvents, discoverEventsBatch } from './events-agent'
import { getHistoricalComparison, getHistoricalComparisonBatch } from './historical-agent'
import { gatherMarketStatistics } from './statistics-agent'
import { getTrendsForDate, getTrendsForDateRange } from './trends-agent'
import { analyzeBudget, analyzeBudgetBatch } from './budget-agent'
import { analyzeBookingVelocity, analyzeBookingVelocityBatch } from './velocity-agent'
import { getCompetitorPrices, getCompetitorPricesBatch } from './competitor-agent'
import { getIsraeliHolidays } from './holidays-agent'
import { analyzeCBSTourism } from './cbs-tourism-agent'
import { analyzeNewsSentiment } from './news-sentiment-agent'
import { getCachedData } from '@/lib/cache/external-data-cache'
import { errorCoordinator } from '@/lib/coordination/error-coordinator'
import { performanceMonitor } from '@/lib/coordination/performance-monitor'
import { DecisionAgent } from './decision-agent'
import type { AgentOutput } from './decision-agent'

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
  
  // CBS Tourism data (Phase 2 - NEW)
  cbsTourism: any
  cbsTourismConfidence: number
  
  // News Sentiment data (Phase 2 - NEW)
  newsSentiment: any
  newsSentimentConfidence: number
  
  // Overall metrics
  overallConfidence: number
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor'
  dataSources: string[]
  timestamp: string
  
  // Decision Agent - NEW: Intelligent decision making
  decision?: {
    recommendation: 'increase' | 'decrease' | 'maintain'
    suggestedPriceMultiplier: number
    confidence: number
    reasoning: string[]
    warnings: string[]
    dominantFactors: Array<{
      factor: string
      weight: number
      impact: string
    }>
  }
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
  includeCBSTourism?: boolean // Phase 2 - NEW
  includeNewsSentiment?: boolean // Phase 2 - NEW
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
    includeCBSTourism = true, // Phase 2 - NEW
    includeNewsSentiment = true, // Phase 2 - NEW
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
  console.log(`⚙️  Competitors=${includeCompetitors}, Holidays=${includeHolidays}, CBSTourism=${includeCBSTourism}`)
  console.log(`⚙️  NewsSentiment=${includeNewsSentiment}`)
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
  let cbsTourismData: any = null // Phase 2 - NEW
  let newsSentimentData: any = null // Phase 2 - NEW
  
  let eventsConfidence = 0
  let historicalConfidence = 0
  let statisticsConfidence = 0
  let trendsConfidence = 0
  let budgetConfidence = 0
  let velocityConfidence = 0
  let competitorsConfidence = 0
  let holidaysConfidence = 0
  let cbsTourismConfidence = 0 // Phase 2 - NEW
  let newsSentimentConfidence = 0 // Phase 2 - NEW

  // Helper: Wrap agent execution with monitoring and error handling
  const executeAgent = async <T>(
    agentName: string,
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> => {
    // Check circuit breaker
    const { allowed, reason } = errorCoordinator.shouldAllowExecution(agentName)
    if (!allowed) {
      console.warn(`⚠️  [${agentName}] Skipped: ${reason}`)
      throw new Error(`Circuit breaker open: ${reason}`)
    }

    // Track performance and execute
    try {
      const result = await performanceMonitor.trackExecution(agentName, async () => {
        // Race with timeout
        return await Promise.race([
          fn(),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs)
          ),
        ])
      })
      
      // Log success to error coordinator
      errorCoordinator.logError(agentName, 'success', undefined, 'low', true)
      
      return result
    } catch (error) {
      // Log error
      const severity = error instanceof Error && error.message.includes('timeout') ? 'high' : 'medium'
      errorCoordinator.logError(agentName, error as Error, undefined, severity, false)
      throw error
    }
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
          const result = await executeAgent(
            'Budget Agent',
            () => analyzeBudget(hotelId, new Date(firstDate)),
            5000
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
          const result = await executeAgent(
            'Velocity Agent',
            () => analyzeBookingVelocity(hotelId),
            5000
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
          const result = await executeAgent(
            'Holidays Agent',
            () => getCachedData(
              'israeli_holidays',
              `${firstDate}_${lastDate}`,
              () => getIsraeliHolidays(firstDate, lastDate),
              { ttl: 24 * 60 * 60 } // Cache for 24 hours
            ),
            5000
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
          const result = await executeAgent(
            'Historical Agent',
            () => batchOptimization && dateStrings.length > 5
              ? getHistoricalComparisonBatch(hotelId, hotelName, location, dateStrings, hotelBasePrice)
              : Promise.all(dateStrings.map(d => getHistoricalComparison(hotelId, hotelName, location, d, hotelBasePrice))).then(results => {
                  const map = new Map()
                  results.forEach((r, i) => r && map.set(dateStrings[i], r))
                  return map
                }),
            15000
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
          const result = await executeAgent<any>(
            'Statistics Agent',
            () => getCachedData(
              'market_statistics',
              `${location}_${firstDate.substring(0, 7)}`,
              () => gatherMarketStatistics(location),
              { ttl: 60 * 60 } // Cache for 1 hour
            ),
            10000
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
          const result = await executeAgent<Map<string, any>>(
            'Trends Agent',
            () => getTrendsForDateRange(firstDate, lastDate, 'hotels tel aviv', 'IL'),
            10000
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

  // Task 7: CBS Tourism Statistics (Phase 2 - NEW)
  if (includeCBSTourism) {
    stage2Tasks.push(
      (async () => {
        try {
          console.log('🏖️  [CBS Tourism Agent] Starting...')
          const result = await executeAgent<AgentOutput>(
            'CBS Tourism Agent',
            () => getCachedData(
              'cbs_tourism',
              `${location}_${firstDate.substring(0, 7)}`,
              () => analyzeCBSTourism(location, new Date(firstDate)),
              { ttl: 24 * 60 * 60 } // Cache for 24 hours
            ),
            8000
          )
          cbsTourismData = result
          cbsTourismConfidence = result.confidence || 0.75
          dataSources.push('cbs_tourism')
          console.log(`✅ [CBS Tourism Agent] Complete - Tourism multiplier: ${result.suggestedMultiplier?.toFixed(2)}x`)
        } catch (error) {
          console.log('⚠️  [CBS Tourism Agent] Failed:', (error as Error).message)
        }
      })()
    )
  }

  // Task 8: News Sentiment Analysis (Phase 2 - NEW)
  if (includeNewsSentiment) {
    stage2Tasks.push(
      (async () => {
        try {
          console.log('📰 [News Sentiment Agent] Starting...')
          const result = await executeAgent<AgentOutput>(
            'News Sentiment Agent',
            () => getCachedData(
              'news_sentiment',
              `${location}_${firstDate.substring(0, 10)}`,
              () => analyzeNewsSentiment(location, new Date(firstDate)),
              { ttl: 12 * 60 * 60 } // Cache for 12 hours (news changes faster)
            ),
            10000
          )
          newsSentimentData = result
          newsSentimentConfidence = result.confidence || 0.6
          dataSources.push('news_sentiment')
          console.log(`✅ [News Sentiment Agent] Complete - Sentiment: ${result.dataPoints?.dominantSentiment}, ${result.dataPoints?.articleCount} articles`)
        } catch (error) {
          console.log('⚠️  [News Sentiment Agent] Failed:', (error as Error).message)
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
          const result = await executeAgent<Map<string, any>>(
            'Events Agent',
            () => batchOptimization && dateStrings.length > 5
              ? getCachedData(
                  'tavily_events_batch',
                  `${location}_${firstDate}_${lastDate}`,
                  () => discoverEventsBatch(location, dateStrings, 7),
                  { ttl: 60 * 60 } // Cache for 1 hour
                )
              : Promise.all(dateStrings.map(d => discoverEvents(location, d, 7))).then(results => {
                  const map = new Map()
                  results.forEach((r: any, i: number) => map.set(dateStrings[i], r))
                  return map
                }),
            20000
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
          const result = await executeAgent<Map<string, any>>(
            'Competitor Agent',
            () => getCompetitorPricesBatch(hotelId, location, dateStrings, hotelBasePrice, realTimeCompetitors),
            realTimeCompetitors ? 60000 : 10000
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

  // 🎯 NEW: Run Decision Agent for intelligent decision making
  let decision
  try {
    console.log('🧠 [Decision Agent] Analyzing all agent outputs...')
    const decisionAgent = new DecisionAgent()
    
    // Prepare agent outputs
    const agentOutputs: AgentOutput[] = []
    
    if (eventsData.size > 0) {
      const avgEventImpact = Array.from(eventsData.values())
        .map(e => e.impact || 1.0)
        .reduce((a, b) => a + b, 0) / eventsData.size
      
      agentOutputs.push({
        agentName: 'Events Agent',
        recommendation: avgEventImpact > 1.2 ? 'increase' : avgEventImpact < 0.9 ? 'decrease' : 'maintain',
        confidence: eventsConfidence,
        suggestedMultiplier: avgEventImpact,
        reasoning: [`Events impact: ${avgEventImpact.toFixed(2)}x`],
        dataPoints: { eventCount: eventsData.size, avgImpact: avgEventImpact }
      })
    }
    
    if (historicalData.size > 0) {
      const avgHistoricalTrend = Array.from(historicalData.values())
        .map(h => h.trend || 1.0)
        .reduce((a, b) => a + b, 0) / historicalData.size
      
      agentOutputs.push({
        agentName: 'Historical Agent',
        recommendation: avgHistoricalTrend > 1.1 ? 'increase' : avgHistoricalTrend < 0.9 ? 'decrease' : 'maintain',
        confidence: historicalConfidence,
        suggestedMultiplier: avgHistoricalTrend,
        reasoning: [`Historical trend: ${avgHistoricalTrend.toFixed(2)}x`],
        dataPoints: { dataCount: historicalData.size, avgTrend: avgHistoricalTrend }
      })
    }
    
    if (budgetData) {
      const budgetMultiplier = budgetData.pricingPressure || 1.0
      agentOutputs.push({
        agentName: 'Budget Agent',
        recommendation: budgetMultiplier > 1.05 ? 'increase' : budgetMultiplier < 0.95 ? 'decrease' : 'maintain',
        confidence: budgetConfidence,
        suggestedMultiplier: budgetMultiplier,
        reasoning: [`Budget pressure: ${budgetMultiplier.toFixed(2)}x`, `Gap: ₪${Math.round(budgetData.budgetGap)}`],
        dataPoints: { budgetGap: budgetData.budgetGap, pressure: budgetMultiplier }
      })
    }
    
    if (velocityData) {
      const velocityMultiplier = velocityData.pricingImpact || 1.0
      agentOutputs.push({
        agentName: 'Velocity Agent',
        recommendation: velocityMultiplier > 1.05 ? 'increase' : velocityMultiplier < 0.95 ? 'decrease' : 'maintain',
        confidence: velocityConfidence,
        suggestedMultiplier: velocityMultiplier,
        reasoning: [`Velocity impact: ${velocityMultiplier.toFixed(2)}x`, `Trend: ${velocityData.trend}`],
        dataPoints: { trend: velocityData.trend, impact: velocityMultiplier }
      })
    }
    
    if (competitorsData.size > 0) {
      const competitors = Array.from(competitorsData.values()).filter(c => c.averagePrice > 0)
      if (competitors.length > 0) {
        const avgCompetitorPrice = competitors.reduce((sum, c) => sum + c.averagePrice, 0) / competitors.length
        const competitorMultiplier = avgCompetitorPrice / hotelBasePrice
        
        agentOutputs.push({
          agentName: 'Competitor Agent',
          recommendation: competitorMultiplier > 1.1 ? 'increase' : competitorMultiplier < 0.9 ? 'decrease' : 'maintain',
          confidence: competitorsConfidence,
          suggestedMultiplier: competitorMultiplier,
          reasoning: [`Avg competitor: ₪${Math.round(avgCompetitorPrice)} vs base ₪${hotelBasePrice}`],
          dataPoints: { avgPrice: avgCompetitorPrice, multiplier: competitorMultiplier }
        })
      }
    }
    
    if (holidaysData.size > 0) {
      const avgHolidayImpact = Array.from(holidaysData.values())
        .flat()
        .map((h: any) => h.tourismImpact || 1.0)
        .reduce((a, b) => a + b, 0) / Array.from(holidaysData.values()).flat().length
      
      agentOutputs.push({
        agentName: 'Holidays Agent',
        recommendation: avgHolidayImpact > 1.2 ? 'increase' : 'maintain',
        confidence: holidaysConfidence,
        suggestedMultiplier: avgHolidayImpact,
        reasoning: [`Holiday impact: ${avgHolidayImpact.toFixed(2)}x`],
        dataPoints: { holidayCount: Array.from(holidaysData.values()).flat().length, avgImpact: avgHolidayImpact }
      })
    }
    
    // Phase 2 - NEW: CBS Tourism Statistics
    if (cbsTourismData) {
      agentOutputs.push({
        agentName: 'CBS Tourism Agent',
        recommendation: cbsTourismData.recommendation,
        confidence: cbsTourismConfidence,
        suggestedMultiplier: cbsTourismData.suggestedMultiplier,
        reasoning: cbsTourismData.reasoning,
        dataPoints: cbsTourismData.dataPoints
      })
    }
    
    // Phase 2 - NEW: News Sentiment
    if (newsSentimentData) {
      agentOutputs.push({
        agentName: 'News Sentiment Agent',
        recommendation: newsSentimentData.recommendation,
        confidence: newsSentimentConfidence,
        suggestedMultiplier: newsSentimentData.suggestedMultiplier,
        reasoning: newsSentimentData.reasoning,
        dataPoints: newsSentimentData.dataPoints
      })
    }
    
    // Calculate days ahead for context
    const daysAhead = Math.ceil((new Date(firstDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    
    // Make decision
    const decisionResult = await decisionAgent.makeDecision({
      hotelId,
      hotelName,
      location,
      targetDate: firstDate,
      currentPrice: hotelBasePrice,
      agentOutputs,
      context: {
        daysUntilTarget: Math.max(0, daysAhead),
        isHighSeason: new Date(firstDate).getMonth() >= 5 && new Date(firstDate).getMonth() <= 8,
        isWeekend: [5, 6].includes(new Date(firstDate).getDay()),
        marketCondition: dataQuality === 'excellent' ? 'normal' : dataQuality === 'poor' ? 'volatile' : 'normal',
        competitivePosition: 'average',
        budgetStatus: budgetData?.pricingPressure > 1.1 ? 'below' : budgetData?.pricingPressure < 0.9 ? 'above' : 'on_track',
        recentPerformance: velocityData?.trend || 'stable'
      },
      historicalAccuracy: new Map()
    })
    
    decision = {
      recommendation: decisionResult.recommendation,
      suggestedPriceMultiplier: decisionResult.suggestedPrice / hotelBasePrice,
      confidence: decisionResult.confidence,
      reasoning: decisionResult.reasoning,
      warnings: decisionResult.warnings,
      dominantFactors: decisionResult.dominantFactors.map(f => ({
        factor: f.agentName,
        weight: f.weight,
        impact: `${f.impact.toFixed(2)}x`
      }))
    }
    
    console.log(`✅ [Decision Agent] Complete - Recommendation: ${decisionResult.recommendation.toUpperCase()}`)
    console.log(`   💰 Suggested multiplier: ${decision.suggestedPriceMultiplier.toFixed(3)}x`)
    console.log(`   🎯 Confidence: ${(decisionResult.confidence * 100).toFixed(0)}%`)
    console.log(`   📝 Key reasoning: ${decisionResult.reasoning[0]}`)
  } catch (error) {
    console.log('⚠️  [Decision Agent] Failed:', (error as Error).message)
    decision = undefined
  }

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
    cbsTourism: cbsTourismData, // Phase 2 - NEW
    cbsTourismConfidence, // Phase 2 - NEW
    newsSentiment: newsSentimentData, // Phase 2 - NEW
    newsSentimentConfidence, // Phase 2 - NEW
    overallConfidence,
    dataQuality,
    dataSources,
    decision,
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
      includeCBSTourism: true, // Phase 2 - NEW
      includeNewsSentiment: true, // Phase 2 - NEW
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
      includeCBSTourism: true, // Phase 2 - NEW
      includeNewsSentiment: true, // Phase 2 - NEW
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
    includeCBSTourism: true, // Phase 2 - NEW - Tourism patterns relevant long term      includeNewsSentiment: true, // Phase 2 - NEW - News trends relevant long term    batchOptimization: true,
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
