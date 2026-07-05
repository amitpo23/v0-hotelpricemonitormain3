import { NextResponse, type NextRequest } from "next/server"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Routes reachable without a user session.
// Cron targets and webhooks authenticate per-route (requireCronAuth / signature),
// so they must pass through here and enforce their own auth inside the handler.
const PUBLIC_PAGE_EXACT = ["/"]
const PUBLIC_PREFIXES = [
  "/auth",
  "/api/auth",
  "/api/cron",
  "/api/webhooks",
  "/api/learning/accuracy",
  "/api/learning/refresh-predictions",
  "/api/optimize-weights",
]

/**
 * Validates the Supabase access token against the Auth server.
 * Cookie contents are attacker-controlled — presence of the cookie is NOT auth.
 */
async function isValidToken(token: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic =
    PUBLIC_PAGE_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (isPublic) {
    return NextResponse.next({ request })
  }

  const token = request.cookies.get("sb-auth-token")?.value
  const authenticated = token ? await isValidToken(token) : false

  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
