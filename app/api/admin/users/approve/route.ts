import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createAuditLog, getClientIP, getUserAgent } from "@/lib/audit-log"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const ADMIN_EMAIL = "amitporat1981@gmail.com"

export async function POST(request: Request) {
  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[v0] Missing Supabase configuration")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabase = await createClient()
    const authSupabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const cookieStore = await cookies()
    const authToken = cookieStore.get("sb-auth-token")

    if (!authToken?.value) {
      console.log("[v0] Approve user - No auth token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user from access token
    const {
      data: { user: currentUser },
      error: authError,
    } = await authSupabase.auth.getUser(authToken.value)

    if (authError || !currentUser) {
      console.log("[v0] Approve user - Invalid auth token")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("id, email, is_admin")
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

    const { error } = await supabase
      .from("profiles")
      .update({
        is_approved: true,
        role: "user",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) {
      console.error("[v0] Error approving user in profiles:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Try to confirm email via RPC if available
    const { error: rpcError } = await supabase.rpc("confirm_user_email", { user_id: userId })
    if (rpcError) {
      console.log("[v0] RPC not available, email confirmation may need manual update")
    }

    // Create audit log
    await createAuditLog(supabase, {
      admin_user_id: currentUser.id,
      action_type: "user_approved",
      target_user_id: userId,
      details: { approved_at: new Date().toISOString() },
      ip_address: getClientIP(request.headers),
      user_agent: getUserAgent(request.headers),
    })

    console.log("[v0] Approve user - Success!")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in approve user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
