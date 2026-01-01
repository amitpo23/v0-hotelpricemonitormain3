/**
 * Prediction Logger
 * מערכת לוגים מפורטת לעקוב אחרי כל שלב בתהליך החיזוי
 */

interface PredictionLogEntry {
  timestamp: string
  hotel_id: string
  hotel_name: string
  prediction_date: string
  stage: 'data_collection' | 'multi_agent' | 'factor_calculation' | 'price_calculation' | 'confidence_calculation' | 'final_result'
  data: any
}

interface DecisionLog {
  factor: string
  value: number
  reasoning: string
  impact: 'high' | 'medium' | 'low'
  calculation?: string
}

export class PredictionLogger {
  private logs: PredictionLogEntry[] = []
  private decisionLogs: Map<string, DecisionLog[]> = new Map()
  private enabled: boolean
  
  constructor(enabled: boolean = true) {
    this.enabled = enabled
  }

  /**
   * לוג שלב באיסוף נתונים
   */
  logDataCollection(hotelId: string, hotelName: string, data: {
    scanResults?: number
    bookings?: number
    competitorPrices?: number
    basePrice?: number
    totalRooms?: number
  }) {
    if (!this.enabled) return
    
    const entry: PredictionLogEntry = {
      timestamp: new Date().toISOString(),
      hotel_id: hotelId,
      hotel_name: hotelName,
      prediction_date: 'N/A',
      stage: 'data_collection',
      data
    }
    
    this.logs.push(entry)
    
    console.log(`\n📊 [PredictionLogger] Data Collection for ${hotelName}`)
    console.log(`   ├─ Scan Results: ${data.scanResults || 0}`)
    console.log(`   ├─ Bookings: ${data.bookings || 0}`)
    console.log(`   ├─ Competitor Prices: ${data.competitorPrices || 0}`)
    console.log(`   ├─ Base Price: ₪${data.basePrice || 0}`)
    console.log(`   └─ Total Rooms: ${data.totalRooms || 0}`)
  }

  /**
   * לוג Multi-Agent System
   */
  logMultiAgent(hotelId: string, hotelName: string, data: {
    eventsFound?: number
    eventsConfidence?: number
    historicalData?: number
    historicalConfidence?: number
    holidaysData?: number
    holidaysConfidence?: number
    trendsData?: number
    trendsConfidence?: number
    competitorsData?: number | string
    competitorsConfidence?: number
    budgetData?: string
    budgetConfidence?: number
    velocityData?: string
    velocityConfidence?: number
    statisticsConfidence?: number
    overallConfidence?: number
    dataQuality?: string
    dataSources?: string[]
    executionTime?: number
  }) {
    if (!this.enabled) return
    
    const entry: PredictionLogEntry = {
      timestamp: new Date().toISOString(),
      hotel_id: hotelId,
      hotel_name: hotelName,
      prediction_date: 'N/A',
      stage: 'multi_agent',
      data
    }
    
    this.logs.push(entry)
    
    console.log(`\n🤖 [PredictionLogger] Enhanced Multi-Agent System for ${hotelName}`)
    console.log(`   ├─ Events Found: ${data.eventsFound || 0}`)
    console.log(`   ├─ Events Confidence: ${((data.eventsConfidence || 0) * 100).toFixed(0)}%`)
    console.log(`   ├─ Historical Data: ${data.historicalData || 0} dates`)
    console.log(`   ├─ Historical Confidence: ${((data.historicalConfidence || 0) * 100).toFixed(0)}%`)
    console.log(`   ├─ Holidays Data: ${data.holidaysData || 0} dates`)
    console.log(`   ├─ Holidays Confidence: ${((data.holidaysConfidence || 0) * 100).toFixed(0)}%`)
    console.log(`   ├─ Trends Data: ${data.trendsData || 0} dates`)
    console.log(`   ├─ Trends Confidence: ${((data.trendsConfidence || 0) * 100).toFixed(0)}%`)
    console.log(`   ├─ Competitors Data: ${data.competitorsData || 0} dates`)
    console.log(`   ├─ Competitors Confidence: ${((data.competitorsConfidence || 0) * 100).toFixed(0)}%`)
    console.log(`   ├─ Budget Data: ${data.budgetData || 'N/A'}`)
    console.log(`   ├─ Budget Confidence: ${((data.budgetConfidence || 0) * 100).toFixed(0)}%`)
    console.log(`   ├─ Velocity Data: ${data.velocityData || 'N/A'}`)
    console.log(`   ├─ Velocity Confidence: ${((data.velocityConfidence || 0) * 100).toFixed(0)}%`)
    console.log(`   ├─ Statistics Confidence: ${((data.statisticsConfidence || 0) * 100).toFixed(0)}%`)
    console.log(`   ├─ Overall Confidence: ${((data.overallConfidence || 0) * 100).toFixed(0)}%`)
    console.log(`   ├─ Data Quality: ${data.dataQuality || 'unknown'}`)
    console.log(`   ├─ Data Sources: ${data.dataSources?.join(', ') || 'none'}`)
    console.log(`   └─ Execution Time: ${data.executionTime || 0}ms`)
  }

