import { NextResponse, type NextRequest } from "next/server"

const SUPABASE_URL = process.env.SUPABASE_URL || "https://dqhmraeyisoigxzsitiz.supabase.co"
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ""

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request })

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth/login", "/auth/signup", "/auth/callback", "/auth/pending", "/api/auth"]
  const isPublicRoute = publicRoutes.some((route) =>
    route === "/" ? request.nextUrl.pathname === "/" : request.nextUrl.pathname.startsWith(route),
  )

  // For now, allow all routes - auth will be checked client-side
  // This fixes the login redirect loop issue
  if (isPublicRoute) {
    return supabaseResponse
  }

  const hasAuthCookie = request.cookies.has("sb-auth-token")

  if (!hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
