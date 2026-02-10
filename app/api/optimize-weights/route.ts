/**
 * Weight Optimization API
 * Runs regression analysis to optimize prediction factor weights
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { optimizeWeightsForHotel, applyOptimizedWeights } from "@/lib/ml/weight-optimizer"
import { clearWeightCache } from "@/lib/prediction-algorithms"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for optimization

/**
 * POST - Run weight optimization for hotel(s)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (only admins or cron)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized request to /api/optimize-weights')
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
    
    const supabase = await createClient()
    const body = await request.json().catch(() => ({}))
    
    const hotelId = body.hotelId
    const minSamples = body.minSamples || 30
    const dryRun = body.dryRun || false
    
    logger.info(`[Weight Optimizer] Starting optimization (hotelId: ${hotelId || 'all'}, minSamples: ${minSamples}, dryRun: ${dryRun})`)
    
    // Get hotels to optimize
    let hotelsToOptimize: Array<{ id: string; name: string }> = []
    
    if (hotelId) {
      const { data: hotel } = await supabase
        .from('hotels')
        .select('id, name')
        .eq('id', hotelId)
        .single()
      
      if (hotel) hotelsToOptimize = [hotel]
    } else {
      // Optimize all hotels
      const { data: hotels } = await supabase
        .from('hotels')
        .select('id, name')
      
      hotelsToOptimize = hotels || []
    }
    
    if (hotelsToOptimize.length === 0) {
      return NextResponse.json({ error: 'No hotels found' }, { status: 404 })
    }
    
    const results = {
      totalHotels: hotelsToOptimize.length,
      optimized: 0,
      failed: 0,
      totalWeightsUpdated: 0,
      hotelResults: [] as any[]
    }
    
    // Optimize each hotel
    for (const hotel of hotelsToOptimize) {
      logger.info(`[Weight Optimizer] Processing hotel: ${hotel.name}`)
      
      try {
        // Run optimization
        const optimizedWeights = await optimizeWeightsForHotel(
          supabase,
          hotel.id,
          minSamples
        )
        
        if (optimizedWeights.length === 0) {
          results.hotelResults.push({
            hotelId: hotel.id,
            hotelName: hotel.name,
            status: 'skipped',
            reason: 'Insufficient data or no improvements found',
            weightsUpdated: 0
          })
          continue
        }
        
        // Apply weights if not dry run
        let applyResults = { success: 0, failed: 0 }
        
        if (!dryRun) {
          applyResults = await applyOptimizedWeights(
            supabase,
            hotel.id,
            optimizedWeights
          )
          
          results.totalWeightsUpdated += applyResults.success
        }
        
        results.optimized++
        results.hotelResults.push({
          hotelId: hotel.id,
          hotelName: hotel.name,
          status: 'success',
          weightsOptimized: optimizedWeights.length,
          weightsUpdated: dryRun ? 0 : applyResults.success,
          weightsFailed: dryRun ? 0 : applyResults.failed,
          improvements: optimizedWeights.map(w => ({
            factor: w.factor_name,
            oldWeight: w.old_weight,
            newWeight: w.new_weight,
            confidence: w.confidence,
            expectedImprovement: `${w.improvement_percent.toFixed(1)}%`,
            samples: w.samples_used
          }))
        })
        
      } catch (error) {
        logger.error(`[Weight Optimizer] Error for hotel ${hotel.name}:`, error instanceof Error ? error : new Error(String(error)))
        results.failed++
        results.hotelResults.push({
          hotelId: hotel.id,
          hotelName: hotel.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Clear weight cache so new weights are used immediately
    if (!dryRun && results.totalWeightsUpdated > 0) {
      clearWeightCache()
      logger.info(`[Weight Optimizer] Cleared weight cache after updating ${results.totalWeightsUpdated} weights`)
    }
    
    logger.info(`[Weight Optimizer] Completed: ${results.optimized} optimized, ${results.failed} failed, ${results.totalWeightsUpdated} weights updated`)
    
    return NextResponse.json({
      success: true,
      message: dryRun 
        ? `Dry run: Found ${results.totalWeightsUpdated} weight improvements (not applied)`
        : `Optimized ${results.optimized} hotels, updated ${results.totalWeightsUpdated} weights`,
      ...results
    })
    
  } catch (error) {
    logger.error('[Weight Optimizer] Error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * GET - View current weights and optimization history
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const hotelId = searchParams.get('hotelId')
    const includeHistory = searchParams.get('includeHistory') === 'true'
    
    if (!hotelId) {
      return NextResponse.json({ error: 'hotelId required' }, { status: 400 })
    }
    
    // Get current weights
    const { data: weights, error: weightsError } = await supabase
      .from('factor_weights')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('is_active', true)
      .order('factor_name')
    
    if (weightsError) {
      return NextResponse.json({ error: weightsError.message }, { status: 500 })
    }
    
    // Calculate statistics
    const stats = {
      totalFactors: weights?.length || 0,
      optimizedFactors: weights?.filter(w => w.last_optimized_at).length || 0,
      avgConfidence: 0,
      avgImprovement: 0,
      lastOptimized: null as string | null
    }
    
    if (weights && weights.length > 0) {
      stats.avgConfidence = weights.reduce((sum, w) => sum + (w.confidence || 0), 0) / weights.length
      stats.avgImprovement = weights.reduce((sum, w) => sum + (w.improvement_percent || 0), 0) / weights.length
      
      const optimizedWeights = weights.filter(w => w.last_optimized_at)
      if (optimizedWeights.length > 0) {
        stats.lastOptimized = optimizedWeights
          .sort((a, b) => new Date(b.last_optimized_at).getTime() - new Date(a.last_optimized_at).getTime())[0]
          .last_optimized_at
      }
    }
    
    const response: any = {
      success: true,
      weights: weights || [],
      stats
    }
    
    // Include history if requested
    if (includeHistory) {
      const { data: history } = await supabase
        .from('factor_weight_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(100)
      
      response.history = history || []
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    logger.error('[Weight Optimizer GET] Error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Revert to default weights (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const hotelId = searchParams.get('hotelId')
    const factorName = searchParams.get('factorName')
    
    if (!hotelId) {
      return NextResponse.json({ error: 'hotelId required' }, { status: 400 })
    }
    
    // Deactivate optimized weights
    let query = supabase
      .from('factor_weights')
      .update({ is_active: false })
      .eq('hotel_id', hotelId)
      .neq('optimization_method', 'default')
    
    if (factorName) {
      query = query.eq('factor_name', factorName)
    }
    
    const { error } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Clear cache
    clearWeightCache()
    
    return NextResponse.json({
      success: true,
      message: factorName 
        ? `Reverted ${factorName} to default for hotel ${hotelId}`
        : `Reverted all factors to defaults for hotel ${hotelId}`
    })
    
  } catch (error) {
    logger.error('[Weight Optimizer DELETE] Error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
