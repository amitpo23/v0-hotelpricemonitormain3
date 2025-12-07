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
      console.error("Error approving user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in approve user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
