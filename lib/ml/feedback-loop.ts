/**
 * Real-Time Feedback Loop System (Online Learning)
 * Continuous model improvement from actual outcomes
 * 
 * Key Features:
 * 1. Immediate feedback capture from bookings
 * 2. Rolling error tracking per factor
 * 3. Automatic bias correction
 * 4. Confidence decay for stale predictions
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { clearWeightCache } from "../prediction-algorithms"

interface FeedbackData {
  predictionId: string
  hotelId: string
  date: string
  predictedPrice: number
  actualPrice: number
  wasBooked: boolean
  bookingDelay?: number  // Hours between prediction and booking
  occupancyAtBooking?: number
  competitorPriceAtBooking?: number
}

interface BiasCorrection {
  factor: string
  currentBias: number  // Average over/under prediction
  suggestedAdjustment: number
  confidence: number
  sampleSize: number
}

interface FeedbackResult {
  processed: boolean
  error: number
  errorPercent: number
  biasCorrections: BiasCorrection[]
  weightsUpdated: boolean
}

/**
 * Process real-time feedback from a booking
 */
export async function processFeedback(
  supabase: SupabaseClient,
  feedback: FeedbackData
): Promise<FeedbackResult> {
  const error = feedback.actualPrice - feedback.predictedPrice
  const errorPercent = (error / feedback.predictedPrice) * 100

  // 1. Record feedback in prediction_accuracy
  const { error: insertError } = await supabase
    .from('prediction_accuracy')
    .upsert({
      hotel_id: feedback.hotelId,
      date: feedback.date,
      predicted_price: feedback.predictedPrice,
      actual_price: feedback.actualPrice,
      error_amount: Math.abs(error),
      error_percent: Math.abs(errorPercent),
      mape: Math.abs(errorPercent),
      was_booked: feedback.wasBooked,
      booking_delay_hours: feedback.bookingDelay,
      data_source: 'real_time_feedback',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'hotel_id,date'
    })

  if (insertError) {
    console.error('[Feedback] Error recording:', insertError)
  }

  // 2. Analyze rolling bias
  const biasCorrections = await analyzeRollingBias(supabase, feedback.hotelId)

  // 3. Apply immediate corrections if needed
  let weightsUpdated = false
  for (const bias of biasCorrections) {
    if (Math.abs(bias.currentBias) > 10 && bias.confidence > 0.7) {
      // Significant bias detected - apply correction
      await applyBiasCorrection(supabase, feedback.hotelId, bias)
      weightsUpdated = true
    }
  }

  if (weightsUpdated) {
    clearWeightCache()
  }

  return {
    processed: true,
    error,
    errorPercent,
    biasCorrections,
    weightsUpdated
  }
}

/**
 * Analyze rolling bias over recent predictions
 */
async function analyzeRollingBias(
  supabase: SupabaseClient,
  hotelId: string
): Promise<BiasCorrection[]> {
  // Get last 30 days of accuracy data
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: accuracyData } = await supabase
    .from('prediction_accuracy')
    .select('*')
    .eq('hotel_id', hotelId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (!accuracyData || accuracyData.length < 5) {
    return []
  }

  const corrections: BiasCorrection[] = []

  // Calculate overall prediction bias
  const errors = accuracyData.map(d => 
    ((d.actual_price || 0) - (d.predicted_price || 0)) / (d.predicted_price || 1) * 100
  )
  const avgBias = errors.reduce((a, b) => a + b, 0) / errors.length
  
  if (Math.abs(avgBias) > 5) {
    corrections.push({
      factor: 'overall_multiplier',
      currentBias: avgBias,
      suggestedAdjustment: 1 + (avgBias / 100) * 0.5, // 50% correction strength
      confidence: Math.min(1, accuracyData.length / 20),
      sampleSize: accuracyData.length
    })
  }

  // Weekend bias
  const weekendData = accuracyData.filter(d => {
    const date = new Date(d.date)
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
  })
  
  if (weekendData.length >= 3) {
    const weekendErrors = weekendData.map(d => 
      ((d.actual_price || 0) - (d.predicted_price || 0)) / (d.predicted_price || 1) * 100
    )
    const weekendBias = weekendErrors.reduce((a, b) => a + b, 0) / weekendErrors.length
    
    if (Math.abs(weekendBias) > 8) {
      corrections.push({
        factor: 'weekend_multiplier',
        currentBias: weekendBias,
        suggestedAdjustment: 1 + (weekendBias / 100) * 0.5,
        confidence: Math.min(1, weekendData.length / 10),
        sampleSize: weekendData.length
      })
    }
  }

  // High occupancy bias
  const highOccData = accuracyData.filter(d => (d.current_occupancy || 0) >= 80)
  
  if (highOccData.length >= 3) {
    const highOccErrors = highOccData.map(d => 
      ((d.actual_price || 0) - (d.predicted_price || 0)) / (d.predicted_price || 1) * 100
    )
    const highOccBias = highOccErrors.reduce((a, b) => a + b, 0) / highOccErrors.length
    
    if (Math.abs(highOccBias) > 8) {
      corrections.push({
        factor: 'high_occupancy_multiplier',
        currentBias: highOccBias,
        suggestedAdjustment: 1 + (highOccBias / 100) * 0.5,
        confidence: Math.min(1, highOccData.length / 10),
        sampleSize: highOccData.length
      })
    }
  }

  return corrections
}

