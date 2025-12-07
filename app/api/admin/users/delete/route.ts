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

    // Prevent deleting the admin
    if (userId === adminUser.id) {
      return NextResponse.json({ error: "Cannot delete admin user" }, { status: 400 })
    }

    console.log("[v0] Delete user - Deleting userId:", userId)

    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)

    if (profileError) {
      console.error("[v0] Error deleting profile:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    console.log("[v0] Delete user - Success!")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in delete user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
