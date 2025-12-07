import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check if current user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentProfile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    if (!currentProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Don't allow deleting yourself
    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
    }

    // Delete the profile first
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)

    if (profileError) {
      console.error("Error deleting profile:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Note: Deleting from auth.users requires admin API
    // The profile deletion is enough to block access

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in delete user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
