"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCwIcon } from "@/components/icons"

interface GenerateCalendarButtonProps {
  hotels: any[]
}

export function GenerateCalendarButton({ hotels }: GenerateCalendarButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    if (hotels.length === 0) return
    setLoading(true)

    try {
      const response = await fetch("/api/calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelIds: hotels.map((h) => h.id) }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to generate calendar:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={loading || hotels.length === 0}
      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
    >
      <RefreshCwIcon className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Generating..." : "Generate Calendar Data"}
    </Button>
  )
}
