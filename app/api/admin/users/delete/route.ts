import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const cookieStore = await cookies()
    const authCookie = cookieStore.get("supabase-auth-token")

    let currentUser = null
    if (authCookie?.value) {
      try {
        const tokenData = JSON.parse(authCookie.value)
        if (Array.isArray(tokenData) && tokenData[0]) {
          const tokenParts = tokenData[0].split(".")
          if (tokenParts[1]) {
            const payload = JSON.parse(atob(tokenParts[1]))
            currentUser = {
              id: payload.sub,
              email: payload.email,
            }
          }
        }
      } catch (e) {
        console.log("[v0] Failed to parse supabase-auth-token cookie")
      }
    }

    if (!currentUser) {
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

    if (userId === currentUser.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
    }

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
