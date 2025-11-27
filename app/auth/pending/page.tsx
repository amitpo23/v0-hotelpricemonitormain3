"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PendingPage() {
  const [email, setEmail] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || "")

        // Check if approved
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_approved, is_admin")
          .eq("id", user.id)
          .single()

        if (profile?.is_approved || profile?.is_admin) {
          router.push("/dashboard")
        }
      }
    }
    getUser()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl text-foreground">Pending Approval</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your account is awaiting administrator approval
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">Registered email:</p>
            <p className="text-foreground font-medium">{email}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            An administrator will review your request and grant access to the appropriate hotels. You will receive an
            email notification once approved.
          </p>

          <Button variant="outline" onClick={handleLogout} className="border-border bg-transparent">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
