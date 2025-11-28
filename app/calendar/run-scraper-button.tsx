"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Loader2Icon, RadarIcon, CheckCircleIcon, BedDoubleIcon } from "@/components/icons"

const DATA_SOURCES = [
  { name: "Booking.com", color: "#003580" },
  { name: "Expedia", color: "#FFCC00" },
]

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
          autoDetectRoomTypes: true,
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
              Scanning...
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

      {result && !result.error && (
        <div className="flex flex-wrap gap-4">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-xs text-muted-foreground mb-2">Data Sources</div>
            <div className="flex gap-2">
              {DATA_SOURCES.map((source) => (
                <Badge
                  key={source.name}
                  className={source.name === "Booking.com" ? "bg-[#003580] text-white" : "bg-[#FFCC00] text-black"}
                >
                  {source.name === "Booking.com" ? "Booking" : "Expedia"}
                </Badge>
              ))}
            </div>
          </div>

          {/* Room types detected */}
          {result.roomTypes && result.roomTypes.length > 0 && (
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <div className="flex items-center gap-2 mb-2">
                <BedDoubleIcon className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-muted-foreground">{result.roomTypesScanned} Room Types</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.roomTypes.map((rt: any) => (
                  <Badge
                    key={rt.id || rt.name}
                    variant="secondary"
                    className="bg-background/50 text-foreground border text-xs"
                    style={{ borderLeftColor: rt.color || "#06b6d4", borderLeftWidth: "3px" }}
                  >
                    {rt.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Competitors */}
          {result.competitors && result.competitors.length > 0 && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <div className="text-xs text-muted-foreground mb-2">{result.competitorCount} Competitors</div>
              <div className="flex flex-wrap gap-1.5">
                {result.competitors.map((comp: any) => (
                  <Badge
                    key={comp.name}
                    variant="secondary"
                    className="bg-background/50 text-foreground border text-xs"
                    style={{ borderLeftColor: comp.color || "#f97316", borderLeftWidth: "3px" }}
                  >
                    {comp.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
