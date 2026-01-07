import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { 
  processFeedback, 
  getLearningStatus,
  calculateConfidenceDecay 
} from "@/lib/ml/feedback-loop"

/**
 * Real-Time Feedback API
 * Captures actual outcomes and triggers online learning
 * 
 * POST /api/learning/feedback - Submit new feedback
 * GET /api/learning/feedback?hotelId=xxx - Get learning status
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { 
      predictionId,
      hotelId, 
      date, 
      predictedPrice, 
      actualPrice,
      wasBooked = true,
      bookingDelay,
      occupancyAtBooking,
      competitorPriceAtBooking
    } = body

    // Validate required fields
    if (!hotelId || !date || !predictedPrice || !actualPrice) {
      return NextResponse.json(
        { error: "Missing required fields: hotelId, date, predictedPrice, actualPrice" },
        { status: 400 }
      )
    }

    // Process the feedback
    const result = await processFeedback(supabase, {
      predictionId: predictionId || `${hotelId}-${date}`,
      hotelId,
      date,
      predictedPrice,
      actualPrice,
      wasBooked,
      bookingDelay,
      occupancyAtBooking,
      competitorPriceAtBooking
    })

    return NextResponse.json({
      success: true,
      feedback: {
        hotelId,
        date,
        error: result.error,
        errorPercent: result.errorPercent.toFixed(2) + '%',
        direction: result.error > 0 ? 'under-predicted' : 'over-predicted'
      },
      learning: {
        biasCorrectionsAnalyzed: result.biasCorrections.length,
        weightsUpdated: result.weightsUpdated,
        corrections: result.biasCorrections.map(c => ({
          factor: c.factor,
          bias: c.currentBias.toFixed(1) + '%',
          confidence: (c.confidence * 100).toFixed(0) + '%',
          samples: c.sampleSize
        }))
      },
      message: result.weightsUpdated 
        ? "Feedback processed, weights updated automatically"
        : "Feedback recorded, no immediate weight changes needed"
    })

  } catch (error) {
    console.error("[Feedback API] Error:", error)
    return NextResponse.json(
      { error: "Failed to process feedback" },
      { status: 500 }
    )
  }
}

/**
 * GET learning status for a hotel
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')

    if (!hotelId) {
      return NextResponse.json(
        { error: "Missing hotelId parameter" },
        { status: 400 }
      )
    }

    const status = await getLearningStatus(supabase, hotelId)

    // Get recent predictions with confidence decay
    const { data: predictions } = await supabase
      .from('price_predictions')
      .select('id, date, predicted_price, confidence_score, created_at')
      .eq('hotel_id', hotelId)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(14)

    const predictionsWithDecay = (predictions || []).map(p => {
      const hoursSince = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60)
      return {
        date: p.date,
        predictedPrice: p.predicted_price,
        originalConfidence: p.confidence_score,
        currentConfidence: calculateConfidenceDecay(p.confidence_score, hoursSince),
        hoursSincePrediction: Math.round(hoursSince)
      }
    })

    return NextResponse.json({
      hotelId,
      learningStatus: {
        feedbacksReceived: status.feedbackCount,
        averageError: status.avgError.toFixed(1) + '%',
        biasDetected: status.biasDetected,
        lastFeedback: status.lastUpdate,
        activeBiases: status.corrections.filter(c => Math.abs(c.currentBias) > 5).map(c => ({
          factor: c.factor,
          bias: c.currentBias.toFixed(1) + '%',
          direction: c.currentBias > 0 ? 'under-predicting' : 'over-predicting',
          confidence: (c.confidence * 100).toFixed(0) + '%'
        }))
      },
      upcomingPredictions: predictionsWithDecay,
      recommendations: generateLearningRecommendations(status)
    })

  } catch (error) {
    console.error("[Feedback Status] Error:", error)
    return NextResponse.json(
      { error: "Failed to get learning status" },
      { status: 500 }
    )
  }
}

function generateLearningRecommendations(status: Awaited<ReturnType<typeof getLearningStatus>>): string[] {
  const recommendations: string[] = []

  if (status.feedbackCount < 10) {
    recommendations.push("Submit more feedback data to enable accurate bias detection (need 10+ samples)")
  }

  if (status.biasDetected) {
    recommendations.push("Systematic bias detected - weights will be auto-corrected on next feedback")
  }

  if (status.avgError > 15) {
    recommendations.push("High average error - consider reviewing data sources and agent health")
  } else if (status.avgError < 5) {
    recommendations.push("Excellent accuracy! Model is well-calibrated for this hotel")
  }

  const significantBiases = status.corrections.filter(c => Math.abs(c.currentBias) > 10)
  for (const bias of significantBiases) {
    if (bias.factor === 'weekend_multiplier') {
      recommendations.push(`Weekend pricing needs adjustment (${bias.currentBias > 0 ? 'under' : 'over'}-predicting by ${Math.abs(bias.currentBias).toFixed(0)}%)`)
    } else if (bias.factor === 'high_occupancy_multiplier') {
      recommendations.push(`High-demand pricing needs adjustment (${bias.currentBias > 0 ? 'under' : 'over'}-predicting by ${Math.abs(bias.currentBias).toFixed(0)}%)`)
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("System is learning normally - continue submitting feedback for optimal performance")
  }

  return recommendations
}
