import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const SUPABASE_URL = "https://dqhmraeyisoigxzsitiz.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I"

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create profile in profiles table
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        is_approved: false,
        is_admin: false,
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      message: "Account created! Please wait for admin approval.",
      user: data.user,
    })
  } catch (err: any) {
    console.error("Signup error:", err)
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 })
  }
}