  /**
   * לוג חישוב Factors עבור תאריך ספציפי
   */
  logFactorCalculation(
    hotelId: string,
    hotelName: string,
    predictionDate: string,
    factors: {
      basePrice: number
      seasonality: number
      seasonalityLabel: string
      weekendFactor: number
      isWeekend: boolean
      leadTimeFactor: number
      leadTimeDays: number
      occupancyFactor: number
      occupancyRate: number
      eventFactor: number
      events: string[]
      competitorFactor: number
      competitorAvg: number | null
      budgetPressure: number
      budgetGap: number
      velocityFactor: number
      bookingVelocity: string
    }
  ) {
    if (!this.enabled) return
    
    const dateKey = `${hotelId}_${predictionDate}`
    const decisions: DecisionLog[] = []
    
    // Seasonality
    decisions.push({
      factor: 'Seasonality',
      value: factors.seasonality,
      reasoning: `${factors.seasonalityLabel} - עונת ${factors.seasonality > 1 ? 'שיא' : factors.seasonality < 1 ? 'שפל' : 'רגיל'}`,
      impact: factors.seasonality > 1.15 ? 'high' : factors.seasonality < 0.9 ? 'high' : 'medium',
      calculation: `${(factors.seasonality * 100 - 100).toFixed(0)}% ${factors.seasonality > 1 ? 'העלאה' : 'הפחתה'}`
    })
    
    // Weekend
    if (factors.isWeekend) {
      decisions.push({
        factor: 'Weekend Premium',
        value: factors.weekendFactor,
        reasoning: 'סוף שבוע - ביקוש גבוה יותר',
        impact: 'medium',
        calculation: `+${((factors.weekendFactor - 1) * 100).toFixed(0)}%`
      })
    }
    
    // Lead Time
    const leadTimeImpact = factors.leadTimeFactor > 1.1 ? 'high' : factors.leadTimeFactor < 0.97 ? 'medium' : 'low'
    decisions.push({
      factor: 'Lead Time',
      value: factors.leadTimeFactor,
      reasoning: `${factors.leadTimeDays} ימים לפני הגעה - ${factors.leadTimeDays < 7 ? 'הזמנה דחופה' : factors.leadTimeDays < 30 ? 'טווח קצר' : 'טווח ארוך'}`,
      impact: leadTimeImpact,
      calculation: `${((factors.leadTimeFactor - 1) * 100).toFixed(0)}%`
    })
    
    // Occupancy
    const occupancyImpact = factors.occupancyRate > 70 ? 'high' : factors.occupancyRate < 20 ? 'high' : 'medium'
    decisions.push({
      factor: 'Occupancy Pressure',
      value: factors.occupancyFactor,
      reasoning: `תפוסה ${factors.occupancyRate.toFixed(0)}% - ${factors.occupancyRate > 70 ? 'לחץ גבוה' : factors.occupancyRate < 30 ? 'תפוסה נמוכה' : 'תפוסה בינונית'}`,
      impact: occupancyImpact,
      calculation: `${((factors.occupancyFactor - 1) * 100).toFixed(0)}%`
    })
    
    // Events
    if (factors.events.length > 0) {
      decisions.push({
        factor: 'Event Impact',
        value: factors.eventFactor,
        reasoning: `אירועים: ${factors.events.join(', ')}`,
        impact: factors.eventFactor > 1.2 ? 'high' : 'medium',
        calculation: `+${((factors.eventFactor - 1) * 100).toFixed(0)}%`
      })
    }
    
    // Competitor
    if (factors.competitorAvg) {
      decisions.push({
        factor: 'Competitor Alignment',
        value: factors.competitorFactor,
        reasoning: `מחיר מתחרים ממוצע: ₪${factors.competitorAvg.toFixed(0)}`,
        impact: Math.abs(factors.competitorFactor - 1) > 0.1 ? 'high' : 'medium',
        calculation: `${((factors.competitorFactor - 1) * 100).toFixed(0)}%`
      })
    }
    
    // Budget
    if (Math.abs(factors.budgetPressure - 1) > 0.02) {
      decisions.push({
        factor: 'Budget Pressure',
        value: factors.budgetPressure,
        reasoning: `פער תקציב: ₪${factors.budgetGap.toFixed(0)} - ${factors.budgetGap > 0 ? 'צריך להעלות הכנסות' : 'מעל יעד'}`,
        impact: Math.abs(factors.budgetPressure - 1) > 0.1 ? 'high' : 'medium',
        calculation: `${((factors.budgetPressure - 1) * 100).toFixed(0)}%`
      })
    }
    
    // Market Velocity
    if (factors.bookingVelocity !== 'stable') {
      decisions.push({
        factor: 'Market Velocity',
        value: factors.velocityFactor,
        reasoning: `מגמת שוק: ${factors.bookingVelocity === 'increasing' ? 'עולה' : 'יורדת'}`,
        impact: 'medium',
        calculation: `${((factors.velocityFactor - 1) * 100).toFixed(0)}%`
      })
    }
    
    this.decisionLogs.set(dateKey, decisions)
    
    const entry: PredictionLogEntry = {
      timestamp: new Date().toISOString(),
      hotel_id: hotelId,
      hotel_name: hotelName,
      prediction_date: predictionDate,
      stage: 'factor_calculation',
      data: { factors, decisions }
    }
    
    this.logs.push(entry)
    
    console.log(`\n📐 [PredictionLogger] Factor Calculation: ${hotelName} - ${predictionDate}`)
    console.log(`   Base Price: ₪${factors.basePrice.toFixed(0)}`)
    decisions.forEach((d, idx) => {
      const icon = d.impact === 'high' ? '🔴' : d.impact === 'medium' ? '🟡' : '⚪'
      const lastChar = idx === decisions.length - 1 ? '└─' : '├─'
      console.log(`   ${lastChar} ${icon} ${d.factor}: ${d.value.toFixed(3)} (${d.calculation}) - ${d.reasoning}`)
    })
  }

