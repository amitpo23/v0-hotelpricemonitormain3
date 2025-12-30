/**
 * Daily Predictions Cron Job
 * Runs predictions for the next 90 days in the background
 * Optimized to run day-by-day to avoid timeouts
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const maxDuration = 300 // 5 minutes max
export const dynamic = 'force-dynamic'

interface DailyPredictionJob {
  hotelId: string
  targetDate: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

/**
 * POST /api/cron/daily-predictions
 * Called by cron job to generate predictions for upcoming dates
 */
export async function POST(request: Request) {
  try {
    console.log('[DailyPredictions] Starting daily prediction job...')
    
    const supabase = await createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all active hotels
    const { data: hotels } = await supabase
      .from('hotels')
      .select('id, name')
      .eq('is_active', true)

    if (!hotels || hotels.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No active hotels found' 
      })
    }

    console.log(`[DailyPredictions] Found ${hotels.length} active hotels`)

    // Generate predictions for next 90 days, one day at a time
    const PREDICTION_DAYS = 90
    const BATCH_SIZE = 5 // Process 5 days at a time to avoid timeout
    
    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    }

    // Process in small batches
    for (let dayOffset = 0; dayOffset < PREDICTION_DAYS; dayOffset += BATCH_SIZE) {
      const batchDates: Date[] = []
      
      for (let i = 0; i < BATCH_SIZE && (dayOffset + i) < PREDICTION_DAYS; i++) {
        const targetDate = new Date(today)
        targetDate.setDate(targetDate.getDate() + dayOffset + i)
        batchDates.push(targetDate)
      }

      console.log(`[DailyPredictions] Processing batch: days ${dayOffset} to ${dayOffset + batchDates.length}`)

      // Call the main predictions API for this batch
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/predictions/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hotelIds: hotels.map((h: any) => h.id),
            daysAhead: BATCH_SIZE,
            selectedYear: batchDates[0].getFullYear(),
            selectedMonths: [batchDates[0].getMonth() + 1],
          }),
        })

        if (response.ok) {
          const result = await response.json()
          stats.success += result.count || 0
          console.log(`[DailyPredictions] Batch completed: ${result.count} predictions`)
        } else {
          stats.failed += batchDates.length * hotels.length
          console.error(`[DailyPredictions] Batch failed: ${response.statusText}`)
        }
      } catch (error) {
        stats.failed += batchDates.length * hotels.length
        console.error(`[DailyPredictions] Batch error:`, error)
      }

      stats.total += batchDates.length * hotels.length

      // Small delay between batches to avoid overloading
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log('[DailyPredictions] Job completed:', stats)

    return NextResponse.json({
      success: true,
      message: 'Daily predictions job completed',
      stats,
      hotels: hotels.length,
      days: PREDICTION_DAYS,
    })
  } catch (error) {
    console.error('[DailyPredictions] Job failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/daily-predictions
 * Status check endpoint
 */
export async function GET() {
  const supabase = await createClient()
  
  // Get latest predictions
  const { data: latestPredictions } = await supabase
    .from('price_predictions')
    .select('prediction_date, created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id')
    .eq('is_active', true)

  return NextResponse.json({
    status: 'ready',
    activeHotels: hotels?.length || 0,
    lastPrediction: latestPredictions?.[0]?.created_at || null,
    nextRun: 'Scheduled via cron',
  })
}
