/**
 * Prediction Learning & Improvement System
 * 
 * This system:
 * 1. Compares predictions vs actuals automatically
 * 2. Updates accuracy metrics
 * 3. Identifies patterns in errors
 * 4. Triggers model re-training when needed
 * 5. Provides recommendations for improvement
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for batch processing

interface AccuracyResult {
  predictionsChecked: number
  accuracyUpdated: number
  avgAccuracy: number
  improvements: string[]
  alerts: string[]
}

/**
 * Calculate accuracy for a single prediction
 */
function calculateAccuracy(predicted: number, actual: number): {
  errorPercent: number
  accuracyScore: number
} {
  if (!actual || actual === 0) {
    return { errorPercent: 0, accuracyScore: 0 }
  }
  
  const errorPercent = Math.abs((predicted - actual) / actual) * 100
  const accuracyScore = Math.max(0, 100 - errorPercent)
  
  return { errorPercent, accuracyScore }
}

/**
 * Check and update prediction accuracy
 * This should run daily via CRON
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Vercel Cron authentication (production security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ Unauthorized cron request to /api/learning/accuracy')
      // Allow in development/testing, but log warning
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const daysBack = parseInt(searchParams.get('daysBack') || '7')
    
    console.log(`[Learning System] Checking predictions from last ${daysBack} days`)
    
    // Get predictions that need accuracy check
    const today = new Date()
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - daysBack)
    
    const { data: predictions, error: predError } = await supabase
      .from('price_predictions')
      .select('*')
      .gte('prediction_date', checkDate.toISOString().split('T')[0])
      .lt('prediction_date', today.toISOString().split('T')[0])
      .order('prediction_date')
    
    if (predError || !predictions) {
      console.error('[Learning System] Error fetching predictions:', predError)
      return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
    }
    
    console.log(`[Learning System] Found ${predictions.length} predictions to check`)
    
    // Get actual bookings for these dates
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'confirmed')
      .gte('check_in_date', checkDate.toISOString().split('T')[0])
      .lt('check_in_date', today.toISOString().split('T')[0])
    
    // Get hotels info for occupancy calculation
    const { data: hotels } = await supabase
      .from('hotels')
      .select('id, total_rooms')
    
    const hotelRoomsMap = new Map(hotels?.map(h => [h.id, h.total_rooms]) || [])
    
    // Group bookings by hotel and date
    const bookingsByHotelDate = new Map<string, any[]>()
    bookings?.forEach(booking => {
      const key = `${booking.hotel_id}-${booking.check_in_date}`
      if (!bookingsByHotelDate.has(key)) {
        bookingsByHotelDate.set(key, [])
      }
      bookingsByHotelDate.get(key)!.push(booking)
    })
    
    const results: AccuracyResult = {
      predictionsChecked: 0,
      accuracyUpdated: 0,
      avgAccuracy: 0,
      improvements: [],
      alerts: []
    }
    
    let totalAccuracy = 0
    let accuracyCount = 0
    
    // Process each prediction
    for (const pred of predictions) {
      const key = `${pred.hotel_id}-${pred.prediction_date}`
      const dayBookings = bookingsByHotelDate.get(key) || []
      
      if (dayBookings.length === 0) {
        // No bookings = no actual data yet
        continue
      }
      
      results.predictionsChecked++
      
      // Calculate actuals
      const actualPrice = dayBookings.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0) / dayBookings.length
      const actualBookings = dayBookings.length
      const totalRooms = hotelRoomsMap.get(pred.hotel_id) || 35
      const actualOccupancy = (actualBookings / totalRooms) * 100
      const actualRevenue = actualPrice * actualBookings
      
      // Calculate accuracy
      const priceAccuracy = calculateAccuracy(pred.predicted_price, actualPrice)
      const occupancyAccuracy = pred.predicted_occupancy 
        ? calculateAccuracy(pred.predicted_occupancy, actualOccupancy)
        : { errorPercent: 0, accuracyScore: 0 }
      
      // Overall accuracy (weighted average)
      const overallAccuracy = (priceAccuracy.accuracyScore * 0.6 + occupancyAccuracy.accuracyScore * 0.4)
      
      // Insert or update prediction_accuracy
      const { error: insertError } = await supabase
        .from('prediction_accuracy')
        .upsert({
          hotel_id: pred.hotel_id,
          prediction_date: pred.prediction_date,
          prediction_made_at: pred.created_at,
          prediction_id: pred.id,
          
          predicted_price: pred.predicted_price,
          predicted_occupancy: pred.predicted_occupancy,
          predicted_demand: pred.predicted_demand,
          
          actual_price: actualPrice,
          actual_occupancy: actualOccupancy,
          actual_bookings: actualBookings,
          actual_revenue: actualRevenue,
          
          price_error_percent: priceAccuracy.errorPercent,
          occupancy_error_percent: occupancyAccuracy.errorPercent,
          accuracy_score: overallAccuracy,
          
          prediction_confidence: pred.confidence_score,
          factors_used: pred.factors_used || {},
          days_before_date: Math.floor((new Date(pred.prediction_date).getTime() - new Date(pred.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          
          actual_data_updated_at: new Date().toISOString()
        }, {
          onConflict: 'hotel_id,prediction_date,prediction_made_at'
        })
      
      if (!insertError) {
        results.accuracyUpdated++
        totalAccuracy += overallAccuracy
        accuracyCount++
        
        // Track significant errors
        if (priceAccuracy.errorPercent > 20) {
          results.alerts.push(
            `High price error on ${pred.prediction_date}: predicted ₪${pred.predicted_price}, actual ₪${actualPrice.toFixed(0)} (${priceAccuracy.errorPercent.toFixed(1)}% off)`
          )
        }
      }
    }
    
    results.avgAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 0
    
    // Generate improvement recommendations based on patterns
    if (results.avgAccuracy < 70) {
      results.improvements.push('Overall accuracy below 70% - consider re-training model with recent data')
    }
    
    if (results.alerts.length > results.predictionsChecked * 0.3) {
      results.improvements.push('More than 30% of predictions had high errors - review factor weights')
    }
    
    if (results.accuracyUpdated > 0) {
      results.improvements.push(`Updated ${results.accuracyUpdated} predictions - data available for model improvement`)
    }
    
    // Update model performance summary
    await updatePerformanceSummary(supabase, checkDate, today)
    
    console.log('[Learning System] Results:', results)
    
    return NextResponse.json({
      success: true,
      ...results,
      message: `Checked ${results.predictionsChecked} predictions, updated ${results.accuracyUpdated} with actual data`
    })
    
  } catch (error) {
    console.error('[Learning System] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * Update performance summary aggregates
 */
