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
      console.log("[v0] Delete user - No auth token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user from access token
    const { data: { user: currentUser }, error: authError } = await authSupabase.auth.getUser(authToken.value)

    if (authError || !currentUser) {
      console.log("[v0] Delete user - Invalid auth token:", authError?.message)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("is_admin, role")
      .eq("id", currentUser.id)
      .single()

    const isAdmin = currentProfile?.is_admin === true || currentProfile?.role === "admin"

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Don't allow deleting yourself
    if (userId === currentUser.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
    }

    // Delete the profile
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)

    if (profileError) {
      console.error("[v0] Error deleting profile:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in delete user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
