import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("supabase-auth-token")?.value

    if (!authToken || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ authenticated: false, isAdmin: false })
    }

    // Parse token to get user id
    const tokenData = JSON.parse(authToken)
    const userId = tokenData.user?.id

    if (!userId) {
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
    console.error("Auth check error:", error)
    return NextResponse.json({ authenticated: false, isAdmin: false })
  }
}
