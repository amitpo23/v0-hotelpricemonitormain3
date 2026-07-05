import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/**
 * Server-side user validation.
 *
 * Validates the Supabase access token (JWT) that /api/auth/login stores in
 * the `sb-auth-token` cookie by verifying it against Supabase Auth
 * (`auth.getUser(jwt)`). A forged or expired token is rejected server-side —
 * do NOT replace this with cookie parsing: the cookie contents alone are
 * attacker-controlled.
 */
export async function requireUser(): Promise<
  { user: { id: string; email?: string }; errorResponse: null } |
  { user: null; errorResponse: NextResponse }
> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-auth-token')?.value

    if (!accessToken) {
      return { user: null, errorResponse: unauthorized() }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const { data, error } = await supabase.auth.getUser(accessToken)

    if (error || !data.user) {
      logger.warn('Rejected invalid or expired access token')
      return { user: null, errorResponse: unauthorized() }
    }

    return {
      user: { id: data.user.id, email: data.user.email ?? undefined },
      errorResponse: null,
    }
  } catch (error) {
    logger.error('User validation error', error as Error)
    return { user: null, errorResponse: unauthorized() }
  }
}