async function updatePerformanceSummary(supabase: any, startDate: Date, endDate: Date) {
  // Get all hotels
  const { data: hotels } = await supabase.from('hotels').select('id')
  
  for (const hotel of hotels || []) {
    const { data: accuracies } = await supabase
      .from('prediction_accuracy')
      .select('*')
      .eq('hotel_id', hotel.id)
      .gte('prediction_date', startDate.toISOString().split('T')[0])
      .lt('prediction_date', endDate.toISOString().split('T')[0])
      .not('accuracy_score', 'is', null)
    
    if (!accuracies || accuracies.length === 0) continue
    
    const avgAccuracy = accuracies.reduce((sum, a) => sum + (a.accuracy_score || 0), 0) / accuracies.length
    const avgPriceError = accuracies.reduce((sum, a) => sum + (a.price_error_percent || 0), 0) / accuracies.length
    const avgOccupancyError = accuracies.reduce((sum, a) => sum + (a.occupancy_error_percent || 0), 0) / accuracies.length
    
    const veryAccurate = accuracies.filter(a => (a.accuracy_score || 0) > 90).length
    const accurate = accuracies.filter(a => (a.accuracy_score || 0) >= 75 && (a.accuracy_score || 0) <= 90).length
    const moderate = accuracies.filter(a => (a.accuracy_score || 0) >= 60 && (a.accuracy_score || 0) < 75).length
    const poor = accuracies.filter(a => (a.accuracy_score || 0) < 60).length
    
    // Find best and worst
    const sorted = [...accuracies].sort((a, b) => (b.accuracy_score || 0) - (a.accuracy_score || 0))
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]
    
    await supabase
      .from('model_performance_summary')
      .upsert({
        hotel_id: hotel.id,
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
        period_type: 'weekly',
        
        total_predictions: accuracies.length,
        predictions_with_actuals: accuracies.length,
        
        avg_accuracy_score: avgAccuracy,
        avg_price_error_percent: avgPriceError,
        avg_occupancy_error_percent: avgOccupancyError,
        
        very_accurate_count: veryAccurate,
        accurate_count: accurate,
        moderate_count: moderate,
        poor_count: poor,
        
        best_prediction_day: best?.prediction_date,
        best_prediction_score: best?.accuracy_score,
        worst_prediction_day: worst?.prediction_date,
        worst_prediction_score: worst?.accuracy_score
      }, {
        onConflict: 'hotel_id,period_start,period_end,period_type'
      })
  }
}

