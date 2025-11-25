"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function AnalyzeTrendsButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const analyzeTrends = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/trends/analyze", { method: "POST" })
      const data = await res.json()
      alert(`Analysis complete: ${data.trendsDetected} trends detected`)
      router.refresh()
    } catch (error) {
      alert("Failed to analyze trends")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={analyzeTrends} disabled={loading} className="gap-2">
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Analyzing..." : "Analyze Trends"}
    </Button>
  )
}
