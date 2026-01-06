/**
 * Weight Optimizer - Linear Regression
 * Analyzes prediction_accuracy data to find optimal factor weights
 */

import type { SupabaseClient } from '@supabase/supabase-js'

interface AccuracyRecord {
  hotel_id: string
  prediction_date: string
  predicted_price: number
  actual_price: number
  price_error_percent: number
  accuracy_score: number
  factors_used: any
  prediction_confidence: number
  date_weight: number
}

interface FactorContribution {
  factor_name: string
  default_value: number
  current_contribution: number // From factors_used
  error_correlation: number    // How much this factor correlates with error
}

interface OptimizedWeight {
  factor_name: string
  old_weight: number
  new_weight: number
  confidence: number
  improvement_percent: number
  samples_used: number
  r_squared: number
}

/**
 * Simple linear regression to find optimal weight
 */
function linearRegression(x: number[], y: number[]): {
  slope: number
  intercept: number
  r_squared: number
} {
  const n = x.length
  if (n === 0) return { slope: 0, intercept: 0, r_squared: 0 }
  
  // Calculate means
  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n
  
  // Calculate slope and intercept
  let numerator = 0
  let denominator = 0
  
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY)
    denominator += (x[i] - meanX) ** 2
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = meanY - slope * meanX
  
  // Calculate R²
  let ssTotal = 0
  let ssResidual = 0
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept
    ssTotal += (y[i] - meanY) ** 2
    ssResidual += (y[i] - predicted) ** 2
  }
  
  const r_squared = ssTotal !== 0 ? 1 - (ssResidual / ssTotal) : 0
  
  return { slope, intercept, r_squared }
}

/**
 * Extract factor value from factors_used JSONB
 */
function extractFactorValue(factors: any, factorName: string): number | null {
  if (!factors || typeof factors !== 'object') return null
  
  // Different factors stored differently
  // Look for the factor in various formats
  const possibleKeys = [
    factorName,
    factorName.replace('_multiplier', ''),
    factorName.replace('_threshold', ''),
  ]
  
  for (const key of possibleKeys) {
    if (factors[key] !== undefined && factors[key] !== null) {
      const value = factors[key]
      if (typeof value === 'number') return value
      if (typeof value === 'object' && value.value !== undefined) return value.value
    }
  }
  
  return null
}

/**
 * Analyze correlation between factor and prediction error
 */
function analyzeFactorImpact(
  accuracyRecords: AccuracyRecord[],
  factorName: string
): {
  correlation: number
  avgErrorWhenHigh: number
  avgErrorWhenLow: number
  samples: number
} {
  const dataPoints: Array<{ factorValue: number; error: number }> = []
  
  for (const record of accuracyRecords) {
    const factorValue = extractFactorValue(record.factors_used, factorName)
    if (factorValue !== null) {
      dataPoints.push({
        factorValue,
        error: record.price_error_percent
      })
    }
  }
  
  if (dataPoints.length < 10) {
    return { correlation: 0, avgErrorWhenHigh: 0, avgErrorWhenLow: 0, samples: 0 }
  }
  
  // Calculate correlation
  const factorValues = dataPoints.map(d => d.factorValue)
  const errors = dataPoints.map(d => d.error)
  const regression = linearRegression(factorValues, errors)
  
  // Split into high/low factor values
  const median = factorValues.sort((a, b) => a - b)[Math.floor(factorValues.length / 2)]
  const highErrors = dataPoints.filter(d => d.factorValue > median).map(d => d.error)
  const lowErrors = dataPoints.filter(d => d.factorValue <= median).map(d => d.error)
  
  const avgErrorWhenHigh = highErrors.length > 0 
    ? highErrors.reduce((a, b) => a + b, 0) / highErrors.length 
    : 0
  const avgErrorWhenLow = lowErrors.length > 0 
    ? lowErrors.reduce((a, b) => a + b, 0) / lowErrors.length 
    : 0
  
  return {
    correlation: regression.slope,
    avgErrorWhenHigh,
    avgErrorWhenLow,
    samples: dataPoints.length
  }
}

/**
 * Optimize weights for a specific hotel
 */
