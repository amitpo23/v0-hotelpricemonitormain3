import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { requireUser } from "@/lib/auth/require-user"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET() {
  try {
    const { user, errorResponse } = await requireUser()

    if (errorResponse || !user || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ authenticated: false, isAdmin: false })
    }

    // Check if user is admin
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_admin`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })

    const profiles = await profileRes.json()
    const isAdmin = profiles?.[0]?.is_admin === true

    return NextResponse.json({
      authenticated: true,
      isAdmin,
      userId: user.id,
    })
  } catch (error) {
    logger.error("Auth check error", error as Error)
    return NextResponse.json({ authenticated: false, isAdmin: false })
  }
}
