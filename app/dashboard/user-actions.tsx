"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircleIcon, XCircleIcon, Loader2Icon } from "@/components/icons"
import { useRouter } from "next/navigation"

interface UserActionsProps {
  userId: string
  userEmail: string
}

export function UserActions({ userId, userEmail }: UserActionsProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const router = useRouter()

  const handleApprove = async () => {
    if (!confirm(`לאשר את המשתמש ${userEmail}?`)) return

    setLoading("approve")
    try {
      const res = await fetch("/api/admin/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) throw new Error("Failed to approve user")

      router.refresh()
    } catch (error) {
      console.error("Error approving user:", error)
      alert("שגיאה באישור המשתמש")
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    if (!confirm(`להסיר את המשתמש ${userEmail}? פעולה זו אינה הפיכה.`)) return

    setLoading("reject")
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) throw new Error("Failed to delete user")

      router.refresh()
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("שגיאה בהסרת המשתמש")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 hover:bg-green-500/20 text-green-400 hover:text-green-300"
        onClick={handleApprove}
        disabled={loading !== null}
        title="אשר משתמש"
      >
        {loading === "approve" ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircleIcon className="h-4 w-4" />
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 hover:bg-red-500/20 text-red-400 hover:text-red-300"
        onClick={handleReject}
        disabled={loading !== null}
        title="הסר משתמש"
      >
        {loading === "reject" ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <XCircleIcon className="h-4 w-4" />}
      </Button>
    </div>
  )
}
