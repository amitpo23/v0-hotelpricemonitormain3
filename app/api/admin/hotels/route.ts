import { NextResponse } from "next/server"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ hotels: [] })
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/hotels?select=*&order=name`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })

    const hotels = await res.json()
    return NextResponse.json({ hotels: hotels || [] })
  } catch (error) {
    console.error("Error fetching hotels:", error)
    return NextResponse.json({ hotels: [] })
  }
}
