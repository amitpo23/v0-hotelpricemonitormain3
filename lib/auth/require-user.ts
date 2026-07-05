import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Server-side user validation helper
 * Follows the existing auth pattern used in app/api/auth/check/route.ts
 * Extracts user session from the supabase-auth-token cookie
 */
export async function requireUser(): Promise<
  { user: { id: string; email?: string }; errorResponse: null } |
  { user: null; errorResponse: NextResponse }
> {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('supabase-auth-token')?.value

    if (!authToken) {
      logger.warn('Missing auth token')
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
      }
    }

    // Safely parse token with validation
    let tokenData: { user?: { id?: string; email?: string } }
    try {
      tokenData = JSON.parse(authToken)
      // Validate token structure
      if (typeof tokenData !== 'object' || tokenData === null) {
        throw new Error('Invalid token structure')
      }
    } catch (parseError) {
      logger.warn('Invalid auth token format', { error: String(parseError) })
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
      }
    }

    const userId = tokenData.user?.id
    const email = tokenData.user?.email

    // Validate userId format (should be UUID)
    if (
      !userId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId
      )
    ) {
      logger.warn('Invalid user ID in token', { userId })
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
      }
    }

    return {
      user: { id: userId, email },
      errorResponse: null,
    }
  } catch (error) {
    logger.error('User validation error', error as Error)
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }
}
