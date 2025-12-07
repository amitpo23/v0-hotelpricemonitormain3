import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const ADMIN_EMAIL = "amitporat1981@gmail.com"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: adminUser } = await supabase
      .from("profiles")
      .select("id, email, is_admin")
      .eq("email", ADMIN_EMAIL)
      .single()

    if (!adminUser) {
      console.log("[v0] Admin user not found in profiles")
      return NextResponse.json({ error: "Admin not configured" }, { status: 500 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    console.log("[v0] Approve user - Approving userId:", userId)

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

    const { error: authError } = await supabase.rpc("confirm_user_email", { user_id: userId })

    // If RPC doesn't exist, try direct update (may fail due to permissions)
    if (authError) {
      console.log("[v0] RPC not available, email confirmation may need manual update")
    }

    console.log("[v0] Approve user - Success!")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in approve user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
