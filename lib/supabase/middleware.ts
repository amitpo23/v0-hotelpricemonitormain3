import { NextResponse, type NextRequest } from "next/server"

const SUPABASE_URL = process.env.SUPABASE_URL || "https://dqhmraeyisoigxzsitiz.supabase.co"
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ""

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request })

  // Get auth token from cookies
  const authToken = request.cookies.get("supabase-auth-token")?.value

  let user = null
  if (authToken) {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${authToken}`,
        },
      })
      if (response.ok) {
        user = await response.json()
      }
    } catch {
      // Token invalid or expired
    }
  }

  const publicRoutes = ["/", "/auth/login", "/auth/signup", "/auth/callback", "/auth/pending", "/api/admin/setup"]
  const isPublicRoute = publicRoutes.some((route) =>
    route === "/" ? request.nextUrl.pathname === "/" : request.nextUrl.pathname.startsWith(route),
  )

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // If user is logged in but not approved, redirect to pending page
  if (user && !isPublicRoute && request.nextUrl.pathname !== "/auth/pending") {
    try {
      const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_approved,is_admin`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        },
      )
      const profiles = await profileResponse.json()
      const profile = profiles?.[0]

      if (profile && !profile.is_approved && !profile.is_admin) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/pending"
        return NextResponse.redirect(url)
      }
    } catch {
      // Continue without profile check
    }
  }

  return supabaseResponse
}
