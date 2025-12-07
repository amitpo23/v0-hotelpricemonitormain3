import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const SUPABASE_URL = "https://dqhmraeyisoigxzsitiz.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const authSupabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const cookieStore = await cookies()
    const authToken = cookieStore.get("sb-auth-token")

    if (!authToken?.value) {
      console.log("[v0] Approve user - No auth token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user from access token
    const { data: { user: currentUser }, error: authError } = await authSupabase.auth.getUser(authToken.value)

    if (authError || !currentUser) {
      console.log("[v0] Approve user - Invalid auth token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("is_admin, role")
      .eq("id", currentUser.id)
      .single()

    const isAdmin = currentProfile?.is_admin === true || currentProfile?.role === "admin"

    if (!isAdmin) {
      console.log("[v0] Approve user - User is not admin")
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { userId } = await request.json()

    // Validate userId
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 })
    }

    console.log("[v0] Approve user - Approving userId:", userId.substring(0, 8) + "...")

    // Approve the user
    const { error } = await supabase
      .from("profiles")
      .update({
        is_approved: true,
        role: "user",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) {
      console.error("[v0] Error approving user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Approve user - Success!")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in approve user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
