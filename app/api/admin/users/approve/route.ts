import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const cookieStore = await cookies()
    const authToken = cookieStore.get("supabase-auth-token")

    let currentUser = null
    if (authToken?.value) {
      try {
        const tokenData = JSON.parse(authToken.value)
        currentUser = tokenData.user
      } catch (e) {
        console.log("[v0] Failed to parse auth token")
      }
    }

    if (!currentUser || !currentUser.id) {
      console.log("[v0] Approve user - No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Approve user - Current user:", currentUser.email)

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("is_admin, role")
      .eq("id", currentUser.id)
      .single()

    console.log("[v0] Approve user - Current profile:", currentProfile)

    const isAdmin = currentProfile?.is_admin === true || currentProfile?.role === "admin"

    if (!isAdmin) {
      console.log("[v0] Approve user - User is not admin")
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    console.log("[v0] Approve user - Approving userId:", userId)

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
