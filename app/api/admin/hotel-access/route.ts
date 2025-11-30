import { NextResponse } from "next/server"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ access: [] })
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/hotel_user_access?select=*,hotels(name)&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })

    const access = await res.json()
    return NextResponse.json({ access: access || [] })
  } catch (error) {
    console.error("Error fetching hotel access:", error)
    return NextResponse.json({ access: [] })
  }
}
