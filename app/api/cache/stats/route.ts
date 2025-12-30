/**
 * Cache Statistics API
 * GET /api/cache/stats - Get cache statistics
 * POST /api/cache/stats - Clear cache
 */

import { NextResponse } from 'next/server'
import { getCacheStats, clearCache, cleanExpiredCache } from '@/lib/cache/external-data-cache'

/**
 * GET /api/cache/stats
 * Returns cache statistics
 */
export async function GET() {
  try {
    const stats = await getCacheStats()
    
    return NextResponse.json({
      success: true,
      stats,
      message: 'Cache statistics retrieved successfully'
    })
  } catch (error) {
    console.error('[CacheStats] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get cache stats' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cache/stats
 * Clear cache or clean expired entries
 * Body: { action: 'clear' | 'clean', source?: string, queryKey?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action = 'clean', source, queryKey } = body

    let result: any = {}

    if (action === 'clear') {
      await clearCache(source, queryKey)
      result = {
        action: 'cleared',
        source: source || 'all',
        queryKey: queryKey || 'all'
      }
    } else if (action === 'clean') {
      const count = await cleanExpiredCache()
      result = {
        action: 'cleaned',
        entriesRemoved: count
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "clear" or "clean"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      ...result,
      message: `Cache ${action} completed successfully`
    })
  } catch (error) {
    console.error('[CacheStats] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cache operation failed' 
      },
      { status: 500 }
    )
  }
}
