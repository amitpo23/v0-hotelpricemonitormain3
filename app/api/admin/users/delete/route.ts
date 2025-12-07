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