export async function optimizeWeightsForHotel(
  supabase: SupabaseClient,
  hotelId: string,
  minSamples: number = 30
): Promise<OptimizedWeight[]> {
  console.log(`[Weight Optimizer] Starting optimization for hotel ${hotelId}`)
  
  // Get accuracy records with sufficient history
  const { data: accuracyRecords, error } = await supabase
    .from('prediction_accuracy')
    .select('*')
    .eq('hotel_id', hotelId)
    .not('actual_price', 'is', null)
    .not('factors_used', 'is', null)
    .gte('data_quality', 0.7) // Only use reliable data
    .order('prediction_date', { ascending: false })
    .limit(500)
  
  if (error || !accuracyRecords || accuracyRecords.length < minSamples) {
    console.log(`[Weight Optimizer] Insufficient data: ${accuracyRecords?.length || 0} records (need ${minSamples})`)
    return []
  }
  
  console.log(`[Weight Optimizer] Analyzing ${accuracyRecords.length} accuracy records`)
  
  // Get current weights
  const { data: currentWeights } = await supabase
    .from('factor_weights')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_active', true)
  
  const optimized: OptimizedWeight[] = []
  
  // Analyze each factor
  const factorsToOptimize = [
    'weekend_multiplier',
    'holiday_multiplier',
    'high_occupancy_multiplier',
    'good_occupancy_multiplier',
    'low_occupancy_multiplier',
    'last_minute_multiplier',
    'demand_high_multiplier',
    'demand_low_multiplier'
  ]
  
  for (const factorName of factorsToOptimize) {
    const currentWeight = currentWeights?.find(w => w.factor_name === factorName)
    if (!currentWeight) continue
    
    const impact = analyzeFactorImpact(accuracyRecords, factorName)
    
    if (impact.samples < 10) {
      console.log(`[Weight Optimizer] Skipping ${factorName}: insufficient samples (${impact.samples})`)
      continue
    }
    
    // Determine if we should increase or decrease weight
    // Negative correlation = when factor is high, error is low = good factor, can increase
    // Positive correlation = when factor is high, error is high = bad factor, should decrease
    
    let newWeight = currentWeight.weight_value
    let adjustment = 0
    
    if (impact.correlation < -0.1) {
      // Factor reduces error - can increase weight slightly
      adjustment = 0.05 * Math.abs(impact.correlation)
      newWeight = currentWeight.weight_value * (1 + adjustment)
    } else if (impact.correlation > 0.1) {
      // Factor increases error - should decrease weight
      adjustment = -0.05 * Math.abs(impact.correlation)
      newWeight = currentWeight.weight_value * (1 + adjustment)
    }
    
    // Bounds checking (don't go too far from default)
    const maxDeviation = 0.3 // Max 30% deviation from default
    const minWeight = currentWeight.default_value * (1 - maxDeviation)
    const maxWeight = currentWeight.default_value * (1 + maxDeviation)
    newWeight = Math.max(minWeight, Math.min(maxWeight, newWeight))
    
    // Calculate confidence based on samples and R²
    const sampleConfidence = Math.min(impact.samples / 100, 1.0)
    const correlationStrength = Math.abs(impact.correlation)
    const confidence = (sampleConfidence * 0.6 + correlationStrength * 0.4)
    
    // Only update if confidence is reasonable
    if (confidence < 0.3) {
      console.log(`[Weight Optimizer] Skipping ${factorName}: low confidence (${confidence.toFixed(2)})`)
      continue
    }
    
    // Calculate expected improvement
    const errorDiff = Math.abs(impact.avgErrorWhenHigh - impact.avgErrorWhenLow)
    const improvement_percent = errorDiff * Math.abs(adjustment) * 10 // Rough estimate
    
    optimized.push({
      factor_name: factorName,
      old_weight: currentWeight.weight_value,
      new_weight: parseFloat(newWeight.toFixed(3)),
      confidence: parseFloat(confidence.toFixed(2)),
      improvement_percent: parseFloat(improvement_percent.toFixed(2)),
      samples_used: impact.samples,
      r_squared: Math.abs(impact.correlation) // Using correlation strength as proxy
    })
    
    console.log(`[Weight Optimizer] ${factorName}: ${currentWeight.weight_value.toFixed(3)} → ${newWeight.toFixed(3)} (confidence: ${confidence.toFixed(2)}, samples: ${impact.samples})`)
  }
  
  return optimized
}

/**
 * Apply optimized weights to database
 */
export async function applyOptimizedWeights(
  supabase: SupabaseClient,
  hotelId: string,
  optimizedWeights: OptimizedWeight[]
): Promise<{ success: number; failed: number }> {
  const results = { success: 0, failed: 0 }
  
  for (const weight of optimizedWeights) {
    // Deactivate old weight
    await supabase
      .from('factor_weights')
      .update({ is_active: false })
      .eq('hotel_id', hotelId)
      .eq('factor_name', weight.factor_name)
      .eq('is_active', true)
    
    // Insert new optimized weight
    const { error } = await supabase
      .from('factor_weights')
      .insert({
        hotel_id: hotelId,
        factor_name: weight.factor_name,
        factor_type: 'multiplier',
        weight_value: weight.new_weight,
        default_value: weight.old_weight,
        confidence: weight.confidence,
        samples_used: weight.samples_used,
        improvement_percent: weight.improvement_percent,
        optimization_method: 'linear_regression',
        r_squared: weight.r_squared,
        last_optimized_at: new Date().toISOString(),
        is_active: true,
        notes: `Optimized via regression from ${weight.samples_used} samples`
      })
    
    if (error) {
      console.error(`[Weight Optimizer] Failed to apply ${weight.factor_name}:`, error)
      results.failed++
    } else {
      results.success++
      
      // Log to history
      await supabase.from('factor_weight_history').insert({
        factor_weight_id: null, // Will be filled by trigger if needed
        old_weight: weight.old_weight,
        new_weight: weight.new_weight,
        reason: `Regression optimization: ${weight.improvement_percent.toFixed(1)}% expected improvement`,
        changed_by: 'system',
        changed_at: new Date().toISOString()
      })
    }
  }
  
  return results
}