  /**
   * לוג חישוב מחיר סופי
   */
  logPriceCalculation(
    hotelId: string,
    hotelName: string,
    predictionDate: string,
    calculation: {
      rawPrice: number
      marketFloors: {
        absolute: number
        competitor: number
        govStats: number
        current: number
        applied: number
      }
      finalPrice: number
      adjustments: string[]
    }
  ) {
    if (!this.enabled) return
    
    const entry: PredictionLogEntry = {
      timestamp: new Date().toISOString(),
      hotel_id: hotelId,
      hotel_name: hotelName,
      prediction_date: predictionDate,
      stage: 'price_calculation',
      data: calculation
    }
    
    this.logs.push(entry)
    
    console.log(`\n💰 [PredictionLogger] Price Calculation: ${hotelName} - ${predictionDate}`)
    console.log(`   ├─ Raw Price (before floors): ₪${calculation.rawPrice.toFixed(0)}`)
    console.log(`   ├─ Market Floors:`)
    console.log(`   │  ├─ Absolute Minimum: ₪${calculation.marketFloors.absolute}`)
    console.log(`   │  ├─ Competitor Floor: ₪${calculation.marketFloors.competitor.toFixed(0)}`)
    console.log(`   │  ├─ Gov Stats Floor: ₪${calculation.marketFloors.govStats.toFixed(0)}`)
    console.log(`   │  ├─ Current Price Floor: ₪${calculation.marketFloors.current.toFixed(0)}`)
    console.log(`   │  └─ Applied Floor: ₪${calculation.marketFloors.applied}`)
    console.log(`   └─ Final Price: ₪${calculation.finalPrice}`)
    
    if (calculation.adjustments.length > 0) {
      console.log(`   Adjustments Applied:`)
      calculation.adjustments.forEach((adj, idx) => {
        console.log(`      ${idx + 1}. ${adj}`)
      })
    }
  }

