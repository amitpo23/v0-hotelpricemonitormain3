"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Check, Globe } from "lucide-react"

export function FetchMarketDataButton() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleFetch = async () => {
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
      console.error("Failed to fetch market data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleFetch} disabled={loading} className="gap-2">
      {success ? (
        <Check className="h-4 w-4" />
      ) : loading ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Globe className="h-4 w-4" />
      )}
      {loading ? "Fetching Data..." : success ? "Data Updated!" : "Fetch Market Data"}
    </Button>
  )
}
