import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Create or update profile
      const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", data.user.id).single()

      if (!existingProfile) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || "",
          is_approved: false,
          is_admin: false,
        })
      }

      // Check if user is approved
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved, is_admin")
        .eq("id", data.user.id)
        .single()

      if (profile?.is_approved || profile?.is_admin) {
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        return NextResponse.redirect(`${origin}/auth/pending`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`)
}
