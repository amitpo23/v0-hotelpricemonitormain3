import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { signupSchema, validateRequest, validationErrorResponse } from "@/lib/validations/schemas"
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
    const validation = validateRequest(signupSchema, body)
    if (!validation.success) {
      return NextResponse.json(validationErrorResponse(validation.errors), { status: 400 })
    }

    const { email, password, name: fullName } = validation.data

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create profile in profiles table
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        is_approved: false,
        is_admin: false,
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      message: "Account created! Please wait for admin approval.",
      user: data.user,
    })
  } catch (err) {
    logger.error("Signup error", err as Error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
