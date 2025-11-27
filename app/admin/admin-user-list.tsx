"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckIcon, XIcon, ShieldIcon } from "@/components/icons"

interface User {
  id: string
  email: string
  full_name: string
  is_approved: boolean
  is_admin: boolean
  created_at: string
}

export function AdminUserList({ users }: { users: User[] }) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleApprove = async (userId: string) => {
    setLoading(userId)
    await supabase
      .from("profiles")
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq("id", userId)

    router.refresh()
    setLoading(null)
  }

  const handleRevoke = async (userId: string) => {
    setLoading(userId)
    await supabase.from("profiles").update({ is_approved: false }).eq("id", userId)

    router.refresh()
    setLoading(null)
  }

  const handleMakeAdmin = async (userId: string) => {
    setLoading(userId)
    await supabase.from("profiles").update({ is_admin: true, is_approved: true }).eq("id", userId)

    router.refresh()
    setLoading(null)
  }

  const handleRemoveAdmin = async (userId: string) => {
    setLoading(userId)
    await supabase.from("profiles").update({ is_admin: false }).eq("id", userId)

    router.refresh()
    setLoading(null)
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {users.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No users found</p>
      ) : (
        users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground truncate">{user.full_name || "No name"}</p>
                {user.is_admin && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Admin</Badge>
                )}
                {user.is_approved && !user.is_admin && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>
                )}
                {!user.is_approved && !user.is_admin && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>

            <div className="flex items-center gap-2 ml-2">
              {!user.is_approved && !user.is_admin && (
                <Button
                  size="sm"
                  onClick={() => handleApprove(user.id)}
                  disabled={loading === user.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckIcon className="w-4 h-4" />
                </Button>
              )}

              {user.is_approved && !user.is_admin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRevoke(user.id)}
                  disabled={loading === user.id}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              )}

              {!user.is_admin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMakeAdmin(user.id)}
                  disabled={loading === user.id}
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                >
                  <ShieldIcon className="w-4 h-4" />
                </Button>
              )}

              {user.is_admin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveAdmin(user.id)}
                  disabled={loading === user.id}
                  className="border-border"
                >
                  Remove Admin
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
