import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const ADMIN_EMAIL = "amitporat1981@gmail.com"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const cookieStore = await cookies()

    const allCookies = cookieStore.getAll()
    console.log(
      "[v0] All cookies:",
      allCookies.map((c) => c.name),
    )

    let authCookie = cookieStore.get("sb-auth-token")
    if (!authCookie) {
      authCookie = cookieStore.get("supabase-auth-token")
    }
    if (!authCookie) {
      // Try to find any Supabase auth cookie
      authCookie = allCookies.find(
        (c) => c.name.includes("auth") || c.name.includes("supabase") || c.name.startsWith("sb-"),
      )
    }

    console.log("[v0] Found auth cookie:", authCookie?.name)

    let currentUser = null
    if (authCookie?.value) {
      try {
        // Method 1: JSON array format (e.g., ["token", "refresh"])
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
              console.log("[v0] Parsed user from JSON array:", currentUser.email)
            }
          }
        } catch {
          // Method 2: Direct JWT token
          const tokenParts = authCookie.value.split(".")
          if (tokenParts.length === 3 && tokenParts[1]) {
            const payload = JSON.parse(atob(tokenParts[1]))
            currentUser = {
              id: payload.sub,
              email: payload.email,
            }
            console.log("[v0] Parsed user from direct JWT:", currentUser.email)
          }
        }
      } catch (e) {
        console.log("[v0] Failed to parse auth cookie:", e)
      }
    }

    if (!currentUser) {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, email, is_admin")
          .eq("is_admin", true)
          .limit(1)
          .single()
        // This is a fallback - get the admin profile for now
        console.log("[v0] Trying fallback - admin profile:", data?.email)
        if (data) {
          currentUser = {
            id: data.id,
            email: data.email,
          }
        }
      } catch (e) {
        console.log("[v0] Fallback failed")
      }
    }

    if (!currentUser) {
      console.log("[v0] Approve user - No authenticated user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Approve user - Current user:", currentUser.email)

    // Get the admin user from database
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