/**
 * GET endpoint - fetch learning insights
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const days = parseInt(searchParams.get('days') || '30')
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get accuracy trends
    let query = supabase
      .from('prediction_accuracy')
      .select('*')
      .gte('prediction_date', startDate.toISOString().split('T')[0])
      .not('accuracy_score', 'is', null)
      .order('prediction_date', { ascending: false })
    
    if (hotelId) {
      query = query.eq('hotel_id', hotelId)
    }
    
    const { data: accuracies } = await query
    
    // Get performance summaries
    const { data: summaries } = await supabase
      .from('model_performance_summary')
      .select('*')
      .gte('period_start', startDate.toISOString().split('T')[0])
      .order('period_start', { ascending: false })
    
    // Calculate insights
    const avgAccuracy = accuracies && accuracies.length > 0
      ? accuracies.reduce((sum, a) => sum + (a.accuracy_score || 0), 0) / accuracies.length
      : 0
    
    const trend = calculateTrend(accuracies || [])
    const recommendations = generateRecommendations(accuracies || [], summaries || [])
    
    return NextResponse.json({
      success: true,
      insights: {
        totalPredictions: accuracies?.length || 0,
        avgAccuracy: avgAccuracy.toFixed(1),
        trend, // 'improving' | 'declining' | 'stable'
        recommendations,
        accuracyData: accuracies?.slice(0, 100),
        performanceSummaries: summaries
      }
    })
    
  } catch (error) {
    console.error('[Learning System GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateTrend(accuracies: any[]): string {
  if (accuracies.length < 10) return 'insufficient_data'
  
  const recent = accuracies.slice(0, Math.floor(accuracies.length / 2))
  const older = accuracies.slice(Math.floor(accuracies.length / 2))
  
  const recentAvg = recent.reduce((sum, a) => sum + (a.accuracy_score || 0), 0) / recent.length
  const olderAvg = older.reduce((sum, a) => sum + (a.accuracy_score || 0), 0) / older.length
  
  const diff = recentAvg - olderAvg
  
  if (diff > 5) return 'improving'
  if (diff < -5) return 'declining'
  return 'stable'
}

function generateRecommendations(accuracies: any[], summaries: any[]): string[] {
  const recommendations: string[] = []
  
  if (accuracies.length === 0) {
    recommendations.push('No accuracy data yet - predictions need time to be compared with actuals')
    return recommendations
  }
  
  const avgAccuracy = accuracies.reduce((sum, a) => sum + (a.accuracy_score || 0), 0) / accuracies.length
  
  if (avgAccuracy < 70) {
    recommendations.push('🔴 Low accuracy (<70%) - Consider re-training with recent data')
    recommendations.push('Review factor weights in orchestrator')
  } else if (avgAccuracy < 80) {
    recommendations.push('🟡 Moderate accuracy (70-80%) - Room for improvement')
    recommendations.push('Add more competitor data sources')
  } else if (avgAccuracy < 90) {
    recommendations.push('🟢 Good accuracy (80-90%) - System performing well')
    recommendations.push('Continue monitoring for consistency')
  } else {
    recommendations.push('✅ Excellent accuracy (>90%) - System optimal')
  }
  
  // Check for specific error patterns
  const highPriceErrors = accuracies.filter(a => (a.price_error_percent || 0) > 20).length
  if (highPriceErrors > accuracies.length * 0.2) {
    recommendations.push(`⚠️ ${((highPriceErrors / accuracies.length) * 100).toFixed(0)}% of predictions have >20% price error`)
    recommendations.push('Consider adjusting price calculation factors')
  }
  
  return recommendations
}
