/**
 * Enhanced Predictions API Route
 * Uses all new features: Weather, Booking Velocity, YoY, Advanced ML
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { predictPriceEnhanced, predictPricesEnhancedBatch } from '@/lib/prediction-algorithms'
import { buildEnhancedPredictionContext, formatContextForPrompt } from '@/lib/rag/prediction-context'
import { featureEngineer } from '@/lib/features/feature-engineering'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/predictions/enhanced
 * Generate enhanced price predictions using all available data sources
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotelId, targetDate, targetDates, currentPrice, location = 'Tel Aviv' } = body

    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotelId is required' },
        { status: 400 }
      )
    }

    if (!targetDate && !targetDates) {
      return NextResponse.json(
        { error: 'Either targetDate or targetDates is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current price if not provided
    let price = currentPrice
    if (!price) {
      const { data: priceData } = await supabase
        .from('daily_prices')
        .select('price')
        .eq('hotel_id', hotelId)
        .order('date', { ascending: false })
        .limit(1)
        .single()
      
      price = priceData?.price || 500 // Default fallback
    }

    // Handle single date prediction
    if (targetDate) {
      const prediction = await predictPriceEnhanced(hotelId, targetDate, price, location)
      
      // Get enhanced context for debugging
      const context = await buildEnhancedPredictionContext(
        supabase,
        hotelId,
        new Date(targetDate),
        location
      )

      return NextResponse.json({
        success: true,
        prediction,
        context: {
          dataQuality: context.dataQuality,
          weatherForecast: context.weatherForecast,
          bookingMomentum: context.bookingMomentum,
          yoyComparison: context.yoyComparison,
        },
      })
    }

    // Handle batch prediction
    if (targetDates && Array.isArray(targetDates)) {
      const predictions = await predictPricesEnhancedBatch(
        hotelId,
        targetDates,
        price,
        location
      )

      return NextResponse.json({
        success: true,
        predictions,
        summary: {
          totalDates: predictions.length,
          averageConfidence: predictions.reduce((sum, p) => sum + p.confidenceScore, 0) / predictions.length,
          highDemandDates: predictions.filter(p => p.demandLevel === 'high' || p.demandLevel === 'very_high').length,
          recommendedIncreases: predictions.filter(p => p.recommendation === 'increase').length,
          recommendedDecreases: predictions.filter(p => p.recommendation === 'decrease').length,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Enhanced prediction error:', error)
    return NextResponse.json(
      { error: 'Failed to generate predictions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/predictions/enhanced/features?hotelId=xxx&date=2026-01-15
 * Get detailed feature breakdown for a specific prediction
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const date = searchParams.get('date')
    const location = searchParams.get('location') || 'Tel Aviv'

    if (!hotelId || !date) {
      return NextResponse.json(
        { error: 'hotelId and date are required' },
        { status: 400 }
      )
    }

    // Generate comprehensive features
    const features = await featureEngineer.generateFeatures(hotelId, date, location)

    // Get feature importance
    const featureImportance = featureEngineer.getFeatureImportance()

    // Get feature array (normalized for ML)
    const featureArray = featureEngineer.featuresToArray(features)

    return NextResponse.json({
      success: true,
      features,
      featureArray,
      featureImportance: Object.fromEntries(featureImportance),
      metadata: {
        totalFeatures: featureArray.length,
        dataQuality: features.dataQuality,
        confidenceLevel: features.confidenceLevel,
      },
    })
  } catch (error) {
    console.error('Feature extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract features', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
