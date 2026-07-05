/**
 * Automatic Prediction Refresh System
 * 
 * This cron job:
 * 1. Regenerates predictions for next 90 days
 * 2. Uses latest booking data and competitor prices
 * 3. Applies learning from accuracy feedback
 * 4. Should run daily at 2 AM
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { requireCronAuth } from "@/lib/auth/cron-auth"
import { requireUserOrCron } from "@/lib/auth/dual-auth"

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

/**
 * Refresh predictions for all hotels
 * POST /api/learning/refresh-predictions
 */
export async function POST(request: NextRequest) {
  // Called by cron AND by the learning dashboard button — dual auth
  const denied = await requireUserOrCron(request)
  if (denied) return denied

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId') || undefined // Optional: refresh specific hotel
    const daysAhead = parseInt(searchParams.get('daysAhead') || '90')
    
    logger.info('[Prediction Refresh] Starting automatic refresh', { hotelId, daysAhead })
    
    // Get hotels to refresh
    let hotelQuery = supabase.from('hotels').select('*')
    if (hotelId) {
      hotelQuery = hotelQuery.eq('id', hotelId)
    }
    
    const { data: hotels, error: hotelError } = await hotelQuery
    
    if (hotelError || !hotels || hotels.length === 0) {
      return NextResponse.json({ error: 'No hotels found' }, { status: 404 })
    }
    
    logger.info(`[Prediction Refresh] Refreshing predictions for ${hotels.length} hotel(s)`)
    
    const results = {
      hotelsProcessed: 0,
      predictionsGenerated: 0,
      errors: [] as string[],
      duration: 0
    }
    
    const startTime = Date.now()
    
    // Process each hotel
    for (const hotel of hotels) {
      try {
        logger.info(`[Prediction Refresh] Processing hotel ${hotel.name} (${hotel.id})`)
        
        // Call the prediction generation API
        const generateUrl = new URL('/api/predictions/generate', 
          process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        )
        generateUrl.searchParams.set('hotelId', hotel.id)
        generateUrl.searchParams.set('daysAhead', daysAhead.toString())
        generateUrl.searchParams.set('refresh', 'true') // Flag for automatic refresh
        
        const response = await fetch(generateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          }
        })
        
        if (!response.ok) {
          const error = await response.text()
          results.errors.push(`Hotel ${hotel.name}: ${error}`)
          logger.error(`[Prediction Refresh] Failed for ${hotel.name}:`, new Error(error))
          continue
        }
        
        const data = await response.json()
        results.hotelsProcessed++
        results.predictionsGenerated += data.predictions?.length || 0
        
        logger.info(`[Prediction Refresh] ${hotel.name}: ${data.predictions?.length || 0} predictions`)
        
      } catch (error) {
        results.errors.push(`Hotel ${hotel.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        logger.error(`[Prediction Refresh] Error processing ${hotel.name}:`, error instanceof Error ? error : new Error(String(error)))
      }
    }
    
    results.duration = Date.now() - startTime
    
    // Log refresh event
    try {
      await supabase.from('prediction_generation_logs').insert({
        hotel_id: hotelId || null,
        session_id: `refresh-${Date.now()}`,
        status: results.errors.length === 0 ? 'completed' : 'partial',
        predictions_generated: results.predictionsGenerated,
        logs: {
          type: 'automatic_refresh',
          hotels_processed: results.hotelsProcessed,
          total_predictions: results.predictionsGenerated,
          errors: results.errors,
          duration_ms: results.duration
        },
        completed_at: new Date().toISOString()
      })
    } catch (err) {
      logger.error('[Prediction Refresh] Failed to log event:', err instanceof Error ? err : new Error(String(err)))
    }
    
    logger.info('[Prediction Refresh] Complete:', { results })
    
    return NextResponse.json({
      success: results.errors.length === 0,
      message: `Refreshed predictions for ${results.hotelsProcessed} hotel(s)`,
      ...results
    })
    
  } catch (error) {
    logger.error('[Prediction Refresh] Fatal error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * GET - Check when predictions were last refreshed
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    
    // Get last refresh time
    let query = supabase
      .from('prediction_generation_logs')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (hotelId) {
      query = query.eq('hotel_id', hotelId)
    }
    
    const { data: logs } = await query
    
    const lastRefresh = logs && logs.length > 0 ? logs[0] : null
    
    // Get next scheduled refresh (if using Vercel Cron - check cron config)
    const nextScheduled = getNextScheduledRefresh()
    
    return NextResponse.json({
      success: true,
      lastRefresh: lastRefresh ? {
        time: lastRefresh.created_at,
        predictionsGenerated: lastRefresh.predictions_generated,
        duration: lastRefresh.logs?.duration_ms ? `${(lastRefresh.logs.duration_ms / 1000).toFixed(1)}s` : 'unknown'
      } : null,
      nextScheduled,
      recentLogs: logs?.slice(0, 5).map(log => ({
        time: log.created_at,
        status: log.status,
        predictions: log.predictions_generated,
        errors: log.logs?.errors?.length || 0
      }))
    })
    
  } catch (error) {
    logger.error('[Prediction Refresh GET] Error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getNextScheduledRefresh(): string {
  // If using Vercel Cron at 2 AM daily
  const now = new Date()
  const next = new Date(now)
  next.setHours(2, 0, 0, 0)
  
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }
  
  return next.toISOString()
}
