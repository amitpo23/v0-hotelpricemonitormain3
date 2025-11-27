import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = ["/auth/login", "/auth/signup", "/auth/callback", "/auth/pending"]
  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // If user is logged in but not approved, redirect to pending page
  if (user && !isPublicRoute && request.nextUrl.pathname !== "/auth/pending") {
    const { data: profile } = await supabase.from("profiles").select("is_approved, is_admin").eq("id", user.id).single()

    if (profile && !profile.is_approved && !profile.is_admin) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/pending"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
