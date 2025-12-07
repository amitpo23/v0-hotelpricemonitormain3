import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dqhmraeyisoigxzsitiz.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I"

export async function GET() {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const authToken = cookieStore.get("sb-auth-token")

    if (!authToken?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is authenticated
    const authSupabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(authToken.value)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    if (!SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_admin,role`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })

    const profiles = await profileRes.json()
    const isAdmin = profiles?.[0]?.is_admin === true || profiles?.[0]?.role === "admin"

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    // Fetch all users
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    })

    const users = await res.json()
    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error("[v0] Error fetching users")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
