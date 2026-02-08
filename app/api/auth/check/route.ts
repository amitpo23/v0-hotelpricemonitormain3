import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("supabase-auth-token")?.value

    if (!authToken || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ authenticated: false, isAdmin: false })
    }

    // Safely parse token with validation
    let tokenData: { user?: { id?: string } }
    try {
      tokenData = JSON.parse(authToken)
      // Validate token structure
      if (typeof tokenData !== 'object' || tokenData === null) {
        throw new Error('Invalid token structure')
      }
    } catch (parseError) {
      logger.warn('Invalid auth token format', { error: String(parseError) })
      return NextResponse.json({ authenticated: false, isAdmin: false })
    }

    const userId = tokenData.user?.id

    // Validate userId format (should be UUID)
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      logger.warn('Invalid user ID in token')
      return NextResponse.json({ authenticated: false, isAdmin: false })
    }

    // Check if user is admin
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_admin`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })

    const profiles = await profileRes.json()
    const isAdmin = profiles?.[0]?.is_admin === true

    return NextResponse.json({
      authenticated: true,
      isAdmin,
      userId,
    })
  } catch (error) {
    logger.error("Auth check error", error as Error)
    return NextResponse.json({ authenticated: false, isAdmin: false })
  }
}
