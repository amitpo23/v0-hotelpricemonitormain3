/**
 * Health Check Endpoint
 *
 * Monitors system status including:
 * - Database connectivity
 * - External service availability
 * - Memory usage
 * - Uptime
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: ServiceStatus
    supabase: ServiceStatus
    memory: MemoryStatus
  }
}

interface ServiceStatus {
  status: 'up' | 'down' | 'unknown'
  latency?: number
  error?: string
}

interface MemoryStatus {
  status: 'ok' | 'warning' | 'critical'
  used: number
  total: number
  percentage: number
}

const startTime = Date.now()

async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now()

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return { status: 'down', error: 'Missing Supabase configuration' }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Simple query to test connectivity
    const { error } = await supabase.from('hotels').select('id').limit(1)

    const latency = Date.now() - start

    if (error) {
      return { status: 'down', latency, error: error.message }
    }

    return { status: 'up', latency }
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function checkMemory(): MemoryStatus {
  // In Node.js/Vercel, we can use process.memoryUsage()
  const memory = process.memoryUsage()
  const used = memory.heapUsed
  const total = memory.heapTotal
  const percentage = Math.round((used / total) * 100)

  let status: 'ok' | 'warning' | 'critical' = 'ok'
  if (percentage > 90) {
    status = 'critical'
  } else if (percentage > 75) {
    status = 'warning'
  }

  return {
    status,
    used: Math.round(used / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage,
  }
}

export async function GET() {
  const [supabaseStatus] = await Promise.all([
    checkSupabase(),
  ])

  const memoryStatus = checkMemory()

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  if (supabaseStatus.status === 'down') {
    overallStatus = 'unhealthy'
  } else if (memoryStatus.status === 'critical') {
    overallStatus = 'unhealthy'
  } else if (memoryStatus.status === 'warning') {
    overallStatus = 'degraded'
  }

  const health: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.round((Date.now() - startTime) / 1000), // seconds
    checks: {
      database: supabaseStatus,
      supabase: supabaseStatus,
      memory: memoryStatus,
    },
  }

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

  return NextResponse.json(health, { status: httpStatus })
}

// Support HEAD requests for simple up/down checks
export async function HEAD() {
  const supabaseStatus = await checkSupabase()

  if (supabaseStatus.status === 'up') {
    return new NextResponse(null, { status: 200 })
  }

  return new NextResponse(null, { status: 503 })
}
