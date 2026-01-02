import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/feedback/save-prediction
 * Save a prediction for future accuracy tracking
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const {
      hotelId,
      predictionDate,
      predictedPrice,
      predictedOccupancy,
      predictedDemand,
      predictedRevenue,
      predictionConfidence,
      factorsUsed,
      competitorAvgPrice,
      recommendationText
    } = body
    
    if (!hotelId || !predictionDate || !predictedPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Calculate days before date
    const predDate = new Date(predictionDate)
    const today = new Date()
    const daysBeforeDate = Math.floor((predDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    // Insert prediction
    const { data, error } = await supabase
      .from('prediction_accuracy')
      .insert({
        hotel_id: hotelId,
        prediction_date: predictionDate,
        prediction_made_at: new Date().toISOString(),
        predicted_price: predictedPrice,
        predicted_occupancy: predictedOccupancy,
        predicted_demand: predictedDemand,
        predicted_revenue: predictedRevenue,
        prediction_confidence: predictionConfidence,
        factors_used: factorsUsed,
        competitor_avg_price: competitorAvgPrice,
        days_before_date: daysBeforeDate,
        recommendation_text: recommendationText
      })
      .select()
      .single()
    
    if (error) {
      console.error('[Feedback] Error saving prediction:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      predictionId: data.id,
      message: 'Prediction saved for tracking'
    })
    
  } catch (error) {
    console.error('[Feedback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/feedback/accuracy?hotelId=xxx&period=30
 * Get prediction accuracy metrics
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const period = parseInt(searchParams.get('period') || '30')
    
    if (!hotelId) {
      return NextResponse.json({ error: 'hotelId required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)
    
    // Get predictions with actual data
    const { data: predictions, error } = await supabase
      .from('prediction_accuracy')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('prediction_date', startDate.toISOString().split('T')[0])
      .not('actual_price', 'is', null)
      .order('prediction_date', { ascending: false })
    
    if (error) {
      console.error('[Feedback] Error fetching accuracy:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        hotelId,
        period,
        totalPredictions: 0,
        averageAccuracy: 0,
        message: 'No predictions with actual data yet'
      })
    }
    
    // Calculate metrics
    const totalPredictions = predictions.length
    const averageAccuracy = predictions.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / totalPredictions
    const averagePriceError = predictions.reduce((sum, p) => sum + (p.price_error_percent || 0), 0) / totalPredictions
    const averageOccupancyError = predictions.reduce((sum, p) => sum + (p.occupancy_error_percent || 0), 0) / totalPredictions
    const averageRevenueError = predictions.reduce((sum, p) => sum + (p.revenue_error_percent || 0), 0) / totalPredictions
    
    // Categorize predictions
    const veryAccurate = predictions.filter(p => (p.accuracy_score || 0) > 90).length
    const accurate = predictions.filter(p => (p.accuracy_score || 0) > 75 && (p.accuracy_score || 0) <= 90).length
    const moderate = predictions.filter(p => (p.accuracy_score || 0) > 60 && (p.accuracy_score || 0) <= 75).length
    const poor = predictions.filter(p => (p.accuracy_score || 0) <= 60).length
    
    // Find best and worst
    const sortedByScore = [...predictions].sort((a, b) => (b.accuracy_score || 0) - (a.accuracy_score || 0))
    const bestPrediction = sortedByScore[0]
    const worstPrediction = sortedByScore[sortedByScore.length - 1]
    
    // Trend analysis (last 7 days vs previous 7 days)
    const last7Days = predictions.filter(p => {
      const date = new Date(p.prediction_date)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return date >= sevenDaysAgo
    })
    
    const previous7Days = predictions.filter(p => {
      const date = new Date(p.prediction_date)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      return date >= fourteenDaysAgo && date < sevenDaysAgo
    })
    
    const recentAccuracy = last7Days.length > 0
      ? last7Days.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / last7Days.length
      : averageAccuracy
    
    const previousAccuracy = previous7Days.length > 0
      ? previous7Days.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / previous7Days.length
      : averageAccuracy
    
    const accuracyTrend = recentAccuracy > previousAccuracy ? 'improving' : 
                         recentAccuracy < previousAccuracy ? 'declining' : 'stable'
    
    return NextResponse.json({
      hotelId,
      period,
      summary: {
        totalPredictions,
        predictionsWithActuals: totalPredictions,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        averagePriceError: Math.round(averagePriceError * 100) / 100,
        averageOccupancyError: Math.round(averageOccupancyError * 100) / 100,
        averageRevenueError: Math.round(averageRevenueError * 100) / 100
      },
      distribution: {
        veryAccurate,
        accurate,
        moderate,
        poor
      },
      bestPrediction: bestPrediction ? {
        date: bestPrediction.prediction_date,
        score: bestPrediction.accuracy_score,
        predictedPrice: bestPrediction.predicted_price,
        actualPrice: bestPrediction.actual_price
      } : null,
      worstPrediction: worstPrediction ? {
        date: worstPrediction.prediction_date,
        score: worstPrediction.accuracy_score,
        predictedPrice: worstPrediction.predicted_price,
        actualPrice: worstPrediction.actual_price
      } : null,
      trend: {
        direction: accuracyTrend,
        recentAccuracy: Math.round(recentAccuracy * 100) / 100,
        previousAccuracy: Math.round(previousAccuracy * 100) / 100,
        change: Math.round((recentAccuracy - previousAccuracy) * 100) / 100
      },
      recentPredictions: predictions.slice(0, 10).map(p => ({
        date: p.prediction_date,
        predictedPrice: p.predicted_price,
        actualPrice: p.actual_price,
        error: p.price_error_percent,
        score: p.accuracy_score
      }))
    })
    
  } catch (error) {
    console.error('[Feedback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