  /**
   * לוג חישוב Confidence
   */
  logConfidenceCalculation(
    hotelId: string,
    hotelName: string,
    predictionDate: string,
    confidence: {
      factors: {
        dataQuality: number
        scanRecency: number
        historicalData: number
        bookingData: number
        competitorData: number
        marketConsistency: number
        externalDataQuality: number
      }
      adjustments: {
        timeDistance: number
        eventBonus: boolean
        historicalBonus: boolean
        nearTermBonus: boolean
      }
      baseConfidence: number
      finalConfidence: number
      daysUntilDate: number
    }
  ) {
    if (!this.enabled) return
    
    const entry: PredictionLogEntry = {
      timestamp: new Date().toISOString(),
      hotel_id: hotelId,
      hotel_name: hotelName,
      prediction_date: predictionDate,
      stage: 'confidence_calculation',
      data: confidence
    }
    
    this.logs.push(entry)
    
    console.log(`\n🎯 [PredictionLogger] Confidence Calculation: ${hotelName} - ${predictionDate}`)
    console.log(`   Days Until Date: ${confidence.daysUntilDate}`)
    console.log(`   Factor Breakdown:`)
    console.log(`   ├─ Data Quality: ${(confidence.factors.dataQuality * 100).toFixed(0)}% (weight: 20%)`)
    console.log(`   ├─ Scan Recency: ${(confidence.factors.scanRecency * 100).toFixed(0)}% (weight: 18%)`)
    console.log(`   ├─ Historical Data: ${(confidence.factors.historicalData * 100).toFixed(0)}% (weight: 12%)`)
    console.log(`   ├─ Booking Data: ${(confidence.factors.bookingData * 100).toFixed(0)}% (weight: 15%)`)
    console.log(`   ├─ Competitor Data: ${(confidence.factors.competitorData * 100).toFixed(0)}% (weight: 15%)`)
    console.log(`   ├─ Market Consistency: ${(confidence.factors.marketConsistency * 100).toFixed(0)}% (weight: 10%)`)
    console.log(`   └─ External Data Quality: ${(confidence.factors.externalDataQuality * 100).toFixed(0)}% (weight: 10%)`)
    console.log(`   Base Confidence: ${(confidence.baseConfidence * 100).toFixed(1)}%`)
    console.log(`   Adjustments:`)
    console.log(`   ├─ Time Distance Factor: ${confidence.adjustments.timeDistance.toFixed(3)}`)
    console.log(`   ├─ Event Bonus: ${confidence.adjustments.eventBonus ? '+8%' : 'N/A'}`)
    console.log(`   ├─ Historical Bonus: ${confidence.adjustments.historicalBonus ? '+12%' : 'N/A'}`)
    console.log(`   └─ Near-Term Bonus: ${confidence.adjustments.nearTermBonus ? '+15%' : 'N/A'}`)
    console.log(`   🎯 Final Confidence: ${(confidence.finalConfidence * 100).toFixed(1)}%`)
  }

