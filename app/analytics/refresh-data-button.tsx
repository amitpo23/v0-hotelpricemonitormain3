"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCwIcon, CheckIcon } from "@/components/icons"

export function RefreshDataButton() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/market/refresh", { method: "POST" })
      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          window.location.reload()
        }, 1500)
      }
    } catch (error) {
      console.error("Failed to refresh data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" className="gap-2 bg-transparent" onClick={handleRefresh} disabled={loading}>
      {success ? (
        <CheckIcon className="h-4 w-4 text-green-500" />
      ) : (
        <RefreshCwIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      )}
      {loading ? "Refreshing..." : success ? "Updated!" : "Refresh Data"}
    </Button>
  )
}
