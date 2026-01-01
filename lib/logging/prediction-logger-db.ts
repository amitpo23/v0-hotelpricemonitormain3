/**
 * Prediction Logger to Supabase
 * שומר לוגים מפורטים של תהליך קבלת ההחלטות בטבלת prediction_logs
 */

import { createClient } from '@/lib/supabase/server'

interface PredictionLogData {
  hotelId: string
  hotelName: string
  predictionDate: string
  predictionId?: string
  algorithmVersion?: string
  executionTimeMs?: number
  
  // Multi-Agent data
  multiAgentData?: {
    eventsFound?: number
    eventsConfidence?: number
    eventsList?: Array<{name: string, date: string, impact: number}>
    historicalData?: number
    historicalConfidence?: number
    historicalTrend?: string
    statisticsConfidence?: number
    marketAvgPrice?: number
    overallConfidence?: number
    dataQuality?: string
    executionTimeMs?: number
  }
  
  // Input data
  inputData?: {
    basePrice: number
    totalRooms: number
    bookedRooms: number
    scanResults?: number
    bookings?: number
    competitorPrices?: number
    competitorAvg?: number
    lastScanHoursAgo?: number
  }
  
  // Factors
  factors?: {
    seasonality?: {
      value: number
      label: string
      impact: 'high' | 'medium' | 'low'
      reasoning: string
      calculation: string
    }
    weekendPremium?: {
      value: number
      isWeekend: boolean
      impact: 'high' | 'medium' | 'low'
      reasoning: string
    }
    leadTime?: {
      value: number
      days: number
      impact: 'high' | 'medium' | 'low'
      reasoning: string
    }
    occupancy?: {
      value: number
      rate: number
      impact: 'high' | 'medium' | 'low'
      reasoning: string
    }
    events?: {
      value: number
      eventsList: string[]
      impact: 'high' | 'medium' | 'low'
      reasoning: string
    }
    competitor?: {
      value: number
      avgPrice: number | null
      impact: 'high' | 'medium' | 'low'
      reasoning: string
    }
    budget?: {
      value: number
      gap: number
      impact: 'high' | 'medium' | 'low'
      reasoning: string
    }
    velocity?: {
      value: number
      trend: string
      impact: 'high' | 'medium' | 'low'
      reasoning: string
    }
  }
  
  // Price calculation
  priceCalculation?: {
    rawPrice: number
    priceBeforeFloors: number
    floors: {
      absolute: number
      competitor: number
      govStats: number
      currentPrice: number
      applied: number
    }
    adjustments: string[]
    floorApplied: boolean
    finalPrice: number
    roundingApplied: boolean
  }
  
  // Confidence calculation
  confidenceCalculation?: {
    factors: {
      dataQuality: number
      scanRecency: number
      historicalData: number
      bookingData: number
      competitorData: number
      marketConsistency: number
      externalDataQuality: number
    }
    weights: {
      dataQuality: number
      scanRecency: number
      historicalData: number
      bookingData: number
      competitorData: number
      marketConsistency: number
      externalDataQuality: number
    }
    baseConfidence: number
    adjustments: {
      timeDistance: number
      eventBonus: boolean
      historicalBonus: boolean
      nearTermBonus: boolean
    }
    finalConfidence: number
    daysUntilDate: number
  }
  
  // Final result
  result?: {
    predictedPrice: number
    basePrice: number
    confidence: number
    demand: string
    priceVsBase: number
    priceVsCompetitor: number
    recommendation: string | null
    recommendationType: string | null
  }
}

/**
 * שומר לוג חיזוי ב-Supabase
 */
export async function savePredictionLog(logData: PredictionLogData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.from('prediction_logs').insert({
      hotel_id: logData.hotelId,
      hotel_name: logData.hotelName,
      prediction_date: logData.predictionDate,
      prediction_id: logData.predictionId,
      algorithm_version: logData.algorithmVersion || '3.2',
      execution_time_ms: logData.executionTimeMs,
      multi_agent_data: logData.multiAgentData,
      input_data: logData.inputData,
      factors: logData.factors,
      price_calculation: logData.priceCalculation,
      confidence_calculation: logData.confidenceCalculation,
      result: logData.result
    })
    
    if (error) {
      console.error('[PredictionLoggerDB] Error saving log:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[PredictionLoggerDB] Exception:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * שולף לוגים עבור חיזוי ספציפי
 */
export async function getPredictionLogs(
  hotelId: string,
  predictionDate: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('prediction_logs')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('prediction_date', predictionDate)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('[PredictionLoggerDB] Error fetching logs:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('[PredictionLoggerDB] Exception fetching logs:', error)
    return []
  }
}

/**
 * שולף את הלוג האחרון עבור חיזוי
 */
export async function getLatestPredictionLog(
  hotelId: string,
  predictionDate: string
): Promise<any | null> {
  const logs = await getPredictionLogs(hotelId, predictionDate, 1)
  return logs.length > 0 ? logs[0] : null
}

/**
 * שולף כל הלוגים עבור מלון (לאנליזה)
 */
export async function getAllHotelLogs(
  hotelId: string,
  fromDate?: string,
  toDate?: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('prediction_logs')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('prediction_date', { ascending: false })
      .limit(limit)
    
    if (fromDate) {
      query = query.gte('prediction_date', fromDate)
    }
    
    if (toDate) {
      query = query.lte('prediction_date', toDate)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('[PredictionLoggerDB] Error fetching hotel logs:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('[PredictionLoggerDB] Exception fetching hotel logs:', error)
    return []
  }
}

/**
 * מחיקת לוגים ישנים (תחזוקה)
 */
export async function cleanupOldLogs(daysOld: number = 90): Promise<{ success: boolean; deletedCount?: number }> {
  try {
    const supabase = await createClient()
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    const cutoffStr = cutoffDate.toISOString()
    
    const { data, error } = await supabase
      .from('prediction_logs')
      .delete()
      .lt('created_at', cutoffStr)
      .select()
    
    if (error) {
      console.error('[PredictionLoggerDB] Error cleaning up logs:', error)
      return { success: false }
    }
    
    return { success: true, deletedCount: data?.length || 0 }
  } catch (error) {
    console.error('[PredictionLoggerDB] Exception cleaning up logs:', error)
    return { success: false }
  }
}
