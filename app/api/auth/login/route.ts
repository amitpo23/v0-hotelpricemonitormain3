import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { loginSchema, validateRequest, validationErrorResponse } from "@/lib/validations/schemas"
import { rateLimitCheck } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateLimitResponse = rateLimitCheck(request, 'auth')
  if (rateLimitResponse) return rateLimitResponse

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      logger.error('Missing Supabase configuration')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const body = await request.json()

    // Validate input
    const validation = validateRequest(loginSchema, body)
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.errors), { status: 400 })
    }

    const { email, password } = validation.data

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (!data.session) {
      return NextResponse.json({ error: "No session returned" }, { status: 401 })
    }

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: data.user,
    })

    // Set auth cookie for middleware to detect
    response.cookies.set("sb-auth-token", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    response.cookies.set("sb-refresh-token", data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch (err) {
    logger.error("Login error", err as Error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
