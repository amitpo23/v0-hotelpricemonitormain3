import { NextResponse } from 'next/server'
import { requireUser } from './require-user'

/**
 * Auth for routes that are legitimately called BOTH by cron/internal jobs
 * (Authorization: Bearer CRON_SECRET) AND by logged-in users from the UI
 * (session cookie). Passes if either credential is valid.
 */
export async function requireUserOrCron(request: Request): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) {
    return null
  }
  const { errorResponse } = await requireUser()
  return errorResponse
}

/**
 * Server-side fetch() between our own API routes drops the caller's
 * credentials. Spread these headers into internal same-origin fetches so
 * auth survives the hop (cookie for user sessions, bearer for cron).
 */
export function forwardAuthHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {}
  const authorization = request.headers.get('authorization')
  const cookie = request.headers.get('cookie')
  if (authorization) headers.authorization = authorization
  if (cookie) headers.cookie = cookie
  return headers
}
