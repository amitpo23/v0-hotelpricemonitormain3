import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// This endpoint sets up the first admin user
// Call this once with your admin email as a query parameter
// Example: /api/admin/setup?email=your@email.com&secret=your-secret-key

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")
  const secret = searchParams.get("secret")

  // Simple security - set your own secret in production
  if (secret !== "autopilot-admin-setup-2024") {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const supabase = await createClient()

  // Check if any admin exists
  const { data: existingAdmin } = await supabase.from("profiles").select("id").eq("is_admin", true).limit(1).single()

  if (existingAdmin) {
    return NextResponse.json(
      {
        error: "Admin already exists. Use the admin panel to add more admins.",
      },
      { status: 400 },
    )
  }

  // Set user as admin
  const { data, error } = await supabase
    .from("profiles")
    .update({
      is_admin: true,
      is_approved: true,
      approved_at: new Date().toISOString(),
    })
    .eq("email", email)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json(
      {
        error: "User not found. Make sure to sign up first.",
      },
      { status: 404 },
    )
  }

  return NextResponse.json({
    success: true,
    message: `${email} is now an admin`,
    user: data,
  })
}
