"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Radar, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

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
  )
}
