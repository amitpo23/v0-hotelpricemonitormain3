"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Loader2Icon, RadarIcon, CheckCircleIcon, BedDoubleIcon, ChevronDownIcon } from "@/components/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

const DATA_SOURCES = [
  { name: "Booking.com", color: "#003580" },
  { name: "Expedia", color: "#FFCC00" },
]

const SCAN_PERIODS = [
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "30 Days", days: 30 },
  { label: "60 Days", days: 60 },
  { label: "90 Days", days: 90 },
  { label: "180 Days", days: 180 },
]

interface RunScraperButtonProps {
  hotelId: string
  hotelName: string
  roomTypeId?: string
}

export function RunScraperButton({ hotelId, hotelName, roomTypeId }: RunScraperButtonProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDays, setSelectedDays] = useState(30)
  const router = useRouter()

  const runScraper = async (daysToScan: number) => {
    setIsRunning(true)
    setResult(null)
    setError(null)

    try {
      console.log("[v0] Starting scraper for hotel:", hotelId, "days:", daysToScan)

      const response = await fetch("/api/scraper/run-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          roomTypeId,
          autoDetectRoomTypes: true,
          daysToScan,
        }),
      })

      console.log("[v0] Scraper response status:", response.status)

      const data = await response.json()
      console.log("[v0] Scraper response data:", data)

      if (response.ok) {
        setResult(data)
        router.refresh()
      } else {
        const errorMsg = data.error || data.message || JSON.stringify(data)
        console.error("[v0] Scraper error:", errorMsg)
        setError(errorMsg)
        setResult({ error: errorMsg })
      }
    } catch (err: any) {
      console.error("[v0] Scraper fetch error:", err)
      const errorMsg = err.message || "Failed to run scraper"
      setError(errorMsg)
      setResult({ error: errorMsg })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex">
          <Button
            onClick={() => runScraper(selectedDays)}
            disabled={isRunning}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-r-none"
          >
            {isRunning ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RadarIcon className="mr-2 h-4 w-4" />
                Run Scan ({selectedDays} Days)
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isRunning}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-l-none border-l border-blue-400/30 px-2"
              >
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Scan Period</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SCAN_PERIODS.map((period) => (
                <DropdownMenuItem
                  key={period.days}
                  onClick={() => setSelectedDays(period.days)}
                  className={selectedDays === period.days ? "bg-accent" : ""}
                >
                  {period.label}
                  {selectedDays === period.days && <CheckCircleIcon className="ml-auto h-4 w-4 text-green-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {result && !result.error && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircleIcon className="h-4 w-4" />
            <span>
              Scanned! {result.stats?.increaseRecommendations ?? 0} increases,{" "}
              {result.stats?.decreaseRecommendations ?? 0} decreases
              {result.stats?.realScrapes !== undefined && (
                <span className="text-muted-foreground ml-2">({result.stats.realScrapes} real scrapes)</span>
              )}
            </span>
          </div>
        )}

        {error && (
          <span className="text-sm text-red-400 max-w-md truncate" title={error}>
            {error}
          </span>
        )}
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
