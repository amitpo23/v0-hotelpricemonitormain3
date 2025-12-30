/**
 * Cache Cleanup Cron Job
 * Runs daily to remove expired cache entries
 */

import { NextResponse } from 'next/server'
import { cleanExpiredCache } from '@/lib/cache/external-data-cache'

export const maxDuration = 60 // 1 minute max
export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/cache-cleanup
 * Remove expired cache entries
 */
export async function POST() {
  try {
    console.log('[CacheCleanup] Starting cleanup job...')
    
    const count = await cleanExpiredCache()
    
    console.log(`[CacheCleanup] Removed ${count} expired entries`)
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleanup completed',
      entriesRemoved: count,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[CacheCleanup] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cleanup failed' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/cache-cleanup
 * Status check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Cache cleanup cron is active',
    nextRun: 'Scheduled via cron'
  })
}
