"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCwIcon, CheckIcon, GlobeIcon } from "@/components/icons"

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
        <CheckIcon className="h-4 w-4" />
      ) : loading ? (
        <RefreshCwIcon className="h-4 w-4 animate-spin" />
      ) : (
        <GlobeIcon className="h-4 w-4" />
      )}
      {loading ? "Fetching Data..." : success ? "Data Updated!" : "Fetch Market Data"}
    </Button>
  )
}