/**
 * Apply bias correction to factor weights
 */
async function applyBiasCorrection(
  supabase: SupabaseClient,
  hotelId: string,
  bias: BiasCorrection
): Promise<void> {
  // Get current weight
  const { data: currentWeight } = await supabase
    .from('factor_weights')
    .select('weight_value, default_value')
    .eq('hotel_id', hotelId)
    .eq('factor_name', bias.factor)
    .single()

  const currentValue = currentWeight?.weight_value || currentWeight?.default_value || 1.0
  const newValue = currentValue * bias.suggestedAdjustment

  // Cap at ±30% from default
  const defaultValue = currentWeight?.default_value || 1.0
  const cappedValue = Math.max(
    defaultValue * 0.7,
    Math.min(defaultValue * 1.3, newValue)
  )

  // Update weight
  await supabase
    .from('factor_weights')
    .upsert({
      hotel_id: hotelId,
      factor_name: bias.factor,
      weight_value: cappedValue,
      default_value: defaultValue,
      confidence: bias.confidence,
      samples_used: bias.sampleSize,
      improvement_percent: Math.abs(bias.currentBias) * 0.3, // Estimated improvement
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'hotel_id,factor_name'
    })

  // Record in history
  await supabase
    .from('factor_weight_history')
    .insert({
      hotel_id: hotelId,
      factor_name: bias.factor,
      old_value: currentValue,
      new_value: cappedValue,
      reason: `Real-time bias correction: ${bias.currentBias.toFixed(1)}% average error`,
      triggered_by: 'feedback_loop'
    })

  console.log(`[Feedback] Corrected ${bias.factor}: ${currentValue.toFixed(3)} → ${cappedValue.toFixed(3)}`)
}

/**
 * Calculate confidence decay for predictions as time passes
 */
export function calculateConfidenceDecay(
  originalConfidence: number,
  hoursSincePrediction: number
): number {
  // Confidence decays ~10% per day after first 24 hours
  if (hoursSincePrediction <= 24) return originalConfidence
  
  const daysPassed = (hoursSincePrediction - 24) / 24
  const decayRate = 0.10 // 10% per day
  const decayFactor = Math.pow(1 - decayRate, daysPassed)
  
  return Math.round(originalConfidence * decayFactor)
}

/**
 * Get real-time learning status for a hotel
 */
export async function getLearningStatus(
  supabase: SupabaseClient,
  hotelId: string
): Promise<{
  feedbackCount: number
  avgError: number
  biasDetected: boolean
  lastUpdate: string | null
  corrections: BiasCorrection[]
}> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data } = await supabase
    .from('prediction_accuracy')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('data_source', 'real_time_feedback')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  const feedbackCount = data?.length || 0
  const avgError = feedbackCount > 0
    ? data!.reduce((sum, d) => sum + (d.mape || 0), 0) / feedbackCount
    : 0

  const corrections = await analyzeRollingBias(supabase, hotelId)
  const biasDetected = corrections.some(c => Math.abs(c.currentBias) > 10)

  return {
    feedbackCount,
    avgError,
    biasDetected,
    lastUpdate: data?.[0]?.created_at || null,
    corrections
  }
}
