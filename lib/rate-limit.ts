/**
 * Rate Limiting Middleware
 *
 * Implements token bucket rate limiting for API endpoints.
 * Uses in-memory store (suitable for single-instance deployments)
 * For multi-instance, replace with Redis/Upstash.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

interface RateLimitConfig {
  // Maximum requests per window
  limit: number
  // Window size in seconds
  windowSizeSeconds: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// In production with multiple instances, use Redis/Upstash
const rateLimitStore = new Map<string, RateLimitEntry>()

// Default rate limit configurations per endpoint type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - strict limits
  auth: { limit: 10, windowSizeSeconds: 60 },

  // Prediction endpoints - moderate limits
  predictions: { limit: 100, windowSizeSeconds: 60 },

  // Scan/scraping endpoints - strict limits (expensive operations)
  scans: { limit: 10, windowSizeSeconds: 60 },

  // General API endpoints
  api: { limit: 200, windowSizeSeconds: 60 },

  // Webhook endpoints - high limits
  webhooks: { limit: 500, windowSizeSeconds: 60 },
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  // Use first forwarded IP, or fall back to other headers
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || cfConnectingIp || 'unknown'

  // Also include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return `${ip}:${userAgent.slice(0, 50)}`
}

/**
 * Clean up expired entries (run periodically)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000)

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: NextRequest,
  configKey: keyof typeof RATE_LIMITS = 'api'
): { allowed: boolean; remaining: number; resetIn: number } {
  const config = RATE_LIMITS[configKey]
  const clientId = getClientId(request)
  const key = `${configKey}:${clientId}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + (config.windowSizeSeconds * 1000),
    }
    rateLimitStore.set(key, entry)
  }

  // Increment count
  entry.count++

  const remaining = Math.max(0, config.limit - entry.count)
  const resetIn = Math.ceil((entry.resetTime - now) / 1000)

  if (entry.count > config.limit) {
    logger.warn('Rate limit exceeded', {
      clientId,
      configKey,
      count: entry.count,
      limit: config.limit,
    })
    return { allowed: false, remaining: 0, resetIn }
  }

  return { allowed: true, remaining, resetIn }
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  configKey: keyof typeof RATE_LIMITS = 'api'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { allowed, remaining, resetIn } = checkRateLimit(request, configKey)

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
          retryAfter: resetIn,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(resetIn),
            'X-RateLimit-Limit': String(RATE_LIMITS[configKey].limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + resetIn),
          },
        }
      )
    }

    const response = await handler(request)

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMITS[configKey].limit))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + resetIn))

    return response
  }
}

/**
 * Simple rate limit check for use in route handlers
 */
export function rateLimitCheck(
  request: NextRequest,
  configKey: keyof typeof RATE_LIMITS = 'api'
): NextResponse | null {
  const { allowed, remaining, resetIn } = checkRateLimit(request, configKey)

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        retryAfter: resetIn,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(resetIn),
          'X-RateLimit-Limit': String(RATE_LIMITS[configKey].limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  return null // Request is allowed
}

export default { checkRateLimit, withRateLimit, rateLimitCheck, RATE_LIMITS }
