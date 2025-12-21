import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  // Skip Supabase auth for sync-apify endpoint (it has its own auth)
  if (request.nextUrl.pathname.startsWith('/api/sync-apify')) {
    return NextResponse.next()
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
