"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Radar, CheckCircle, Users, Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface RunScraperButtonProps {
  hotelId: string
  hotelName: string
}

export function RunScraperButton({ hotelId, hotelName }: RunScraperButtonProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const router = useRouter()

  const runScraper = async () => {
    setIsRunning(true)
    setResult(null)

    try {
      const response = await fetch("/api/scraper/run-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        router.refresh()
      } else {
        setResult({ error: data.error })
      }
    } catch (error) {
      setResult({ error: "Failed to run scraper" })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Button
          onClick={runScraper}
          disabled={isRunning}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning 90 days...
            </>
          ) : (
            <>
              <Radar className="mr-2 h-4 w-4" />
              Run Full Scan (90 Days)
            </>
          )}
        </Button>

        {result && !result.error && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>
              Scanned! {result.summary?.increaseRecommendations} increases, {result.summary?.decreaseRecommendations}{" "}
              decreases
            </span>
          </div>
        )}

        {result?.error && <span className="text-sm text-red-400">{result.error}</span>}
      </div>

      {result && !result.error && result.competitors && (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            {result.competitorType === "real_hotels" ? (
              <>
                <Building2 className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-400">
                  Tracking {result.competitorCount} Competitor Hotels
                </span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">
                  Tracking {result.competitorCount} OTA Sources (No competitors defined)
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.competitors.map((name: string) => (
              <Badge
                key={name}
                variant="secondary"
                className={
                  result.competitorType === "real_hotels"
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                }
              >
                {name}
              </Badge>
            ))}
          </div>
          {result.competitorType === "ota_sources" && (
            <p className="text-xs text-muted-foreground mt-2">
              Add real competitor hotels in the Competitors page for more accurate pricing
            </p>
          )}
        </div>
      )}
    </div>
  )
}
