"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Loader2Icon, RadarIcon, CheckCircleIcon, BuildingIcon, BedDoubleIcon } from "@/components/icons"

interface RunScraperButtonProps {
  hotelId: string
  hotelName: string
  roomTypeId?: string
}

export function RunScraperButton({ hotelId, hotelName, roomTypeId }: RunScraperButtonProps) {
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
        body: JSON.stringify({
          hotelId,
          roomTypeId,
          autoDetectRoomTypes: true, // Enable auto-detection
        }),
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
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Scanning all room types...
            </>
          ) : (
            <>
              <RadarIcon className="mr-2 h-4 w-4" />
              Run Full Scan (180 Days)
            </>
          )}
        </Button>

        {result && !result.error && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircleIcon className="h-4 w-4" />
            <span>
              Scanned! {result.summary?.increaseRecommendations} increases, {result.summary?.decreaseRecommendations}{" "}
              decreases
            </span>
          </div>
        )}

        {result?.error && <span className="text-sm text-red-400">{result.error}</span>}
      </div>

      {result && !result.error && result.roomTypes && result.roomTypes.length > 0 && (
        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
          <div className="flex items-center gap-2 mb-2">
            <BedDoubleIcon className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">{result.roomTypesScanned} Room Types Detected</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.roomTypes.map((rt: any) => (
              <Badge
                key={rt.id || rt.name}
                variant="secondary"
                className="bg-background/50 text-foreground border"
                style={{
                  borderLeftColor: rt.color || "#06b6d4",
                  borderLeftWidth: "3px",
                }}
              >
                {rt.name}
              </Badge>
            ))}
          </div>
          {/* Show price averages */}
          {result.roomTypeAverages && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {result.roomTypeAverages.map((avg: any) => (
                <div key={avg.roomTypeId || avg.roomType} className="text-xs text-muted-foreground">
                  <span className="font-medium">{avg.roomType}:</span> ${avg.avgOurPrice} avg
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result && !result.error && result.competitors && (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <BuildingIcon className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Tracking {result.competitorCount} Competitors</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.competitors.map((comp: any) => (
              <Badge
                key={comp.name}
                variant="secondary"
                className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                style={{
                  borderLeftColor: comp.color || "#06b6d4",
                  borderLeftWidth: "3px",
                }}
              >
                {comp.name} {comp.stars && `${"★".repeat(comp.stars)}`}
                {comp.roomTypes?.length > 0 && ` (${comp.roomTypes.length} rooms)`}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
