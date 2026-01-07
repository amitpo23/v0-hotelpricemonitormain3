import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { 
  predictWithEnsemble, 
  getHistoricalPricesForEnsemble,
  getAdaptiveWeights 
} from "@/lib/ml/ensemble-predictor"
import type { PredictionInput } from "@/lib/prediction-algorithms"

/**
 * Ensemble Prediction API
 * Combines Rule-Based + SMA + YoY models for improved accuracy
 * 
 * POST /api/predict/ensemble
 * Body: {
 *   hotelId: string
 *   date: string
 *   input: PredictionInput
 *   useAdaptiveWeights?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { hotelId, date, input, useAdaptiveWeights = true } = body

    if (!hotelId || !input) {
      return NextResponse.json(
        { error: "Missing required fields: hotelId, input" },
        { status: 400 }
      )
    }

    // Ensure date is in input
    const predictionInput: PredictionInput = {
      ...input,
      date: date || input.date || new Date().toISOString().split('T')[0]
    }

    // Get historical prices for SMA and YoY models
    const { recent, lastYear } = await getHistoricalPricesForEnsemble(
      supabase, 
      hotelId,
      30
    )

    // Get weights (adaptive or default)
    const weights = useAdaptiveWeights 
      ? await getAdaptiveWeights(supabase, hotelId)
      : { ruleBased: 0.60, sma: 0.20, yoy: 0.20 }

    // Run ensemble prediction
    const prediction = await predictWithEnsemble(
      predictionInput,
      supabase,
      hotelId,
      recent,
      lastYear,
      weights
    )

    return NextResponse.json({
      success: true,
      prediction,
      metadata: {
        hotelId,
        date: predictionInput.date,
        modelsUsed: prediction.ensemble.models.length,
        consensusLevel: prediction.ensemble.consensusLevel,
        weights,
        historicalDataPoints: {
          recent: recent.length,
          lastYear: lastYear.length
        }
      }
    })

  } catch (error) {
    console.error("[Ensemble Prediction] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate ensemble prediction" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/predict/ensemble?hotelId=xxx
 * Returns model performance comparison
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

    // Get current adaptive weights
    const weights = await getAdaptiveWeights(supabase, hotelId)

    // Get historical data availability
    const { recent, lastYear } = await getHistoricalPricesForEnsemble(
      supabase, 
      hotelId,
      30
    )

    // Get recent accuracy for context
    const { data: accuracyData } = await supabase
      .from('prediction_accuracy')
      .select('mape, mae, created_at')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(10)

    const avgMape = accuracyData && accuracyData.length > 0
      ? accuracyData.reduce((sum, d) => sum + (d.mape || 0), 0) / accuracyData.length
      : null

    // Model availability assessment
    const modelStatus = {
      ruleBased: {
        status: 'available',
        description: 'Primary prediction model with all factors',
        weight: weights.ruleBased
      },
      sma: {
        status: recent.length >= 7 ? 'available' : recent.length >= 3 ? 'limited' : 'unavailable',
        description: `Simple Moving Average (${recent.length} data points)`,
        weight: recent.length >= 3 ? weights.sma : 0,
        minDataPoints: 7,
        currentDataPoints: recent.length
      },
      yoy: {
        status: lastYear.length >= 7 ? 'available' : lastYear.length > 0 ? 'limited' : 'unavailable',
        description: `Year-over-Year comparison (${lastYear.length} data points)`,
        weight: lastYear.length > 0 ? weights.yoy : 0,
        minDataPoints: 7,
        currentDataPoints: lastYear.length
      }
    }

    // Calculate effective ensemble coverage
    const availableModels = [
      modelStatus.ruleBased.status === 'available',
      modelStatus.sma.status !== 'unavailable',
      modelStatus.yoy.status !== 'unavailable'
    ].filter(Boolean).length

    return NextResponse.json({
      hotelId,
      ensembleStatus: {
        modelsAvailable: availableModels,
        totalModels: 3,
        coverage: `${Math.round((availableModels / 3) * 100)}%`,
        recommendation: availableModels === 3 
          ? 'Full ensemble available - maximum accuracy'
          : availableModels === 2
            ? 'Partial ensemble - good accuracy'
            : 'Single model only - consider gathering more data'
      },
      models: modelStatus,
      currentWeights: weights,
      accuracy: {
        recentMape: avgMape ? `${avgMape.toFixed(1)}%` : 'No data',
        dataPoints: accuracyData?.length || 0
      },
      historicalData: {
        recentPrices: recent.length,
        lastYearPrices: lastYear.length
      }
    })

  } catch (error) {
    console.error("[Ensemble Status] Error:", error)
    return NextResponse.json(
      { error: "Failed to get ensemble status" },
      { status: 500 }
    )
  }
}
