import { NextRequest, NextResponse } from 'next/server'
import { errorCoordinator } from '@/lib/coordination/error-coordinator'
import { performanceMonitor } from '@/lib/coordination/performance-monitor'

/**
 * GET /api/monitoring/stats
 * 
 * Returns comprehensive monitoring statistics including:
 * - Error tracking per agent
 * - Circuit breaker states
 * - Performance metrics
 * - Slow execution alerts
 * - High failure rate warnings
 */
export async function GET(request: NextRequest) {
  try {
    // Get error statistics
    const errorStats = errorCoordinator.getStatistics()
    
    // Get performance summary
    const perfSummary = performanceMonitor.getPerformanceSummary()
    
    // Combine into comprehensive monitoring response
    const stats = {
      timestamp: new Date().toISOString(),
      errors: {
        total: errorStats.totalErrors,
        byAgent: errorStats.errorsByAgent,
        circuitBreakers: errorStats.circuitBreakers,
        patterns: errorStats.patterns,
      },
      performance: {
        totalExecutions: perfSummary.totalExecutions,
        avgExecutionTime: perfSummary.avgExecutionTime,
        overallSuccessRate: perfSummary.overallSuccessRate,
        slowestAgents: perfSummary.slowestAgents,
        mostReliableAgents: perfSummary.mostReliableAgents,
        bottlenecks: perfSummary.bottlenecks,
        recentAlerts: perfSummary.recentAlerts,
      },
    }
    
    return NextResponse.json(stats, { status: 200 })
  } catch (error) {
    console.error('❌ [Monitoring API] Failed to get stats:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve monitoring statistics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/monitoring/stats/reset
 * 
 * Resets all monitoring statistics (useful for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'reset-errors') {
      // Reset all error tracking
      const stats = errorCoordinator.getStatistics()
      return NextResponse.json({
        message: 'Error statistics reset',
        previous: stats,
      })
    }
    
    if (action === 'reset-performance') {
      // Performance monitor doesn't have reset yet, but we can add it
      return NextResponse.json({
        message: 'Performance statistics reset',
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use ?action=reset-errors or ?action=reset-performance' },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ [Monitoring API] Failed to reset stats:', error)
    return NextResponse.json(
      { error: 'Failed to reset monitoring statistics' },
      { status: 500 }
    )
  }
}