  /**
   * לוג תוצאה סופית
   */
  logFinalResult(
    hotelId: string,
    hotelName: string,
    predictionDate: string,
    result: {
      predictedPrice: number
      confidence: number
      demand: string
      recommendation: string | null
      recommendationType: string | null
      basePrice: number
      priceVsBase: number
      priceVsCompetitor: number
    }
  ) {
    if (!this.enabled) return
    
    const entry: PredictionLogEntry = {
      timestamp: new Date().toISOString(),
      hotel_id: hotelId,
      hotel_name: hotelName,
      prediction_date: predictionDate,
      stage: 'final_result',
      data: result
    }
    
    this.logs.push(entry)
    
    console.log(`\n✅ [PredictionLogger] Final Result: ${hotelName} - ${predictionDate}`)
    console.log(`   ├─ Predicted Price: ₪${result.predictedPrice}`)
    console.log(`   ├─ Base Price: ₪${result.basePrice}`)
    console.log(`   ├─ Price vs Base: ${result.priceVsBase > 0 ? '+' : ''}${result.priceVsBase.toFixed(1)}%`)
    console.log(`   ├─ Price vs Competitor: ${result.priceVsCompetitor > 0 ? '+' : ''}${result.priceVsCompetitor.toFixed(1)}%`)
    console.log(`   ├─ Confidence: ${(result.confidence * 100).toFixed(1)}%`)
    console.log(`   ├─ Demand Level: ${result.demand}`)
    console.log(`   └─ Recommendation: ${result.recommendation || 'None'}`)
    
    if (result.recommendationType) {
      console.log(`      Type: ${result.recommendationType}`)
    }
  }

  /**
   * קבל את כל הלוגים
   */
  getLogs(): PredictionLogEntry[] {
    return this.logs
  }

  /**
   * קבל Decision Logs לתאריך ספציפי
   */
  getDecisionLogs(hotelId: string, predictionDate: string): DecisionLog[] | undefined {
    return this.decisionLogs.get(`${hotelId}_${predictionDate}`)
  }

  /**
   * ייצוא לקובץ JSON
   */
  exportToFile(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs,
      decisionLogs: Array.from(this.decisionLogs.entries()).map(([key, decisions]) => ({
        key,
        decisions
      }))
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  /**
   * נקה לוגים
   */
  clear() {
    this.logs = []
    this.decisionLogs.clear()
  }

  /**
   * הדפס סיכום
   */
  printSummary() {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📊 Prediction Logger Summary`)
    console.log(`${'='.repeat(80)}`)
    console.log(`Total Log Entries: ${this.logs.length}`)
    console.log(`Hotels Processed: ${new Set(this.logs.map(l => l.hotel_id)).size}`)
    console.log(`Dates Processed: ${new Set(this.logs.filter(l => l.prediction_date !== 'N/A').map(l => l.prediction_date)).size}`)
    console.log(`Decision Logs: ${this.decisionLogs.size}`)
    
    const stageCount = this.logs.reduce((acc, log) => {
      acc[log.stage] = (acc[log.stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log(`\nLogs by Stage:`)
    Object.entries(stageCount).forEach(([stage, count]) => {
      console.log(`  - ${stage}: ${count}`)
    })
    console.log(`${'='.repeat(80)}\n`)
  }
}

// Singleton instance
let globalLogger: PredictionLogger | null = null

/**
 * קבל את ה-Logger הגלובלי
 */
export function getPredictionLogger(enabled: boolean = true): PredictionLogger {
  if (!globalLogger) {
    globalLogger = new PredictionLogger(enabled)
  }
  return globalLogger
}

/**
 * איפוס ה-Logger הגלובלי
 */
export function resetPredictionLogger() {
  if (globalLogger) {
    globalLogger.clear()
  }
  globalLogger = null
}
