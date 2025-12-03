"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SparklesIcon, Loader2Icon, ClockIcon } from "@/components/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Hotel {
  id: string
  name: string
  base_price: number | null
}

export function GeneratePredictionsButton({ hotels }: { hotels: Hotel[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [daysAhead, setDaysAhead] = useState("90")

  // Auto-refresh every hour
  useEffect(() => {
    if (!autoRefresh || hotels.length === 0) return

    const checkAndRefresh = () => {
      const lastGen = localStorage.getItem("predictions_last_generated")
      if (lastGen) {
        const lastDate = new Date(lastGen)
        setLastGenerated(lastDate)
        const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60)

        // Auto-generate if more than 1 hour since last generation
        if (hoursSince >= 1) {
          handleGenerate()
        }
      } else {
        // First time - generate predictions
        handleGenerate()
      }
    }

    // Check on mount
    checkAndRefresh()

    // Check every 5 minutes
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, hotels.length])

  const handleGenerate = async () => {
    if (loading || hotels.length === 0) return

    setLoading(true)
    try {
      const res = await fetch("/api/predictions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotels,
          daysAhead: Number.parseInt(daysAhead),
        }),
      })

      if (res.ok) {
        const now = new Date()
        setLastGenerated(now)
        localStorage.setItem("predictions_last_generated", now.toISOString())
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 1) return "עכשיו"
    if (minutes < 60) return `לפני ${minutes} דקות`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `לפני ${hours} שעות`
    return `לפני ${Math.floor(hours / 24)} ימים`
  }

  return (
    <div className="flex items-center gap-3">
      {/* Days ahead selector */}
      <Select value={daysAhead} onValueChange={setDaysAhead}>
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30">30 יום</SelectItem>
          <SelectItem value="60">60 יום</SelectItem>
          <SelectItem value="90">90 יום</SelectItem>
          <SelectItem value="180">180 יום</SelectItem>
        </SelectContent>
      </Select>

      {/* Auto-refresh indicator */}
      <Badge
        variant={autoRefresh ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => setAutoRefresh(!autoRefresh)}
      >
        <ClockIcon className="h-3 w-3 mr-1" />
        {autoRefresh ? "Auto 1h" : "Manual"}
      </Badge>

      {/* Last generated time */}
      {lastGenerated && <span className="text-xs text-muted-foreground">עדכון: {formatTimeAgo(lastGenerated)}</span>}

      {/* Generate button */}
      <Button onClick={handleGenerate} disabled={loading || hotels.length === 0} className="gap-2">
        {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
        Generate Predictions
      </Button>
    </div>
  )
}
